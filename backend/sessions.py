"""Estado em memoria das conversas (BC-10)."""

from __future__ import annotations

import threading
import uuid
from collections import OrderedDict
from collections.abc import Callable
from dataclasses import dataclass, field
from typing import Any

from errors import AppError
from schemas import SourceRef


class SourceCollector:
    """Fontes consultadas no turno atual de uma sessao."""

    def __init__(self) -> None:
        self._sources: list[SourceRef] = []
        self._error: AppError | None = None

    def reset(self) -> None:
        self._sources = []
        self._error = None

    def add(self, sources: list[SourceRef]) -> None:
        known = {source.file for source in self._sources}
        for source in sources:
            if source.file not in known:
                known.add(source.file)
                self._sources.append(source)

    def discard(self) -> None:
        """O agente concluiu que a base nao responde: o turno fica sem fontes."""
        self._sources = []

    def record_error(self, error: AppError) -> None:
        self._error = error

    @property
    def error(self) -> AppError | None:
        return self._error

    def snapshot(self) -> list[SourceRef]:
        return list(self._sources)


@dataclass
class SessionContext:
    session_id: str
    agent: Any
    collector: SourceCollector
    lock: threading.Lock = field(default_factory=threading.Lock)


class SessionLease:
    """Uso exclusivo de uma sessao: adquire a trava ao entrar e libera ao sair."""

    def __init__(self, context: SessionContext, session_reset: bool):
        self.context = context
        self.session_reset = session_reset

    def __enter__(self) -> SessionLease:
        self.context.lock.acquire()
        return self

    def __exit__(self, exc_type, exc, traceback) -> None:
        self.context.lock.release()


AgentFactory = Callable[[SourceCollector], Any]


class SessionManager:
    """Sessoes ordenadas por uso recente, com limite e descarte da menos recente."""

    def __init__(self, agent_factory: AgentFactory, max_sessions: int):
        if max_sessions < 1:
            raise ValueError("max_sessions deve ser maior ou igual a 1.")
        self._factory = agent_factory
        self._max = max_sessions
        self._sessions: OrderedDict[str, SessionContext] = OrderedDict()
        self._guard = threading.Lock()

    def __len__(self) -> int:
        with self._guard:
            return len(self._sessions)

    def __contains__(self, session_id: str) -> bool:
        with self._guard:
            return session_id in self._sessions

    def acquire(self, session_id: str | None) -> SessionLease:
        with self._guard:
            if session_id is not None and session_id in self._sessions:
                self._sessions.move_to_end(session_id)
                return SessionLease(self._sessions[session_id], session_reset=False)

            reset = session_id is not None
            new_id = session_id if session_id is not None else uuid.uuid4().hex
            collector = SourceCollector()
            context = SessionContext(new_id, self._factory(collector), collector)
            self._sessions[new_id] = context
            while len(self._sessions) > self._max:
                self._sessions.popitem(last=False)
            return SessionLease(context, session_reset=reset)
