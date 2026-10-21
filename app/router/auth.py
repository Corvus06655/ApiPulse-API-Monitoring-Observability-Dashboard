from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.auth_schema import TokenResponse, UserLogin, UserRegister, UserResponse
from app.database import get_db
from app.models import User, target
from app.security import hash_password, verify_password
from app.token import create_access_token, verify_token

router = APIRouter(prefix="/auth", tags=["Authentication"])
security = HTTPBearer(auto_error=False)


def get_current_user(
    bearer_data: HTTPAuthorizationCredentials | None = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    if bearer_data is None:
        raise HTTPException(status_code=401, detail="Authentication required. Provide a Bearer token.", headers={"WWW-Authenticate": "Bearer"})
    payload = verify_token(bearer_data.credentials)
    if not payload or not payload.get("sub"):
        raise HTTPException(status_code=401, detail="Invalid or expired token", headers={"WWW-Authenticate": "Bearer"})
    try:
        user_id = int(payload["sub"])
    except (ValueError, TypeError):
        raise HTTPException(status_code=401, detail="Invalid token subject", headers={"WWW-Authenticate": "Bearer"})

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=401, detail="User not found", headers={"WWW-Authenticate": "Bearer"})
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is inactive")
    return user


@router.post("/register", response_model=UserResponse, status_code=201)
def register_user(user: UserRegister, db: Session = Depends(get_db)):
    email = user.email.strip().lower()
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=409, detail="Email already registered")

    new_user = User(email=email, hashed_password=hash_password(user.password))
    db.add(new_user)
    try:
        db.commit()
    except IntegrityError as error:
        db.rollback()
        raise HTTPException(status_code=409, detail="Email already registered") from error
    db.refresh(new_user)

    # Preserve pre-auth demo targets: the first new account adopts unowned legacy records.
    db.query(target).filter(target.user_id.is_(None)).update(
        {target.user_id: new_user.id}, synchronize_session=False
    )
    db.commit()
    return new_user


@router.post("/login", response_model=TokenResponse)
def login_user(user: UserLogin, db: Session = Depends(get_db)):
    email = user.email.strip().lower()
    existing_user = db.query(User).filter(User.email == email).first()
    if existing_user is None or not verify_password(user.password, existing_user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not existing_user.is_active:
        raise HTTPException(status_code=403, detail="Account is inactive")
    return {"access_token": create_access_token({"sub": str(existing_user.id)}), "token_type": "bearer"}


@router.get("/me", response_model=UserResponse)
def read_current_user(current_user: User = Depends(get_current_user)):
    return current_user
