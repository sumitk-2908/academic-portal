from fastapi import Request, HTTPException, Depends
import httpx
import os

# Your Supabase Project ID is part of your URL
SUPABASE_URL = os.getenv("SUPABASE_URL") 

ALLOWED_ADMINS = [
    "sumitk240806@gmail.com","anonymousperson123.08@gmail.com"
]

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
            headers={"apikey": os.getenv("SUPABASE_KEY"), "Authorization": f"Bearer {token}"}
        )
    
    if response.status_code != 200:
        raise HTTPException(status_code=401, detail="Could not validate credentials")
    
    return response.json() # Returns the user object

async def verify_admin(user: dict = Depends(verify_token)):
    # Check if the logged-in user's email is in our authorized list
    if user.get("email") not in ALLOWED_ADMINS:
        raise HTTPException(
            status_code=403, 
            detail="Access Denied: You are not authorized as an administrator."
        )
    return user