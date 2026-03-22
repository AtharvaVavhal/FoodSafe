from pydantic_settings import BaseSettings
from typing import List
import json

class Settings(BaseSettings):
    APP_ENV: str = "development"
    GROQ_API_KEY: str = ""
    DATABASE_URL: str = "sqlite+aiosqlite:///./foodsafe.db"
    REDIS_URL: str = "redis://localhost:6379"
    SECRET_KEY: str = "dev-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080
    CORS_ORIGINS: List[str] = ["http://localhost:3000"]
    # Twilio WhatsApp
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN:  str = ""
    TWILIO_WHATSAPP_FROM: str = "whatsapp:+14155238886"
    # VAPID Push Notifications
    VAPID_PRIVATE_KEY: str = ""
    VAPID_PUBLIC_KEY:  str = ""
    VAPID_EMAIL:       str = "mailto:admin@foodsafe.app"

    class Config:
        env_file = ".env"

    def model_post_init(self, __context):
        if isinstance(self.CORS_ORIGINS, str):
            try:
                object.__setattr__(self, 'CORS_ORIGINS', json.loads(self.CORS_ORIGINS))
            except Exception:
                object.__setattr__(self, 'CORS_ORIGINS', [self.CORS_ORIGINS])

settings = Settings()