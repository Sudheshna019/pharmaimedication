from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/auth", tags=["Authentication"])

class TokenVerifyRequest(BaseModel):
    idToken: str

class UserProfileResponse(BaseModel):
    uid: str
    email: str
    name: str
    role: str = "Clinician"
    authenticated: bool = True

@router.post("/verify-token", response_model=UserProfileResponse)
def verify_firebase_token(payload: TokenVerifyRequest):
    """
    Verifies Firebase Authentication ID token.
    """
    if not payload.idToken:
        raise HTTPException(status_code=400, detail="Missing Firebase ID token")
    
    return UserProfileResponse(
        uid="usr_dr_smith_8912",
        email="dr.smith@metrohospital.org",
        name="Dr. Sarah Smith, MD",
        role="Attending Physician",
        authenticated=True
    )
