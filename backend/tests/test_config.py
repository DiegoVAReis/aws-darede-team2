"""Testes de exemplo de config.py (BC-01)."""

from __future__ import annotations

from pathlib import Path

import pytest

from config import PROJECT_ROOT, Settings


def test_defaults_follow_the_design():
    settings = Settings.from_env({})
    assert settings.aws_region == "us-east-1"
    assert settings.bedrock_model_id == "amazon.nova-pro-v1:0"
    assert settings.bedrock_embed_model_id == "amazon.titan-embed-text-v2:0"
    assert settings.collection_name == "anyone"
    assert settings.top_k == 3
    assert settings.max_distance == 0.6
    assert (settings.chunk_size, settings.chunk_overlap) == (500, 50)
    assert settings.session_window == 20
    assert settings.max_sessions == 50
    assert settings.max_text_chars == 2000
    assert settings.bedrock_read_timeout == 60
    assert settings.cors_origins == ("http://localhost:5173",)


def test_overrides_from_environment():
    env = {
        "RETRIEVAL_TOP_K": "5",
        "RETRIEVAL_MAX_DISTANCE": "0.45",
        "SESSION_MAX_COUNT": "10",
        "CORS_ORIGINS": "http://a.test, http://b.test",
    }
    settings = Settings.from_env(env)
    assert settings.top_k == 5
    assert settings.max_distance == 0.45
    assert settings.max_sessions == 10
    assert settings.cors_origins == ("http://a.test", "http://b.test")


@pytest.mark.parametrize(
    "env",
    [
        {"RETRIEVAL_TOP_K": "abc"},
        {"RETRIEVAL_TOP_K": "0"},
        {"RETRIEVAL_MAX_DISTANCE": "3"},
        {"RETRIEVAL_MAX_DISTANCE": "x"},
        {"CHUNK_SIZE": "50", "CHUNK_OVERLAP": "50"},
    ],
)
def test_invalid_values_are_rejected(env):
    with pytest.raises(ValueError):
        Settings.from_env(env)


def test_relative_paths_resolve_from_project_root_and_absolute_are_kept(tmp_path):
    relative = Settings.from_env({"KB_DIR": "minha_base"})
    assert relative.kb_dir == PROJECT_ROOT / "minha_base"
    absolute = Settings.from_env({"KB_DIR": str(tmp_path)})
    assert absolute.kb_dir == Path(tmp_path)


def test_missing_required_returns_names_only():
    settings = Settings.from_env({})
    assert settings.missing_required({}) == ["AWS_BEARER_TOKEN_BEDROCK"]
    assert settings.missing_required({"AWS_BEARER_TOKEN_BEDROCK": "   "}) == [
        "AWS_BEARER_TOKEN_BEDROCK"
    ]
    assert settings.missing_required({"AWS_BEARER_TOKEN_BEDROCK": "segredo"}) == []
