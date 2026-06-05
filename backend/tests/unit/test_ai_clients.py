import pytest

def test_anthropic_client_initialization():
    """Test that the Anthropic client singleton initializes properly."""
    from app.shared.ai.anthropic_client import anthropic_client
    from anthropic import AsyncAnthropic

    assert isinstance(anthropic_client, AsyncAnthropic)
    assert anthropic_client.api_key is not None

def test_openai_client_initialization():
    """Test that the OpenAI client singleton initializes properly."""
    from app.shared.ai.openai_client import openai_client
    from openai import AsyncOpenAI

    assert isinstance(openai_client, AsyncOpenAI)
    assert openai_client.api_key is not None

@pytest.mark.asyncio
async def test_judge0_client_unsupported_language():
    """Test that the Judge0 client correctly rejects unsupported languages."""
    from app.shared.ai.judge0_client import execute_code

    with pytest.raises(ValueError, match="Unsupported language: brainfuck"):
        await execute_code("print('hello')", "brainfuck")
