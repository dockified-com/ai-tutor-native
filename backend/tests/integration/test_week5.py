import json
import uuid
import pytest
from types import SimpleNamespace
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.shared import deps

FAKE_USER_ID = uuid.uuid4()
FAKE_ENROLLMENT_ID = uuid.uuid4()
FAKE_BLOCK_ID = uuid.uuid4()


def _make_user():
    u = SimpleNamespace(id=FAKE_USER_ID)
    return u


@pytest.fixture(autouse=True)
def clear_overrides():
    yield
    app.dependency_overrides.clear()


@pytest.fixture
def mock_db():
    async def _get_db():
        yield None
    app.dependency_overrides[deps.get_db] = _get_db


@pytest.mark.asyncio
async def test_understanding_check_streams_result_event(monkeypatch, mock_db):
    user = _make_user()
    app.dependency_overrides[deps.current_user] = lambda: user

    async def mock_evaluate_understanding(db, u, block_id, enrollment_id, response):
        async def _gen():
            yield {"event": "token", "data": "Good effort!"}
            yield {"event": "result", "data": json.dumps({"passed": True, "level": "good"})}
            yield {"event": "done", "data": ""}
        return _gen()

    from app.features.tutor import routes as tutor_routes
    monkeypatch.setattr(tutor_routes, "evaluate_understanding", mock_evaluate_understanding)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.post(
            f"/api/blocks/{FAKE_BLOCK_ID}/understanding-check",
            json={"enrollment_id": str(FAKE_ENROLLMENT_ID), "response": "recursion uses base cases"},
        )
    assert resp.status_code == 200
    text = resp.text
    assert "result" in text
    assert "passed" in text


@pytest.mark.asyncio
async def test_ask_anything_streams_tokens(monkeypatch, mock_db):
    user = _make_user()
    app.dependency_overrides[deps.current_user] = lambda: user

    persisted = {}

    async def mock_ask_anything(db, u, enrollment_id, question, block_id):
        async def _gen():
            yield {"event": "token", "data": "Recursion is..."}
            yield {"event": "done", "data": ""}
        persisted["called"] = True
        persisted["question"] = question
        return _gen()

    from app.features.tutor import routes as tutor_routes
    monkeypatch.setattr(tutor_routes, "ask_anything", mock_ask_anything)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.post(
            f"/api/enrollments/{FAKE_ENROLLMENT_ID}/ask",
            json={"question": "What is recursion?"},
        )
    assert resp.status_code == 200
    assert persisted["called"] is True
    assert persisted["question"] == "What is recursion?"


@pytest.mark.asyncio
async def test_concept_check_no_answer_leak(monkeypatch, mock_db):
    user = _make_user()
    app.dependency_overrides[deps.current_user] = lambda: user
    lesson_id = uuid.uuid4()

    fake_block = SimpleNamespace(
        id=FAKE_BLOCK_ID,
        position=1,
        type="concept_check",
        content={
            "question": "What is 2+2?",
            "options": ["3", "4", "5"],
            "correct_index": 1,
            "explanation": "Because 2+2=4",
        },
        tts_audio_url=None,
    )

    async def mock_get_lesson_blocks(db, user_id, lid):
        from app.features.tutor.service import strip_sensitive_fields
        from app.features.tutor.schemas import BlockOut
        return [
            BlockOut(
                id=fake_block.id,
                position=fake_block.position,
                type=fake_block.type,
                content=strip_sensitive_fields(fake_block.type, fake_block.content),
                tts_audio_url=fake_block.tts_audio_url,
            )
        ]

    from app.features.tutor import routes as tutor_routes
    monkeypatch.setattr(tutor_routes, "get_lesson_blocks", mock_get_lesson_blocks)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.get(f"/api/lessons/{lesson_id}/blocks")
    assert resp.status_code == 200
    block_content = resp.json()[0]["content"]
    assert "correct_index" not in block_content
    assert "explanation" not in block_content
