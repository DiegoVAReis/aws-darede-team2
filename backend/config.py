"""Configuracao lida do .env e do ambiente (BC-01)."""

from __future__ import annotations

import os
from collections.abc import Mapping
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv

BACKEND_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BACKEND_DIR.parent

REQUIRED_ENV_VARS = ("AWS_BEARER_TOKEN_BEDROCK",)


def _int(env: Mapping[str, str], name: str, default: int, *, minimum: int = 1) -> int:
    raw = env.get(name)
    if raw is None or raw.strip() == "":
        return default
    try:
        value = int(raw)
    except ValueError as exc:
        raise ValueError(f"A variavel {name} deve ser um numero inteiro.") from exc
    if value < minimum:
        raise ValueError(f"A variavel {name} deve ser maior ou igual a {minimum}.")
    return value


def _float(env: Mapping[str, str], name: str, default: float) -> float:
    raw = env.get(name)
    if raw is None or raw.strip() == "":
        return default
    try:
        value = float(raw)
    except ValueError as exc:
        raise ValueError(f"A variavel {name} deve ser um numero.") from exc
    if not 0.0 <= value <= 2.0:
        raise ValueError(f"A variavel {name} deve estar entre 0 e 2.")
    return value


def _path(env: Mapping[str, str], name: str, default: Path) -> Path:
    raw = env.get(name)
    if raw is None or raw.strip() == "":
        return default
    path = Path(raw)
    return path if path.is_absolute() else PROJECT_ROOT / path


@dataclass(frozen=True)
class Settings:
    """Valores de configuracao tipados. O token do Bedrock nunca fica aqui."""

    aws_region: str = "us-east-1"
    bedrock_model_id: str = "amazon.nova-pro-v1:0"
    bedrock_embed_model_id: str = "amazon.titan-embed-text-v2:0"
    kb_dir: Path = PROJECT_ROOT / "anyone_kb"
    chroma_dir: Path = BACKEND_DIR / "chroma_store"
    collection_name: str = "anyone"
    top_k: int = 3
    max_distance: float = 0.6
    chunk_size: int = 500
    chunk_overlap: int = 50
    session_window: int = 20
    max_sessions: int = 50
    max_text_chars: int = 2000
    bedrock_read_timeout: int = 60
    cors_origins: tuple[str, ...] = ("http://localhost:5173",)

    @classmethod
    def from_env(cls, env: Mapping[str, str] | None = None) -> Settings:
        """Monta a configuracao a partir de um mapeamento (padrao: os.environ)."""
        env = os.environ if env is None else env
        chunk_size = _int(env, "CHUNK_SIZE", 500)
        chunk_overlap = _int(env, "CHUNK_OVERLAP", 50, minimum=0)
        if chunk_overlap >= chunk_size:
            raise ValueError("CHUNK_OVERLAP deve ser menor que CHUNK_SIZE.")
        origins_raw = env.get("CORS_ORIGINS", "")
        origins = tuple(o.strip() for o in origins_raw.split(",") if o.strip())
        return cls(
            aws_region=env.get("AWS_REGION") or "us-east-1",
            bedrock_model_id=env.get("BEDROCK_MODEL_ID") or "amazon.nova-pro-v1:0",
            bedrock_embed_model_id=env.get("BEDROCK_EMBED_MODEL_ID")
            or "amazon.titan-embed-text-v2:0",
            kb_dir=_path(env, "KB_DIR", PROJECT_ROOT / "anyone_kb"),
            chroma_dir=_path(env, "CHROMA_DIR", BACKEND_DIR / "chroma_store"),
            collection_name=env.get("CHROMA_COLLECTION") or "anyone",
            top_k=_int(env, "RETRIEVAL_TOP_K", 3),
            max_distance=_float(env, "RETRIEVAL_MAX_DISTANCE", 0.6),
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            session_window=_int(env, "SESSION_WINDOW", 20),
            max_sessions=_int(env, "SESSION_MAX_COUNT", 50),
            max_text_chars=_int(env, "ASK_MAX_TEXT_CHARS", 2000),
            bedrock_read_timeout=_int(env, "BEDROCK_READ_TIMEOUT", 60),
            cors_origins=origins or ("http://localhost:5173",),
        )

    def missing_required(self, env: Mapping[str, str] | None = None) -> list[str]:
        """Nomes (nunca valores) das variaveis obrigatorias ausentes."""
        env = os.environ if env is None else env
        return [name for name in REQUIRED_ENV_VARS if not (env.get(name) or "").strip()]


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Carrega o .env da raiz do projeto uma vez e devolve a configuracao."""
    load_dotenv(PROJECT_ROOT / ".env")
    return Settings.from_env()
