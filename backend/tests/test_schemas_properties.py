"""Round-trips de serializacao dos contratos da API (PBT-02)."""

from __future__ import annotations

from hypothesis import given

from errors import to_error_body
from schemas import AskRequest, AskResponse, ErrorResponse, SourceRef
from strategies import app_errors, ask_requests, ask_responses, source_refs


@given(ask_requests())
def test_ask_request_json_round_trip(request):
    assert AskRequest.model_validate_json(request.model_dump_json()) == request


@given(ask_responses())
def test_ask_response_json_round_trip(response):
    assert AskResponse.model_validate_json(response.model_dump_json()) == response


@given(source_refs())
def test_source_ref_json_round_trip(source):
    assert SourceRef.model_validate_json(source.model_dump_json()) == source


@given(app_errors())
def test_error_body_validates_and_preserves_code_and_message(error):
    parsed = ErrorResponse.model_validate(to_error_body(error))
    assert parsed.error.code == error.code
    assert parsed.error.message == error.message
