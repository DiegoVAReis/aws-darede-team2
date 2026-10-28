"""Configuracao compartilhada dos testes."""

from __future__ import annotations

import pytest
from hypothesis import HealthCheck, settings

from config import Settings

# PBT-08: shrinking ligado (padrao) e blob de reproducao impresso em caso de falha.
# Para repetir uma execucao: pytest --hypothesis-seed=<N>
settings.register_profile(
    "default",
    max_examples=100,
    deadline=None,
    print_blob=True,
    suppress_health_check=[
        HealthCheck.too_slow,
        HealthCheck.data_too_large,
        HealthCheck.large_base_example,
        HealthCheck.filter_too_much,
    ],
)
settings.load_profile("default")


@pytest.fixture
def app_settings(tmp_path):
    """Configuracao isolada em pastas temporarias, com chunks pequenos."""
    return Settings(
        kb_dir=tmp_path / "kb",
        chroma_dir=tmp_path / "chroma",
        chunk_size=40,
        chunk_overlap=5,
    )
