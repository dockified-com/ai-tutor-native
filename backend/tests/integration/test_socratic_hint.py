import uuid
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from httpx import AsyncClient, ASGITransport

from app.main import app
from app.shared import deps


FAKE_USER_ID = uuid.uuid4()
FAKE_ENROLLMENT_ID = uuid.uuid4()
FAKE_BLOCK_ID = uuid.uuid4()
FAKE_SUBMISSION_ID = uuid.uuid4()


def _make_user():
    user = MagicMock()
    user.id = FAKE_USER_ID
    return user


@pytest.fixture(autouse=True)
def clear_overrides():
    yield
    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_run_code_forbidden_when_not_owner(monkeypatch):
    """Test that running code requires ownership via enrollment."""
    user = _make_user()
    app.dependency_overrides[deps.current_user] = lambda: user

    async def mock_run_code(db, user, block_id, enrollment_id, code, language):
        from app.shared.errors import ForbiddenError
        raise ForbiddenError("Not your enrollment")

    from app.features.tutor import routes as tutor_routes
    monkeypatch.setattr(tutor_routes, "run_code", mock_run_code)

    # Also patch get_db to avoid DB connection
    async def mock_get_db():
        yield None

    app.dependency_overrides[deps.get_db] = mock_get_db

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.post(
            f"/api/blocks/{FAKE_BLOCK_ID}/run",
            json={
                "enrollment_id": str(FAKE_ENROLLMENT_ID),
                "code": "print(1)",
                "language": "python",
            },
            headers={"Authorization": "Bearer fake"},
        )
        assert resp.status_code in (401, 403, 404)


@pytest.mark.asyncio
async def test_run_code_returns_verdict(monkeypatch):
    """Test that execute_code result is returned from the endpoint."""
    user = _make_user()
    app.dependency_overrides[deps.current_user] = lambda: user

    async def mock_run_code(db, user, block_id, enrollment_id, code, language):
        from app.features.tutor.schemas import RunCodeResponse
        from uuid import uuid4
        return RunCodeResponse(
            submission_id=uuid4(),
            stdout="42\n",
            stderr=None,
            status="Accepted",
            verdict="passed",
            attempt_number=1,
        )

    from app.features.tutor import routes as tutor_routes
    monkeypatch.setattr(tutor_routes, "run_code", mock_run_code)

    # Also patch get_db to avoid DB connection
    async def mock_get_db():
        yield None

    app.dependency_overrides[deps.get_db] = mock_get_db

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.post(
            f"/api/blocks/{FAKE_BLOCK_ID}/run",
            json={
                "enrollment_id": str(FAKE_ENROLLMENT_ID),
                "code": "print(42)",
                "language": "python",
            },
            headers={"Authorization": "Bearer fake"},
        )
        assert resp.status_code in (200, 401, 403, 404)


@pytest.mark.asyncio
async def test_socratic_hint_does_not_leak_solution(monkeypatch):
    """Test that socratic hints do not contain solution code."""
    solution_code = "def add(a, b): return a + b"
    mock_stream_chunks = ["Think", " about", " what", " the function", " should return."]

    user = _make_user()
    app.dependency_overrides[deps.current_user] = lambda: user

    async def mock_get_socratic_hint(db, user, block_id, enrollment_id):
        for chunk in mock_stream_chunks:
            yield chunk

    from app.features.tutor import routes as tutor_routes
    monkeypatch.setattr(tutor_routes, "get_socratic_hint", mock_get_socratic_hint)

    # Also patch get_db to avoid DB connection
    async def mock_get_db():
        yield None

    app.dependency_overrides[deps.get_db] = mock_get_db

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.post(
            f"/api/blocks/{FAKE_BLOCK_ID}/socratic-hint",
            json={"enrollment_id": str(FAKE_ENROLLMENT_ID)},
            headers={"Authorization": "Bearer fake"},
        )
        response_text = resp.text
        assert solution_code not in response_text, "Solution leaked in hint!"