"""Camada HTTP do assistente (BC-13).

Execucao local, a partir de backend/:  uvicorn main:app --port 8000
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import Annotated

from fastapi import Depends, FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from assistant_service import AssistantService
from config import Settings, get_settings
from dependencies import get_assistant_service
from errors import AppError, InternalAppError, to_error_body
from schemas import AskRequest, AskResponse, HealthResponse

logger = logging.getLogger("anyone.api")


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()

    @asynccontextmanager
    async def lifespan(_: FastAPI):
        logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
        missing = settings.missing_required()
        if missing:
            logger.error("Variaveis obrigatorias ausentes no .env: %s", ", ".join(missing))
        logger.info("Assistente iniciado (modelo=%s)", settings.bedrock_model_id)
        yield

    app = FastAPI(
        title="Anyone Agro Business - Assistente de Conhecimento Interno",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=list(settings.cors_origins),
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["Content-Type"],
    )

    @app.exception_handler(AppError)
    async def handle_app_error(_: Request, exc: AppError) -> JSONResponse:
        return JSONResponse(status_code=exc.status_code, content=to_error_body(exc))

    @app.exception_handler(RequestValidationError)
    async def handle_request_validation(_: Request, __: RequestValidationError) -> JSONResponse:
        error = AppError(
            "Requisicao invalida. Envie um JSON com o campo 'text' (texto) e, opcionalmente, "
            "'session_id' (texto).",
            code="VALIDATION_ERROR",
            status_code=422,
        )
        return JSONResponse(status_code=422, content=to_error_body(error))

    @app.exception_handler(Exception)
    async def handle_unexpected(_: Request, exc: Exception) -> JSONResponse:
        logger.error("Erro inesperado: %s", type(exc).__name__)
        error = InternalAppError("Ocorreu um erro inesperado. Tente novamente.")
        return JSONResponse(status_code=error.status_code, content=to_error_body(error))

    @app.get("/health", response_model=HealthResponse)
    def health() -> HealthResponse:
        return HealthResponse(status="ok")

    @app.post("/v1/ask", response_model=AskResponse)
    def ask(
        body: AskRequest,
        service: Annotated[AssistantService, Depends(get_assistant_service)],
    ) -> AskResponse:
        result = service.ask(body.text, body.session_id)
        return AskResponse(
            answer=result.answer,
            sources=result.sources,
            session_id=result.session_id,
            session_reset=result.session_reset,
        )

    return app


app = create_app()
