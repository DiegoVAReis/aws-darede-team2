"""Funcoes puras de texto para a ingestao (BC-05)."""

from __future__ import annotations

import re
from functools import lru_cache

import tiktoken

ENCODING_NAME = "cl100k_base"

_H1_PATTERN = re.compile(r"^#[ \t]+(.+?)[ \t]*#*[ \t]*$")


@lru_cache(maxsize=1)
def _encoding() -> tiktoken.Encoding:
    return tiktoken.get_encoding(ENCODING_NAME)


def count_tokens(text: str) -> int:
    """Conta tokens com o vocabulario cl100k_base (aproximacao para o Titan)."""
    return len(_encoding().encode(text, disallowed_special=()))


def split_into_chunks(text: str, size: int = 500, overlap: int = 50) -> list[str]:
    """Divide o texto em janelas de no maximo `size` tokens com `overlap` de sobreposicao.

    Texto em branco gera lista vazia. Texto que cabe em `size` tokens gera um unico chunk.
    """
    if size < 1:
        raise ValueError("size deve ser maior ou igual a 1.")
    if overlap < 0 or overlap >= size:
        raise ValueError("overlap deve estar entre 0 e size - 1.")

    stripped = text.strip()
    if not stripped:
        return []

    encoding = _encoding()
    tokens = encoding.encode(stripped, disallowed_special=())
    total = len(tokens)
    if total <= size:
        return [stripped]

    chunks: list[str] = []
    start = 0
    while start < total:
        end = min(start + size, total)
        piece = encoding.decode(tokens[start:end]).strip()
        # Decodificar uma janela pode mudar a contagem (bytes partidos); ajusta ate caber.
        while end > start + 1 and count_tokens(piece) > size:
            end -= 1
            piece = encoding.decode(tokens[start:end]).strip()
        if piece:
            chunks.append(piece)
        if end >= total:
            break
        start = max(end - overlap, start + 1)
    return chunks


def extract_title(markdown: str, fallback: str) -> str:
    """Primeiro H1 do Markdown (ignorando blocos de codigo) ou o texto de fallback."""
    in_fence = False
    for line in markdown.splitlines():
        if line.lstrip().startswith("```"):
            in_fence = not in_fence
            continue
        if in_fence:
            continue
        match = _H1_PATTERN.match(line)
        if match:
            title = match.group(1).strip()
            if title:
                return title
    return fallback


def title_from_stem(stem: str) -> str:
    """Titulo de fallback: '_' vira espaco e a primeira letra fica maiuscula."""
    text = stem.replace("_", " ").strip()
    if not text:
        return "Documento"
    return text[0].upper() + text[1:]


def build_chunk_id(source_stem: str, index: int) -> str:
    """Id deterministico do chunk: {arquivo_sem_extensao}-{indice}."""
    return f"{source_stem}-{index}"
