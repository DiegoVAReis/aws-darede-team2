"""Testes de exemplo de sessions.py (BC-10)."""

from __future__ import annotations

import pytest

from errors import UpstreamError
from schemas import SourceRef
from sessions import SessionManager, SourceCollector

A = SourceRef(file="a.md", title="Titulo A")
B = SourceRef(file="b.md", title="Titulo B")


def test_collector_deduplicates_by_file_and_keeps_order():
    collector = SourceCollector()
    collector.add([A, B])
    collector.add([SourceRef(file="a.md", title="Outro"), B])
    assert collector.snapshot() == [A, B]


def test_collector_discard_and_reset():
    collector = SourceCollector()
    collector.add([A])
    collector.record_error(UpstreamError("x"))
    collector.discard()
    assert collector.snapshot() == []
    assert collector.error is not None
    collector.reset()
    assert collector.error is None


def test_snapshot_is_a_copy():
    collector = SourceCollector()
    collector.add([A])
    collector.snapshot().clear()
    assert collector.snapshot() == [A]


def manager(max_sessions=3):
    return SessionManager(lambda collector: object(), max_sessions)


def test_without_session_id_a_new_session_is_created_without_reset():
    sessions = manager()
    lease = sessions.acquire(None)
    assert len(lease.context.session_id) == 32
    assert lease.session_reset is False
    assert len(sessions) == 1


def test_known_session_is_reused_without_reset():
    sessions = manager()
    first = sessions.acquire("abc")
    second = sessions.acquire("abc")
    assert first.context is second.context
    assert first.session_reset is True  # id desconhecido na primeira vez
    assert second.session_reset is False


def test_unknown_session_id_is_created_with_the_same_id_and_reset():
    sessions = manager()
    lease = sessions.acquire("nova-sessao")
    assert lease.context.session_id == "nova-sessao"
    assert lease.session_reset is True


def test_least_recently_used_session_is_evicted():
    sessions = manager(max_sessions=2)
    sessions.acquire("a")
    sessions.acquire("b")
    sessions.acquire("a")  # a passa a ser a mais recente
    sessions.acquire("c")  # remove b
    assert "a" in sessions
    assert "c" in sessions
    assert "b" not in sessions
    assert sessions.acquire("b").session_reset is True


def test_each_session_gets_its_own_agent_and_collector():
    sessions = SessionManager(lambda collector: {"collector": collector}, 5)
    one = sessions.acquire("um").context
    two = sessions.acquire("dois").context
    assert one.agent["collector"] is one.collector
    assert one.collector is not two.collector


def test_lease_holds_the_session_lock_only_inside_the_block():
    sessions = manager()
    lease = sessions.acquire("x")
    context = lease.context
    with lease:
        assert context.lock.acquire(blocking=False) is False
    assert context.lock.acquire(blocking=False) is True
    context.lock.release()


def test_lock_is_released_when_the_block_raises():
    sessions = manager()
    lease = sessions.acquire("x")
    with pytest.raises(RuntimeError), lease:
        raise RuntimeError("falha")
    assert lease.context.lock.acquire(blocking=False) is True
    lease.context.lock.release()


def test_invalid_limit_is_rejected():
    with pytest.raises(ValueError):
        SessionManager(lambda collector: object(), 0)
