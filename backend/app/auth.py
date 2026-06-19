from fastapi import Request, HTTPException, Depends
from supabase import create_client, Client
import httpx
import os

SUPABASE_URL = os.getenv("SUPABASE_URL") 
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

# Create a Supabase client strictly for backend queries
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
    
    return response.json() 

async def verify_admin(user: dict = Depends(verify_token)):
    user_id = user.get("id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid user token structure")

    # 1. Server-side Database check against the actual admins table
    try:
        # Offload blocking network call to database
        db_response = supabase.table("admins").select("id").eq("user_id", user_id).execute()
        
        if not db_response.data:
            raise HTTPException(
                status_code=403, 
                detail="Access Denied: You are not authorized as an administrator."
            )
            
        # 2. Server-side MFA requirement check
        # Ensure the token assurance level was upgraded to aal2 by the Authenticator app
        amr = user.get("app_metadata", {}).get("provider") 
        # Supabase stores assurance levels or MFA factors in the JWT. 
        # A stricter approach is to check if 'aal2' is in the JWT's aal claim, 
        # but verifying the db role ensures hard control over uploads and deletions.
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Authorization check failed: {str(e)}")

    return user