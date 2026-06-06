import pytest
from uuid import uuid4
from datetime import datetime
from types import SimpleNamespace

from app.main import app
from app.shared import deps
from app.features.courses.models import CourseStatus
from app.features.enrollment import service as enrollment_svc
from app.shared.errors import NotFoundError, ForbiddenError


def _make_user(user_id=None):
    return SimpleNamespace(id=user_id or uuid4())


def _make_course(user_id):
    return SimpleNamespace(
        id=uuid4(),
        creator_id=user_id,
        code="ABC123",
        title="Test Course",
        description="Test Description",
        default_language="python",
        status=CourseStatus.published,
        generation_phase=None,
        total_lessons=10,
        total_blocks=50,
        created_at=datetime.now(),
        updated_at=datetime.now(),
    )


def _make_enrollment(user_id, course_id):
    return SimpleNamespace(
        id=uuid4(),
        user_id=user_id,
        course_id=course_id,
        current_lesson_id=None,
        current_block_id=None,
        started_at=datetime.now(),
        completed_at=None,
    )


@pytest.fixture(autouse=True)
def clear_overrides():
    yield
    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_list_courses_returns_own_courses(client, monkeypatch):
    user = _make_user()
    app.dependency_overrides[deps.current_user] = lambda: user

    fake_course = _make_course(user.id)

    async def mock_list_courses(db, creator_id):
        return [fake_course]

    # Patch in routes module where it's imported
    from app.features.courses import routes as courses_routes
    monkeypatch.setattr(courses_routes, "list_courses", mock_list_courses)

    resp = await client.get("/api/courses")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["title"] == "Test Course"


@pytest.mark.asyncio
async def test_get_course_not_found(client, monkeypatch):
    user = _make_user()
    app.dependency_overrides[deps.current_user] = lambda: user
    course_id = uuid4()

    async def mock_get_course(db, user_id, cid):
        raise NotFoundError("Course not found")

    from app.features.courses import routes as courses_routes
    monkeypatch.setattr(courses_routes, "get_course", mock_get_course)

    resp = await client.get(f"/api/courses/{course_id}")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_enroll_by_code_creates_201(client, monkeypatch):
    user = _make_user()
    app.dependency_overrides[deps.current_user] = lambda: user

    fake_enrollment = _make_enrollment(user.id, uuid4())

    async def mock_enroll_by_code(db, user_id, code):
        return fake_enrollment

    from app.features.enrollment import routes as enrollment_routes
    monkeypatch.setattr(enrollment_routes, "enroll_by_code", mock_enroll_by_code)

    resp = await client.post("/api/enrollments", json={"code": "ABC123"})
    assert resp.status_code == 201
    data = resp.json()
    assert "id" in data


@pytest.mark.asyncio
async def test_enroll_duplicate_idempotent(client, monkeypatch):
    user = _make_user()
    app.dependency_overrides[deps.current_user] = lambda: user

    fake_enrollment = _make_enrollment(user.id, uuid4())

    async def mock_enroll_by_code(db, user_id, code):
        return fake_enrollment

    from app.features.enrollment import routes as enrollment_routes
    monkeypatch.setattr(enrollment_routes, "enroll_by_code", mock_enroll_by_code)

    resp = await client.post("/api/enrollments", json={"code": "ABC123"})
    assert resp.status_code == 201


@pytest.mark.asyncio
async def test_enroll_unknown_code_404(client, monkeypatch):
    user = _make_user()
    app.dependency_overrides[deps.current_user] = lambda: user

    async def mock_enroll_by_code(db, user_id, code):
        raise NotFoundError("Course not found")

    from app.features.enrollment import routes as enrollment_routes
    monkeypatch.setattr(enrollment_routes, "enroll_by_code", mock_enroll_by_code)

    resp = await client.post("/api/enrollments", json={"code": "XXYYYY"})
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_get_enrollment_forbidden(client, monkeypatch):
    user = _make_user()
    app.dependency_overrides[deps.current_user] = lambda: user
    enrollment_id = uuid4()

    async def mock_get_enrollment(db, user_id, eid):
        raise ForbiddenError("Not your enrollment")

    from app.features.enrollment import routes as enrollment_routes
    monkeypatch.setattr(enrollment_routes, "get_enrollment", mock_get_enrollment)

    resp = await client.get(f"/api/enrollments/{enrollment_id}")
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_list_blocks_strips_sensitive_fields(client, monkeypatch):
    user = _make_user()
    app.dependency_overrides[deps.current_user] = lambda: user
    lesson_id = uuid4()

    fake_block = SimpleNamespace(
        id=uuid4(),
        position=1,
        type="code",
        content={"language": "python", "starter_code": "def foo():"},
        tts_audio_url=None,
    )

    async def mock_get_lesson_blocks(db, lid):
        return [fake_block]

    from app.features.tutor import routes as tutor_routes
    monkeypatch.setattr(tutor_routes, "get_lesson_blocks", mock_get_lesson_blocks)

    resp = await client.get(f"/api/lessons/{lesson_id}/blocks")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert "solution" not in data[0]["content"]
    assert "tests" not in data[0]["content"]


@pytest.mark.asyncio
async def test_list_blocks_lesson_not_found(client, monkeypatch):
    user = _make_user()
    app.dependency_overrides[deps.current_user] = lambda: user
    lesson_id = uuid4()

    async def mock_get_lesson_blocks(db, lid):
        raise NotFoundError("Lesson not found")

    from app.features.tutor import routes as tutor_routes
    monkeypatch.setattr(tutor_routes, "get_lesson_blocks", mock_get_lesson_blocks)

    resp = await client.get(f"/api/lessons/{lesson_id}/blocks")
    assert resp.status_code == 404