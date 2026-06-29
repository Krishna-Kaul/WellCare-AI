from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import hash_password, verify_password, create_access_token
from app.models.user import User
from app.schemas.auth import SignupRequest, LoginRequest, TokenResponse, UserInfo

router = APIRouter()

@router.post("/signup", response_model=TokenResponse, status_code=201)
def signup(request: SignupRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == request.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    new_user = User(
        name          = request.name,
        email         = request.email,
        phone         = request.phone,
        role          = request.role,
        password_hash = hash_password(request.password),
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    token = create_access_token(data={"sub": new_user.email})
    return TokenResponse(
        access_token = token,
        role         = new_user.role.value,
        name         = new_user.name,
        user         = UserInfo.model_validate(new_user),
    )


@router.post("/login", response_model=TokenResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == request.email).first()
    if not user or not verify_password(request.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token(data={"sub": user.email})
    return TokenResponse(
        access_token = token,
        role         = user.role.value,
        name         = user.name,
        user         = UserInfo.model_validate(user),
    )
