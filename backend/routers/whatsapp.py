"""
FoodSafe WhatsApp Bot
Uses Twilio WhatsApp Sandbox (free for development)
Same Claude AI engine as the web app — no duplication

Setup:
1. Sign up at twilio.com (free trial)
2. WhatsApp Sandbox: twilio.com/console/messaging/whatsapp/sandbox
3. Set webhook URL: https://your-backend.onrender.com/api/whatsapp/webhook
4. Send "join <sandbox-keyword>" from your WhatsApp to activate
"""
from fastapi import APIRouter, Form, Response
from services.ai_service import scan_food_text, analyze_symptoms
from ml.risk_scorer import predict_seasonal_risk
import re

router = APIRouter()

# In-memory session store (use Redis in production)
sessions: dict[str, dict] = {}

def twiml_response(message: str) -> Response:
    """Wrap message in TwiML XML for WhatsApp."""
    xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Message>{message}</Message>
</Response>"""
    return Response(content=xml, media_type="application/xml")

def get_session(phone: str) -> dict:
    if phone not in sessions:
        sessions[phone] = {"lang": "en", "state": "idle", "recent_foods": []}
    return sessions[phone]

HELP_EN = """🌿 *FoodSafe Bot*

Commands:
• Send any food name to scan it
  e.g. "turmeric" or "हल्दी"
• *symptoms* - check if your symptoms relate to adulteration
• *brands* - safe brand recommendations
• *lang hi* - switch to Hindi
• *lang mr* - switch to Marathi
• *help* - show this menu"""

HELP_HI = """🌿 *फूडसेफ बॉट*

कमांड:
• कोई भी खाने का नाम भेजें
  उदा. "हल्दी" या "turmeric"
• *symptoms* - लक्षण जांचें
• *brands* - सुरक्षित ब्रांड
• *lang en* - अंग्रेजी में बदलें
• *help* - मेनू देखें"""

HELP_MR = """🌿 *फूडसेफ बॉट*

कमांड:
• कोणतेही अन्नाचे नाव पाठवा
  उदा. "हळद" किंवा "turmeric"
• *symptoms* - लक्षणे तपासा
• *brands* - सुरक्षित ब्रँड
• *lang en* - इंग्रजीत बदला
• *help* - मेनू पहा"""

def format_result(result: dict, lang: str) -> str:
    """Format scan result as WhatsApp message."""
    risk  = result.get("riskLevel", "UNKNOWN")
    score = result.get("safetyScore", 0)
    name  = result.get("foodName", "Food")

    risk_emoji = {"LOW": "✅", "MEDIUM": "⚠️", "HIGH": "🔴", "CRITICAL": "🚨"}.get(risk, "⚠️")

    lines = [
        f"{risk_emoji} *{name}*",
        f"Risk: *{risk}* | Score: *{score}/100*",
        "",
    ]

    if result.get("cookingWarning"):
        lines += [f"🔥 _{result['cookingWarning']}_", ""]

    if result.get("summary"):
        lines += [result["summary"], ""]

    adulterants = result.get("adulterants", [])[:3]
    if adulterants:
        lines.append("*Common adulterants:*")
        for a in adulterants:
            lines.append(f"• {a['name']} ({a.get('severity','?')})")
        lines.append("")

    tests = result.get("homeTests", [])[:2]
    if tests:
        lines.append("*Quick home test:*")
        lines.append(f"🧪 {tests[0]['name']}: {tests[0]['steps'][:120]}...")
        lines.append("")

    if result.get("verdict"):
        lines.append(f"💡 {result['verdict']}")

    seasonal = predict_seasonal_risk(name)
    if seasonal.get("seasonal_alert"):
        lines += ["", f"📅 *Seasonal Alert:* {seasonal['reason']}"]

    return "\n".join(lines)

@router.post("/webhook")
async def whatsapp_webhook(
    From: str = Form(...),
    Body: str = Form(...),
):
    phone   = From.replace("whatsapp:", "")
    message = Body.strip()
    session = get_session(phone)
    lang    = session["lang"]

    msg_lower = message.lower().strip()

    # Language switch
    if msg_lower.startswith("lang "):
        new_lang = msg_lower.split(" ")[1]
        if new_lang in ["en", "hi", "mr"]:
            session["lang"] = new_lang
            replies = {"en": "✅ Switched to English", "hi": "✅ हिंदी में बदल गया", "mr": "✅ मराठीत बदलले"}
            return twiml_response(replies[new_lang])

    # Help
    if msg_lower in ["help", "start", "menu", "hi", "hello", "हेलो", "नमस्ते"]:
        helps = {"en": HELP_EN, "hi": HELP_HI, "mr": HELP_MR}
        return twiml_response(helps.get(lang, HELP_EN))

    # Symptom check
    if msg_lower.startswith("symptom") or session["state"] == "symptoms":
        if session["state"] == "symptoms":
            session["state"] = "idle"
            result = analyze_symptoms(message, session.get("recent_foods", []))
            urgency = result.get("urgency", "MONITOR")
            emoji   = {"MONITOR": "👁", "CONSULT_DOCTOR": "👨‍⚕️", "EMERGENCY": "🚨"}.get(urgency, "⚠️")
            causes  = result.get("possibleCauses", [])
            reply   = f"{emoji} *{urgency.replace('_',' ')}*\n\n"
            if causes:
                reply += "*Possible causes:*\n"
                for c in causes[:2]:
                    reply += f"• {c['adulterant']} via {c['food']} ({c['confidence']})\n"
            reply += f"\n💡 {result.get('recommendation','Consult a doctor if symptoms persist.')}"
            reply += f"\n\n_{result.get('disclaimer','')}_"
            return twiml_response(reply)
        else:
            session["state"] = "symptoms"
            prompts = {"en": "Describe your symptoms:", "hi": "अपने लक्षण बताएं:", "mr": "तुमची लक्षणे सांगा:"}
            return twiml_response(prompts.get(lang, "Describe your symptoms:"))

    # Brands query
    if msg_lower.startswith("brand"):
        reply = ("🛒 *Safe Certified Brands:*\n\n"
                 "🌿 *Turmeric:* Everest (88/100), MDH (82/100)\n"
                 "🥛 *Milk:* Amul (91/100), Mother Dairy (89/100)\n"
                 "🍯 *Honey:* Dabur (78/100), Patanjali (74/100)\n"
                 "🫙 *Ghee:* Amul (88/100)\n"
                 "🌻 *Mustard Oil:* Fortune (85/100), Dhara (83/100)\n\n"
                 "_All brands are FSSAI certified ✓_")
        return twiml_response(reply)

    # Default: food scan
    if len(message) > 1:
        try:
            result = scan_food_text(message, None, lang)
            session["recent_foods"] = ([message] + session.get("recent_foods", []))[:5]
            return twiml_response(format_result(result, lang))
        except Exception as e:
            errors = {
                "en": "⚠️ Scan failed. Please try again or send 'help'.",
                "hi": "⚠️ स्कैन विफल। फिर से कोशिश करें या 'help' भेजें।",
                "mr": "⚠️ स्कॅन अयशस्वी. पुन्हा प्रयत्न करा किंवा 'help' पाठवा.",
            }
            return twiml_response(errors.get(lang, errors["en"]))

    return twiml_response("Send a food name to scan it. Type *help* for all commands.")
