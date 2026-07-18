from fastapi import Request, HTTPException, Depends
from supabase import create_client, Client
import httpx
import os
import json
import base64
from jose import jwt

SUPABASE_URL = os.getenv("SUPABASE_URL") 
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY) if SUPABASE_URL and SUPABASE_KEY else None

async def verify_token(request: Request):
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authentication token")
    
    token = auth_header.split(" ")[1]

    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{SUPABASE_URL}/auth/v1/user",
            headers={"apikey": SUPABASE_KEY, "Authorization": f"Bearer {token}"}
        )
    
    if response.status_code != 200:
        raise HTTPException(status_code=401, detail="Could not validate credentials")
    
    user_data = response.json()
    
    
    if user_data.get("email") and not user_data.get("email_confirmed_at"):
        raise HTTPException(
            status_code=403, 
            detail="Account restricted: Email verification required. Please check your inbox."
        )
    
    
    user_data["raw_jwt"] = token 
    
    return user_data


def assert_aal2(user: dict) -> None:
    """
    Decode the raw JWT and assert the session has AAL2 (MFA verified).
    Raises HTTPException 403 if it does not.
    """
    token = user.get("raw_jwt")
    if not token:
        # SECURE: Fail immediately if the token is missing. No bypass allowed.
        raise HTTPException(status_code=401, detail="Authentication token required for MFA validation.")
        
    try:
        # Decode the payload to check AAL claim (token validity already verified by Supabase API in verify_token)
        payload = jwt.get_unverified_claims(token)
        
        # SECURE: Strictly enforce AAL2
        if payload.get("aal") != "aal2":
            raise HTTPException(
                status_code=403, 
                detail="This action requires Authenticator MFA (AAL2). Please verify at /portal-admin."
            )
    except HTTPException:
        raise
    except Exception as e:
        print(f"Token validation failed: {e}")
        raise HTTPException(status_code=401, detail="Invalid or tampered token")


async def verify_admin(user: dict = Depends(verify_token)):
    
    user_id = user.get("id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid user token structure")

    # 1. Check if user belongs to the admins table
    try:
        db_response = supabase.table("admins").select("id").eq("user_id", user_id).execute()
        if not db_response.data:
            raise HTTPException(status_code=403, detail="Access Denied: Not authorized as an administrator.")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Authorization check failed: {str(e)}")

    # 2. STRICT AAL2 (MFA) VERIFICATION
    assert_aal2(user)

    return user