"""
FoodSafe WhatsApp Bot
Uses Twilio WhatsApp Sandbox (free for development)
Setup:
1. Sign up at twilio.com (free trial)
2. WhatsApp Sandbox: twilio.com/console/messaging/whatsapp/sandbox
3. Set webhook URL: https://your-backend.onrender.com/api/whatsapp/webhook
4. Send "join <sandbox-keyword>" from your WhatsApp to activate
"""
from fastapi import APIRouter, Form, Response
from services.ai_service import scan_food_text, analyze_symptoms
from services.indicbert_service import classify_intent, normalize_food_name

router = APIRouter()

sessions: dict[str, dict] = {}

def twiml_response(message: str) -> Response:
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
• *symptoms* - लक्षण जांचें
• *brands* - सुरक्षित ब्रांड
• *help* - मेनू देखें"""

HELP_MR = """🌿 *फूडसेफ बॉट*

कमांड:
• कोणतेही अन्नाचे नाव पाठवा
• *symptoms* - लक्षणे तपासा
• *brands* - सुरक्षित ब्रँड
• *help* - मेनू पहा"""

def format_result(result: dict, lang: str) -> str:
    risk  = result.get("riskLevel", "UNKNOWN")
    score = result.get("safetyScore", 0)
    name  = result.get("foodName", "Food")
    risk_emoji = {"LOW": "✅", "MEDIUM": "⚠️", "HIGH": "🔴", "CRITICAL": "🚨"}.get(risk, "⚠️")
    lines = [f"{risk_emoji} *{name}*", f"Risk: *{risk}* | Score: *{score}/100*", ""]
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
    tests = result.get("homeTests", [])[:1]
    if tests:
        lines.append("*Quick home test:*")
        lines.append(f"🧪 {tests[0]['name']}: {tests[0]['steps'][:120]}...")
        lines.append("")
    if result.get("verdict"):
        lines.append(f"💡 {result['verdict']}")
    return "\n".join(lines)

@router.post("/webhook")
async def whatsapp_webhook(From: str = Form(...), Body: str = Form(...)):
    phone     = From.replace("whatsapp:", "")
    message   = Body.strip()
    session   = get_session(phone)
    lang      = session["lang"]
    msg_lower = message.lower().strip()

    # ── Hard commands — always string-match these ──────────────────────────────
    if msg_lower.startswith("lang "):
        new_lang = msg_lower.split(" ")[1]
        if new_lang in ["en", "hi", "mr"]:
            session["lang"] = new_lang
            replies = {"en": "✅ Switched to English", "hi": "✅ हिंदी में बदल गया", "mr": "✅ मराठीत बदलले"}
            return twiml_response(replies[new_lang])

    if msg_lower in ["help", "start", "menu", "hi", "hello", "हेलो", "नमस्ते"]:
        return twiml_response({"en": HELP_EN, "hi": HELP_HI, "mr": HELP_MR}.get(lang, HELP_EN))

    # ── Multi-turn: if we're mid-symptom flow, continue it ────────────────────
    if session["state"] == "symptoms":
        session["state"] = "idle"
        result  = await analyze_symptoms(message, session.get("recent_foods", []))
        urgency = result.get("urgency", "MONITOR")
        emoji   = {"MONITOR": "👁", "CONSULT_DOCTOR": "👨‍⚕️", "EMERGENCY": "🚨"}.get(urgency, "⚠️")
        causes  = result.get("possibleCauses", [])
        reply   = f"{emoji} *{urgency.replace('_', ' ')}*\n\n"
        if causes:
            reply += "*Possible causes:*\n"
            for c in causes[:2]:
                reply += f"• {c['adulterant']} via {c['food']} ({c['confidence']})\n"
        reply += f"\n💡 {result.get('recommendation', 'Consult a doctor if symptoms persist.')}"
        reply += f"\n\n_{result.get('disclaimer', '')}_"
        return twiml_response(reply)

    if len(message) < 2:
        return twiml_response("Send a food name to scan it. Type *help* for all commands.")

    # ── IndicBERT intent classification ───────────────────────────────────────
    intent = classify_intent(message)

    # ── Route by intent ───────────────────────────────────────────────────────

    if intent == "symptom_report":
        session["state"] = "symptoms"
        prompts = {
            "en": "Describe your symptoms in detail:",
            "hi": "अपने लक्षण विस्तार से बताएं:",
            "mr": "तुमची लक्षणे तपशीलवार सांगा:",
        }
        return twiml_response(prompts.get(lang, prompts["en"]))

    if intent == "brand_query":
        reply = (
            "🛒 *Safe Certified Brands:*\n\n"
            "🌿 *Turmeric:* Everest (88/100), MDH (82/100)\n"
            "🥛 *Milk:* Amul (91/100), Mother Dairy (89/100)\n"
            "🍯 *Honey:* 24 Mantra Organic (88/100), Dabur (78/100)\n"
            "🧈 *Ghee:* Amul (88/100)\n"
            "🌶 *Chilli:* Everest (85/100)\n\n"
            "_All brands are FSSAI certified ✓_\n"
            "_Visit the app for full brand comparison_"
        )
        return twiml_response(reply)

    # intent == "food_scan" (or general — treat as scan by default)
    # Normalise food name: हल्दी → turmeric, तूप → ghee, etc.
    food_name = normalize_food_name(message)

    try:
        result = await scan_food_text(food_name, None, lang)
        session["recent_foods"] = ([food_name] + session.get("recent_foods", []))[:5]

        # Append seasonal risk if available
        try:
            from risk_scorer import predict_seasonal_risk
            seasonal = predict_seasonal_risk(food_name)
            if seasonal.get("seasonal_alert"):
                result["_seasonal_note"] = (
                    f"\n\n📅 *Seasonal alert — {seasonal['month']}:* "
                    f"{seasonal['reason']}"
                )
        except Exception:
            pass

        reply = format_result(result, lang)
        if result.get("_seasonal_note"):
            reply += result["_seasonal_note"]

        # Hint if food name was normalised from another language
        if food_name.lower() != message.lower():
            reply += f"\n\n_Detected: {message} → {food_name}_"

        return twiml_response(reply)

    except Exception:
        errors = {
            "en": "⚠️ Scan failed. Send 'help' for commands.",
            "hi": "⚠️ स्कैन विफल। 'help' भेजें।",
            "mr": "⚠️ स्कॅन अयशस्वी. 'help' पाठवा.",
        }
        return twiml_response(errors.get(lang, errors["en"]))