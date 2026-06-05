from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.authoring.models import CourseChunk


from app.shared.ai.openai_client import openai_client


async def embed(text: str) -> list[float]:
    """
    Generate vector embeddings for the given text using OpenAI's text-embedding-3-small model.
    """
    response = await openai_client.embeddings.create(
        input=text,
        model="text-embedding-3-small"
    )
    return response.data[0].embedding


async def retrieve(
    query: str, 
    db: AsyncSession,
    top_k: int = 5
) -> list[CourseChunk]:
    """
    Retrieve the top_k most relevant CourseChunks for the given query.
    """
    query_embedding = await embed(query)
    
    stmt = (
        select(CourseChunk)
        .order_by(CourseChunk.embedding.cosine_distance(query_embedding))
        .limit(top_k)
    )
    
    result = await db.execute(stmt)
    return list(result.scalars().all())
