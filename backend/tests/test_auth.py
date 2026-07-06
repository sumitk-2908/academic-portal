import pytest
from fastapi import Request, HTTPException
from unittest.mock import patch, MagicMock
from app.auth import verify_token, verify_admin

@pytest.fixture
def mock_request():
    request = MagicMock(spec=Request)
    request.headers = {"Authorization": "Bearer fake_token"}
    return request

@pytest.mark.asyncio
async def test_verify_token_missing_header():
    request = MagicMock(spec=Request)
    request.headers = {}
    
    with pytest.raises(HTTPException) as excinfo:
        await verify_token(request)
    assert excinfo.value.status_code == 401
    assert "Missing or invalid authentication token" in str(excinfo.value.detail)

@pytest.mark.asyncio
@patch("httpx.AsyncClient.get")
async def test_verify_token_valid(mock_get, mock_request, mock_supabase_user):
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = mock_supabase_user()
    mock_get.return_value = mock_response

    user_data = await verify_token(mock_request)
    assert user_data["email"] == "user@test.com"
    assert user_data["raw_jwt"] == "fake_token"

@pytest.mark.asyncio
@patch("httpx.AsyncClient.get")
async def test_verify_token_email_unconfirmed(mock_get, mock_request, mock_supabase_user):
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = mock_supabase_user(email_confirmed=False)
    mock_get.return_value = mock_response

    with pytest.raises(HTTPException) as excinfo:
        await verify_token(mock_request)
    assert excinfo.value.status_code == 403
    assert "Email verification required" in str(excinfo.value.detail)

@pytest.mark.asyncio
@patch("app.auth.supabase")
async def test_verify_admin_not_admin(mock_supabase, mock_auth_header_generator):
    user = {"id": "123", "raw_jwt": mock_auth_header_generator("aal2")}
    
    mock_db_response = MagicMock()
    mock_db_response.data = []
    mock_supabase.table().select().eq().execute.return_value = mock_db_response

    with pytest.raises(HTTPException) as excinfo:
        await verify_admin(user)
    assert excinfo.value.status_code == 403
    assert "Not authorized as an administrator" in str(excinfo.value.detail)

@pytest.mark.asyncio
@patch("app.auth.supabase")
async def test_verify_admin_valid_aal2(mock_supabase, mock_auth_header_generator):
    user = {"id": "123", "raw_jwt": mock_auth_header_generator("aal2")}
    
    mock_db_response = MagicMock()
    mock_db_response.data = [{"id": 1}]
    mock_supabase.table().select().eq().execute.return_value = mock_db_response

    result = await verify_admin(user)
    assert result == user

@pytest.mark.asyncio
@patch("app.auth.supabase")
async def test_verify_admin_invalid_aal(mock_supabase, mock_auth_header_generator):
    user = {"id": "123", "raw_jwt": mock_auth_header_generator("aal1")}
    
    mock_db_response = MagicMock()
    mock_db_response.data = [{"id": 1}]
    mock_supabase.table().select().eq().execute.return_value = mock_db_response

    with pytest.raises(HTTPException) as excinfo:
        await verify_admin(user)
    assert excinfo.value.status_code == 403
    assert "This action requires Authenticator MFA (AAL2)" in str(excinfo.value.detail)
