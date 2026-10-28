"""Propriedades de filter_relevant e dedupe_sources (PBT-03, PBT-04)."""

from __future__ import annotations

from hypothesis import given
from hypothesis import strategies as st

from knowledge_store import QueryHit
from rag import dedupe_sources, filter_relevant
from strategies import query_hits

limits = st.floats(min_value=0.0, max_value=1.5, allow_nan=False)


@given(hits=st.lists(query_hits(), max_size=10), limit=limits)
def test_filter_keeps_only_hits_within_the_limit_in_the_original_order(hits, limit):
    kept = filter_relevant(hits, limit)
    assert all(hit.distance <= limit for hit in kept)
    remaining = iter(hits)
    assert all(any(hit is candidate for candidate in remaining) for hit in kept)


@given(hits=st.lists(query_hits(), max_size=10), low=limits, high=limits)
def test_a_larger_limit_never_keeps_fewer_hits(hits, low, high):
    small, large = sorted((low, high))
    assert len(filter_relevant(hits, small)) <= len(filter_relevant(hits, large))


@given(hits=st.lists(query_hits(), max_size=12))
def test_sources_have_no_repeated_files_and_keep_first_appearance_order(hits):
    sources = dedupe_sources(hits)
    files = [source.file for source in sources]
    assert len(files) == len(set(files))
    first_seen = list(dict.fromkeys(hit.source for hit in hits))
    assert files == first_seen
    first_title = {}
    for hit in hits:
        first_title.setdefault(hit.source, hit.title)
    assert all(source.title == first_title[source.file] for source in sources)


@given(hits=st.lists(query_hits(), max_size=12))
def test_deduplication_is_idempotent(hits):
    once = dedupe_sources(hits)
    as_hits = [QueryHit("", s.file, s.title, 0.0) for s in once]
    assert dedupe_sources(as_hits) == once
