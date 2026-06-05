import pytest
import asyncio
from app.shared.utils.retry import retry_async

@pytest.mark.asyncio
async def test_retry_success():
    """Test that retry_async returns normally if the function succeeds."""
    async def always_succeeds():
        return "success"

    result = await retry_async(always_succeeds)
    assert result == "success"

@pytest.mark.asyncio
async def test_retry_eventual_success():
    """Test that retry_async correctly retries and eventually succeeds."""
    attempts = 0

    async def eventually_succeeds():
        nonlocal attempts
        attempts += 1
        if attempts < 3:
            raise ValueError("Failed on attempt")
        return "success on 3"

    # We use a very short base_delay for fast tests
    result = await retry_async(eventually_succeeds, max_retries=3, base_delay=0.01)

    assert attempts == 3
    assert result == "success on 3"

@pytest.mark.asyncio
async def test_retry_exhaustion():
    """Test that retry_async raises the exception after max_retries."""
    attempts = 0

    async def always_fails():
        nonlocal attempts
        attempts += 1
        raise ValueError("Always fails")

    with pytest.raises(ValueError, match="Always fails"):
        await retry_async(always_fails, max_retries=3, base_delay=0.01)

    # Initial attempt + 3 retries = 4 total attempts
    assert attempts == 4
