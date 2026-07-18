from fastapi import APIRouter, Depends, HTTPException
from app.auth import verify_token, supabase

router = APIRouter()

@router.delete("/me")
async def delete_my_account(user: dict = Depends(verify_token)):
    """
    Deletes the currently authenticated user's account permanently.
    This action requires the user to be fully authenticated.
    """
    user_id = user.get("id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid user session.")

    try:
        # Supabase auth.admin.delete_user requires the service_role key, 
        # which our backend supabase client is initialized with.
        # This will delete the auth identity, and due to our ON DELETE CASCADE
        # foreign keys, it will also wipe their data from public tables.
        response = supabase.auth.admin.delete_user(user_id)
        
        return {"status": "success", "message": "Account deleted permanently."}
    except Exception as e:
        print(f"Failed to delete user {user_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete account. Please contact support if the issue persists.")
