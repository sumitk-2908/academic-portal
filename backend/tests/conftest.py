import pytest
from httpx import AsyncClient, ASGITransport
from fastapi.testclient import TestClient
from app.main import app

@pytest.fixture
def test_client():
    return TestClient(app)

@pytest.fixture
async def async_client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac

@pytest.fixture
def mock_supabase_user():
    def _mock_user(email="user@test.com", user_id="123", email_confirmed=True):
        return {
            "email": email,
            "id": user_id,
            "email_confirmed_at": "2023-01-01T00:00:00Z" if email_confirmed else None
        }
    return _mock_user

@pytest.fixture
def mock_auth_header_generator():
    import base64
    import json
    
    def _gen_token(aal="aal1"):
        payload = {"aal": aal}
        payload_bytes = json.dumps(payload).encode("utf-8")
        payload_b64 = base64.urlsafe_b64encode(payload_bytes).decode("utf-8").rstrip("=")
        return f"header.{payload_b64}.signature"
        
    return _gen_token
