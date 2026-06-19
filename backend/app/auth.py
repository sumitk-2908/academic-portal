from fastapi import Request, HTTPException, Depends
from supabase import create_client, Client
import httpx
import os
import json
import base64

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
    # Save the raw JWT so downstream admin functions can check the AAL MFA claim
    user_data["raw_jwt"] = token 
    
    return user_data

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

    # 2. Strict AAL2 (MFA) Verification
    # This ensures a user cannot delete files simply by logging in on the homepage.
    token = user.get("raw_jwt")
    if token:
        try:
            # Decode the payload securely (Signature is already verified by Supabase)
            payload_b64 = token.split(".")[1]
            payload_b64 += "=" * ((4 - len(payload_b64) % 4) % 4)
            payload = json.loads(base64.b64decode(payload_b64).decode("utf-8"))
            
            if payload.get("aal") != "aal2":
                raise HTTPException(
                    status_code=403, 
                    detail="Action requires Authenticator MFA (AAL2). Please verify at /portal-admin."
                )
        except HTTPException:
            raise
        except Exception:
            raise HTTPException(status_code=401, detail="Invalid token format")

    return user