import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from app.main import app
from app.auth import verify_token, verify_admin

@pytest.fixture
def mock_upload_file():
    return (
        "test_document.pdf",
        b"%PDF-1.4 mock pdf content",
        "application/pdf"
    )

@pytest.fixture
def mock_upload_file_large():
    return (
        "large_document.pdf",
        b"0" * (51 * 1024 * 1024),
        "application/pdf"
    )

@pytest.fixture
def mock_upload_file_not_pdf():
    return (
        "test_document.txt",
        b"some text content",
        "text/plain"
    )

@pytest.fixture(autouse=True)
def clear_overrides():
    yield
    app.dependency_overrides.clear()

@pytest.mark.asyncio
async def test_upload_not_pdf(mock_upload_file_not_pdf, test_client):
    app.dependency_overrides[verify_token] = lambda: {"id": "user123"}
    
    response = test_client.post(
        "/api/v1/documents/upload/",
        data={"title": "Test Doc", "category": "notes", "subject": "CS"},
        files={"file": mock_upload_file_not_pdf}
    )
    assert response.status_code == 400
    assert "Only PDF files are allowed" in response.json()["detail"]

@pytest.mark.asyncio
@patch("app.routers.documents.supabase")
async def test_upload_large_file(mock_supabase, mock_upload_file_large, test_client):
    app.dependency_overrides[verify_token] = lambda: {"id": "user123"}
    
    mock_db_response = MagicMock()
    mock_db_response.data = []  # not admin
    mock_supabase.table().select().eq().execute.return_value = mock_db_response
    
    response = test_client.post(
        "/api/v1/documents/upload/",
        data={"title": "Test Doc", "category": "notes", "subject": "CS"},
        files={"file": mock_upload_file_large}
    )
    assert response.status_code == 413
    assert "File too large" in response.json()["detail"]

@pytest.mark.asyncio
@patch("app.routers.documents.supabase")
@patch("app.routers.documents.upload_to_r2")
@patch("app.routers.documents.extract_pdf_metadata")
async def test_upload_success_as_student(mock_extract_pdf, mock_upload_r2, mock_supabase, mock_upload_file, test_client):
    app.dependency_overrides[verify_token] = lambda: {"id": "user123"}
    
    mock_extract_pdf.return_value = (5, b"thumb_bytes")
    mock_upload_r2.return_value = "https://r2.dev/file.pdf"
    
    # Mock not admin
    mock_admin_response = MagicMock()
    mock_admin_response.data = []
    
    # Mock insert success
    mock_insert_response = MagicMock()
    mock_insert_response.data = [{"id": 1, "title": "Test Doc", "status": "pending"}]
    
    mock_select = MagicMock()
    mock_eq = MagicMock()
    mock_eq.execute.return_value = mock_admin_response
    mock_select.eq.return_value = mock_eq
    
    mock_insert = MagicMock()
    mock_insert.execute.return_value = mock_insert_response
    
    mock_docs_table = MagicMock()
    mock_docs_table.insert.return_value = mock_insert
    
    def side_effect(table_name):
        if table_name == "admins":
            mock_admins_table = MagicMock()
            mock_admins_table.select.return_value = mock_select
            return mock_admins_table
        elif table_name == "documents":
            return mock_docs_table
        return MagicMock()
        
    mock_supabase.table.side_effect = side_effect
    
    response = test_client.post(
        "/api/v1/documents/upload/",
        data={"title": "Test Doc", "category": "notes", "subject": "CS", "status": "approved"},
        files={"file": mock_upload_file}
    )
    
    assert response.status_code == 200
    assert response.json()["id"] == 1
    # Check that insert was called with status pending
    inserted_payload = mock_docs_table.insert.call_args[0][0]
    assert inserted_payload["status"] == "pending"

@pytest.mark.asyncio
@patch("app.routers.documents.supabase")
@patch("app.routers.documents._r2_keys_for_doc")
@patch("app.routers.documents.delete_from_r2")
async def test_delete_document_success(mock_delete_r2, mock_r2_keys, mock_supabase, test_client):
    app.dependency_overrides[verify_admin] = lambda: {"id": "admin1"}
    
    mock_r2_keys.return_value = ["file.pdf", "thumb.jpg"]
    
    # Mock doc exists
    mock_doc_response = MagicMock()
    mock_doc_response.data = [{"file_url": "url", "thumbnail_url": "url"}]
    
    mock_select = MagicMock()
    mock_eq_select = MagicMock()
    mock_eq_select.execute.return_value = mock_doc_response
    mock_select.eq.return_value = mock_eq_select
    
    # Mock delete
    mock_delete = MagicMock()
    mock_eq_delete = MagicMock()
    mock_eq_delete.execute.return_value = MagicMock()
    mock_delete.eq.return_value = mock_eq_delete
    
    def side_effect(table_name):
        mock_table = MagicMock()
        if table_name == "documents":
            mock_table.select.return_value = mock_select
            mock_table.delete.return_value = mock_delete
        return mock_table
        
    mock_supabase.table.side_effect = side_effect
    
    response = test_client.delete(
        "/api/v1/documents/1"
    )
    
    assert response.status_code == 200
    assert response.json()["deleted_id"] == 1
    mock_delete_r2.assert_called_once_with(["file.pdf", "thumb.jpg"])
