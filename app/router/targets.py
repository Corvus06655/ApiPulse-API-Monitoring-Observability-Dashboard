from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import CheckResult, User, target
from app.router.auth import get_current_user
from app.schema import TargetCreate, TargetResponse, TargetUpdate
from app.services.checker import check_api

router = APIRouter(prefix="/target", tags=["targets"])


def _get_owned_target(target_id: int, user_id: int, db: Session) -> target:
    record = db.query(target).filter(target.id == target_id, target.user_id == user_id).first()
    if record is None:
        raise HTTPException(status_code=404, detail="Target not found")
    return record


@router.post("/", response_model=TargetResponse, status_code=status.HTTP_201_CREATED)
def create_target(target_data: TargetCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    new_target = target(user_id=current_user.id, name=target_data.name.strip(), url=str(target_data.url))
    db.add(new_target)
    db.commit()
    db.refresh(new_target)
    return new_target


@router.get("/", response_model=list[TargetResponse])
def get_targets(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(target).filter(target.user_id == current_user.id).order_by(target.id.desc()).all()


@router.get("/{target_id}", response_model=TargetResponse)
def get_target(target_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return _get_owned_target(target_id, current_user.id, db)


@router.put("/{target_id}", response_model=TargetResponse)
def update_target(target_id: int, target_data: TargetUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    record = _get_owned_target(target_id, current_user.id, db)
    record.name = target_data.name.strip()
    record.url = str(target_data.url)
    db.commit()
    db.refresh(record)
    return record


@router.delete("/{target_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_target(target_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    record = _get_owned_target(target_id, current_user.id, db)
    db.query(CheckResult).filter(CheckResult.target_id == target_id).delete(synchronize_session=False)
    db.delete(record)
    db.commit()
    return None


@router.post("/{target_id}/check")
def run_target_check(target_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    record = _get_owned_target(target_id, current_user.id, db)
    result = check_api(record.url)
    check_record = CheckResult(target_id=record.id, status_code=result["status_code"],
        response_time_ms=result["response_time_ms"], is_healthy=result["is_healthy"], error=result["error"])
    db.add(check_record)
    db.commit()
    db.refresh(check_record)
    return {"target_id": record.id, "target_name": record.name, **result,
        "check_id": check_record.id, "checked_at": check_record.checked_at}


@router.get("/{target_id}/history")
def get_target_history(target_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    record = _get_owned_target(target_id, current_user.id, db)
    history = db.query(CheckResult).filter(CheckResult.target_id == target_id).order_by(
        CheckResult.checked_at.desc(), CheckResult.id.desc()).all()
    return {"target_id": record.id, "target_name": record.name, "total_checks": len(history), "history": history}


@router.get("/{target_id}/stats")
def get_target_stats(target_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    record = _get_owned_target(target_id, current_user.id, db)
    checks = db.query(CheckResult).filter(CheckResult.target_id == target_id).all()
    total = len(checks)
    successful = sum(1 for item in checks if item.is_healthy)
    average = round(sum(item.response_time_ms for item in checks) / total, 2) if total else 0
    return {"target_id": record.id, "target_name": record.name, "total_checks": total,
        "successful_checks": successful, "failed_checks": total - successful,
        "uptime_percentage": round(successful / total * 100, 2) if total else 0,
        "average_response_time_ms": average}
