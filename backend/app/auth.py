from fastapi import Request, HTTPException, Depends
import httpx
import os

# Your Supabase Project ID is part of your URL
SUPABASE_URL = os.getenv("SUPABASE_URL") 

async def verify_token(request: Request):
    # 1. Extract the "Bearer <token>" from headers
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authentication token")
    
    token = auth_header.split(" ")[1]

    # 2. Ask Supabase if the token is legit
    # We call the 'user' endpoint to validate the JWT
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{SUPABASE_URL}/auth/v1/user",
            headers={"apikey": os.getenv("SUPABASE_ANON_KEY"), "Authorization": f"Bearer {token}"}
        )
    
    if response.status_code != 200:
        raise HTTPException(status_code=401, detail="Could not validate credentials")
    
    return response.json() # Returns the user object