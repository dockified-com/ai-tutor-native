from fastapi import HTTPException
from starlette import status


class APIError(HTTPException):
    """Base API Error exception for the application."""

    def __init__(self, message: str, status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR):
        self.message = message
        super().__init__(status_code=status_code, detail=message)


class NotFoundError(APIError):
    """Exception raised for resources that are not found."""

    def __init__(self, message: str = "Resource not found"):
        super().__init__(message=message, status_code=status.HTTP_404_NOT_FOUND)


class ForbiddenError(APIError):
    """Exception raised for authorization errors."""

    def __init__(self, message: str = "Access forbidden"):
        super().__init__(message=message, status_code=status.HTTP_403_FORBIDDEN)


class GenerationError(APIError):
    """Exception raised during course or lesson generation."""

    def __init__(self, message: str = "Error during generation"):
        super().__init__(message=message, status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)
