"""Geradores de dominio reutilizaveis para os testes de propriedades (PBT-07)."""

from __future__ import annotations

import string

from hypothesis import strategies as st

from errors import AppError
from knowledge_store import QueryHit
from schemas import AskRequest, AskResponse, SourceRef

ACCENTS = "áàâãéêíóôõúçÁÀÂÃÉÊÍÓÔÕÚÇ"
LETTERS = string.ascii_letters + ACCENTS
TITLE_ALPHABET = string.ascii_letters + string.digits + ACCENTS + " -"
FILES = ("maquinas.md", "credito.md", "seguros.md", "logistica.md")


def words(max_size: int = 8) -> st.SearchStrategy[str]:
    """Palavras curtas em portugues (com acentos), sem espacos."""
    return st.text(alphabet=LETTERS, min_size=1, max_size=max_size)


@st.composite
def prose(draw, min_words: int = 0, max_words: int = 150) -> str:
    """Texto corrido: palavras separadas por espaco, quebra de linha ou pontuacao."""
    count = draw(st.integers(min_value=min_words, max_value=max_words))
    parts: list[str] = []
    for _ in range(count):
        parts.append(draw(words()))
        parts.append(draw(st.sampled_from([" ", " ", " ", "\n", ". ", ", "])))
    return "".join(parts)


def titles() -> st.SearchStrategy[str]:
    """Titulos H1 validos: nao vazios, sem '#', sem espacos nas pontas."""
    return st.text(alphabet=TITLE_ALPHABET, min_size=1, max_size=60).map(str.strip).filter(bool)


def file_names() -> st.SearchStrategy[str]:
    return st.from_regex(r"[a-z_]{1,20}\.md", fullmatch=True)


def session_ids() -> st.SearchStrategy[str]:
    return st.from_regex(r"[A-Za-z0-9_-]{1,64}", fullmatch=True)


def invalid_session_ids() -> st.SearchStrategy[str]:
    """Ids fora do padrao: vazio, longo demais ou com caracteres proibidos."""
    with_bad_char = st.builds(
        lambda prefix, bad: prefix + bad,
        st.text(alphabet=string.ascii_letters, max_size=10),
        st.sampled_from(["!", " ", "/", "ç", ".", "@"]),
    )
    too_long = st.text(alphabet=string.ascii_letters, min_size=65, max_size=90)
    return st.one_of(st.just(""), with_bad_char, too_long)


def source_refs() -> st.SearchStrategy[SourceRef]:
    return st.builds(SourceRef, file=file_names(), title=titles())


def ask_requests() -> st.SearchStrategy[AskRequest]:
    return st.builds(
        AskRequest,
        text=st.text(max_size=200),
        session_id=st.one_of(st.none(), session_ids()),
    )


def ask_responses() -> st.SearchStrategy[AskResponse]:
    return st.builds(
        AskResponse,
        answer=st.text(max_size=300),
        sources=st.lists(source_refs(), max_size=5),
        session_id=session_ids(),
        session_reset=st.booleans(),
    )


def query_hits() -> st.SearchStrategy[QueryHit]:
    """Hits com poucos arquivos possiveis, para produzir repeticoes de fonte."""
    return st.builds(
        QueryHit,
        text=st.text(max_size=50),
        source=st.sampled_from(FILES),
        title=titles(),
        distance=st.floats(min_value=0.0, max_value=1.5, allow_nan=False),
    )


ERROR_CODES = ("VALIDATION_ERROR", "KB_NOT_INDEXED", "UPSTREAM_ERROR", "INTERNAL_ERROR")


def app_errors() -> st.SearchStrategy[AppError]:
    return st.builds(
        lambda message, code, status: AppError(message, code=code, status_code=status),
        st.text(min_size=1, max_size=100),
        st.sampled_from(ERROR_CODES),
        st.sampled_from([422, 503, 502, 500]),
    )
