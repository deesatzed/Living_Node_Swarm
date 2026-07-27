"""Server settings. LLM model is never hard-coded — user supplies via env/request."""

from __future__ import annotations

from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


def _repo_root() -> Path:
    # packages/lns_server/src/lns_server/settings.py → repo root
    return Path(__file__).resolve().parents[4]


def _env_files() -> tuple[str, ...]:
    """Prefer repo-root .env so cwd does not matter."""
    root = _repo_root()
    candidates = [
        root / ".env",
        Path.cwd() / ".env",
    ]
    return tuple(str(p) for p in candidates if p.is_file())


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=_env_files() or (".env",),
        env_file_encoding="utf-8",
        extra="ignore",
        # Accept OPENROUTER_API_KEY, MODEL_REASONING, etc.
        case_sensitive=False,
    )

    host: str = "127.0.0.1"
    port: int = 8787
    db_path: str = str(Path.home() / ".lns" / "lns.db")
    n_samples: int = 2000
    mc_seed: int = 42

    # OpenRouter
    openrouter_api_key: str | None = None
    openrouter_base_url: str = "https://openrouter.ai/api/v1"
    # Legacy / optional single default
    openrouter_model: str | None = None
    # User's preferred naming in .env (MODEL_REASONING / MODEL_FAST)
    model_reasoning: str | None = None
    model_fast: str | None = None

    openrouter_site_url: str | None = None
    openrouter_app_name: str = "Living Node Swarm"

    # Kalshi
    kalshi_env: str = "prod"  # demo | prod — project uses real ~$10 account when prod
    kalshi_api_key: str | None = None
    kalshi_api_key_id: str | None = None  # alias
    kalshi_private_key_path: str | None = None
    kalshi_base_url: str | None = None  # optional override
    kalshi_exit_move_pct: float = 0.20  # sell when YES mid moves 20% from entry

    @field_validator(
        "openrouter_api_key",
        "openrouter_model",
        "model_reasoning",
        "model_fast",
        "kalshi_api_key",
        "kalshi_api_key_id",
        "kalshi_private_key_path",
        "kalshi_env",
        mode="before",
    )
    @classmethod
    def strip_empty(cls, v: object) -> object:
        if isinstance(v, str):
            v = v.strip().strip('"').strip("'")
            return v or None
        return v

    def resolved_db_path(self) -> Path:
        p = Path(self.db_path)
        p.parent.mkdir(parents=True, exist_ok=True)
        return p

    def models_catalog(self) -> dict[str, str | None]:
        """Named slots from .env (values are OpenRouter model ids)."""
        return {
            "reasoning": self.model_reasoning,
            "fast": self.model_fast,
            "default": self.openrouter_model,
        }

    def default_model(self) -> str | None:
        """Prefer reasoning → OPENROUTER_MODEL → fast."""
        for m in (self.model_reasoning, self.openrouter_model, self.model_fast):
            if m:
                return m
        return None

    def listed_models(self) -> list[dict[str, str]]:
        out: list[dict[str, str]] = []
        seen: set[str] = set()
        for role, mid in self.models_catalog().items():
            if mid and mid not in seen:
                out.append({"role": role, "id": mid})
                seen.add(mid)
        return out

    def kalshi_key_id(self) -> str | None:
        return self.kalshi_api_key or self.kalshi_api_key_id
