from __future__ import annotations

import time
from dataclasses import dataclass

import httpx
import jwt as pyjwt
from cryptography.hazmat.primitives import serialization
from jwt.algorithms import RSAAlgorithm


class ClerkAuthError(Exception):
    """Raised when a Clerk JWT cannot be verified."""


@dataclass
class ClerkVerifier:
    public_keys: dict[str, bytes]   # kid -> PEM-encoded public key
    expected_issuer: str
    leeway_seconds: int = 5

    def verify(self, token: str) -> dict:
        try:
            header = pyjwt.get_unverified_header(token)
        except pyjwt.PyJWTError as exc:
            raise ClerkAuthError(f"malformed token: {exc}") from exc

        kid = header.get("kid")
        if not kid or kid not in self.public_keys:
            raise ClerkAuthError(f"unknown key id: {kid}")

        try:
            return pyjwt.decode(
                token,
                key=self.public_keys[kid],
                algorithms=["RS256"],
                issuer=self.expected_issuer,
                options={"require": ["exp", "sub", "iss"]},
                leeway=self.leeway_seconds,
            )
        except pyjwt.PyJWTError as exc:
            raise ClerkAuthError(str(exc)) from exc


class ClerkJwksClient:
    """Fetches and caches Clerk's JWKS (key set) for verifying tokens."""

    def __init__(self, jwks_url: str, cache_seconds: int = 300):
        self._jwks_url = jwks_url
        self._cache_seconds = cache_seconds
        self._cache: tuple[float, dict[str, bytes]] | None = None

    async def get_keys(self) -> dict[str, bytes]:
        now = time.monotonic()
        if self._cache and now - self._cache[0] < self._cache_seconds:
            return self._cache[1]

        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(self._jwks_url)
            resp.raise_for_status()
            jwks = resp.json()

        keys: dict[str, bytes] = {}
        for jwk in jwks.get("keys", []):
            kid = jwk["kid"]
            public_key = RSAAlgorithm.from_jwk(jwk)
            keys[kid] = public_key.public_bytes(
                encoding=serialization.Encoding.PEM,
                format=serialization.PublicFormat.SubjectPublicKeyInfo,
            )

        self._cache = (now, keys)
        return keys
