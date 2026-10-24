from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    PROJECT_NAME: str = "JeevSarthi"
    TAGLINE: str = "Smarter Emergency Response. Every Second Matters."
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    DATABASE_URL: str = "sqlite:///./jeevsarthi.db"
    OSRM_URL: str = "https://router.project-osrm.org"
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ]
    STALE_LOCATION_THRESHOLD_MINUTES: int = 15
    DEFAULT_COVERAGE_ETA_MINUTES: int = 10

settings = Settings()
