import time
import pytest
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives import serialization
import jwt as pyjwt

from app.features.auth.clerk import ClerkVerifier, ClerkAuthError


def _make_keypair():
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    pub_pem = key.public_key().public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo,
    )
    priv_pem = key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    )
    return priv_pem, pub_pem


def test_verifier_accepts_valid_token():
    priv, pub = _make_keypair()
    token = pyjwt.encode(
        {
            "sub": "user_abc",
            "iat": int(time.time()),
            "exp": int(time.time()) + 60,
            "iss": "https://clerk.test",
        },
        priv,
        algorithm="RS256",
        headers={"kid": "test-kid"},
    )

    verifier = ClerkVerifier(public_keys={"test-kid": pub}, expected_issuer="https://clerk.test")
    claims = verifier.verify(token)

    assert claims["sub"] == "user_abc"


def test_verifier_rejects_expired_token():
    priv, pub = _make_keypair()
    token = pyjwt.encode(
        {
            "sub": "user_abc",
            "iat": int(time.time()) - 600,
            "exp": int(time.time()) - 60,
            "iss": "https://clerk.test",
        },
        priv,
        algorithm="RS256",
        headers={"kid": "test-kid"},
    )

    verifier = ClerkVerifier(public_keys={"test-kid": pub}, expected_issuer="https://clerk.test")
    with pytest.raises(ClerkAuthError):
        verifier.verify(token)


def test_verifier_rejects_unknown_kid():
    priv, _ = _make_keypair()
    _, pub_other = _make_keypair()
    token = pyjwt.encode(
        {
            "sub": "user_abc",
            "iat": int(time.time()),
            "exp": int(time.time()) + 60,
            "iss": "https://clerk.test",
        },
        priv,
        algorithm="RS256",
        headers={"kid": "unknown-kid"},
    )

    verifier = ClerkVerifier(public_keys={"test-kid": pub_other}, expected_issuer="https://clerk.test")
    with pytest.raises(ClerkAuthError):
        verifier.verify(token)
