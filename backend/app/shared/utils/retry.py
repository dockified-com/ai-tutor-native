import asyncio
import logging
from typing import TypeVar, Callable, Awaitable, Any

T = TypeVar("T")
logger = logging.getLogger(__name__)


async def retry_async(
    func: Callable[..., Awaitable[T]],
    *args: Any,
    max_retries: int = 3,
    base_delay: float = 1.0,
    max_delay: float = 10.0,
    **kwargs: Any
) -> T:
    """
    Executes an asynchronous function with exponential backoff retry logic.

    Args:
        func: The async function to execute.
        *args: Positional arguments to pass to the function.
        max_retries: The maximum number of retry attempts.
        base_delay: The initial delay in seconds before the first retry.
        max_delay: The maximum delay in seconds between retries.
        **kwargs: Keyword arguments to pass to the function.

    Returns:
        The result of the async function.

    Raises:
        Exception: Re-raises the last exception if all retries fail.
    """
    attempt = 0
    while True:
        try:
            return await func(*args, **kwargs)
        except Exception as e:
            attempt += 1
            if attempt > max_retries:
                logger.error(f"Function {func.__name__} failed after {max_retries} retries. Last error: {e}")
                raise

            delay = min(base_delay * (2 ** (attempt - 1)), max_delay)
            logger.warning(f"Function {func.__name__} failed (attempt {attempt}/{max_retries}). Retrying in {delay}s. Error: {e}")
            await asyncio.sleep(delay)
