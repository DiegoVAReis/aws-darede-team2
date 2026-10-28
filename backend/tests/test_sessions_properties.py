"""Propriedades de sessions.py (PBT-03) com modelo LRU de referencia (PBT-06 orientativo)."""

from __future__ import annotations

from collections import OrderedDict

from hypothesis import given
from hypothesis import strategies as st

from sessions import SessionManager, SourceCollector
from strategies import source_refs

POOL = ["s1", "s2", "s3", "s4", "s5", "s6"]


@given(
    operations=st.lists(st.sampled_from(POOL), max_size=40),
    max_sessions=st.integers(min_value=1, max_value=4),
)
def test_session_manager_matches_an_lru_model(operations, max_sessions):
    manager = SessionManager(lambda collector: object(), max_sessions)
    model: OrderedDict[str, None] = OrderedDict()

    for session_id in operations:
        expected_reset = session_id not in model
        lease = manager.acquire(session_id)

        if expected_reset:
            model[session_id] = None
            while len(model) > max_sessions:
                model.popitem(last=False)
        else:
            model.move_to_end(session_id)

        assert lease.session_reset is expected_reset
        assert len(manager) <= max_sessions
        assert session_id in manager
        assert [sid for sid in POOL if sid in manager] == [sid for sid in POOL if sid in model]


@given(sources=st.lists(source_refs(), max_size=15))
def test_collector_snapshot_never_repeats_a_file(sources):
    collector = SourceCollector()
    collector.add(sources)
    files = [source.file for source in collector.snapshot()]
    assert len(files) == len(set(files))
    assert files == list(dict.fromkeys(source.file for source in sources))


@given(sources=st.lists(source_refs(), max_size=15))
def test_discard_always_leaves_the_collector_empty(sources):
    collector = SourceCollector()
    collector.add(sources)
    collector.discard()
    assert collector.snapshot() == []


@given(first=st.lists(source_refs(), max_size=8), second=st.lists(source_refs(), max_size=8))
def test_reset_isolates_turns(first, second):
    collector = SourceCollector()
    collector.add(first)
    collector.reset()
    collector.add(second)
    assert [s.file for s in collector.snapshot()] == list(dict.fromkeys(s.file for s in second))
