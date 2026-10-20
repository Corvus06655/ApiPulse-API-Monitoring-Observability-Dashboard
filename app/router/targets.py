from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import CheckResult, target
from app.schema import TargetCreate, TargetResponse, TargetUpdate
from app.services.checker import check_api


router = APIRouter(prefix="/target", tags=["targets"])


@router.post("/", response_model=TargetResponse, status_code=status.HTTP_201_CREATED)
def create_target(target_data: TargetCreate, db: Session = Depends(get_db)):
    new_target = target(name=target_data.name.strip(), url=str(target_data.url))
    db.add(new_target)
    db.commit()
    db.refresh(new_target)
    return new_target


@router.get("/", response_model=list[TargetResponse])
def get_targets(db: Session = Depends(get_db)):
    return db.query(target).order_by(target.id.desc()).all()


@router.get("/{target_id}", response_model=TargetResponse)
def get_target(target_id: int, db: Session = Depends(get_db)):
    target_record = db.query(target).filter(target.id == target_id).first()
    if target_record is None:
        raise HTTPException(status_code=404, detail="Target not found")
    return target_record


@router.put("/{target_id}", response_model=TargetResponse)
def update_target(
    target_id: int,
    target_data: TargetUpdate,
    db: Session = Depends(get_db),
):
    target_record = db.query(target).filter(target.id == target_id).first()
    if target_record is None:
        raise HTTPException(status_code=404, detail="Target not found")

    target_record.name = target_data.name.strip()
    target_record.url = str(target_data.url)
    db.commit()
    db.refresh(target_record)
    return target_record


@router.delete("/{target_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_target(target_id: int, db: Session = Depends(get_db)):
    target_record = db.query(target).filter(target.id == target_id).first()
    if target_record is None:
        raise HTTPException(status_code=404, detail="Target not found")

    db.query(CheckResult).filter(CheckResult.target_id == target_id).delete(
        synchronize_session=False
    )
    db.delete(target_record)
    db.commit()
    return None


@router.post("/{target_id}/check")
def run_target_check(target_id: int, db: Session = Depends(get_db)):
    target_record = db.query(target).filter(target.id == target_id).first()
    if target_record is None:
        raise HTTPException(status_code=404, detail="Target not found")

    result = check_api(target_record.url)
    check_record = CheckResult(
        target_id=target_record.id,
        status_code=result["status_code"],
        response_time_ms=result["response_time_ms"],
        is_healthy=result["is_healthy"],
        error=result["error"],
    )
    db.add(check_record)
    db.commit()
    db.refresh(check_record)

    return {
        "target_id": target_record.id,
        "target_name": target_record.name,
        **result,
        "check_id": check_record.id,
        "checked_at": check_record.checked_at,
    }


@router.get("/{target_id}/history")
@router.post("/{target_id}/history", include_in_schema=False)
def get_target_history(target_id: int, db: Session = Depends(get_db)):
    target_record = db.query(target).filter(target.id == target_id).first()
    if target_record is None:
        raise HTTPException(status_code=404, detail="Target not found")

    history = (
        db.query(CheckResult)
        .filter(CheckResult.target_id == target_id)
        .order_by(CheckResult.checked_at.desc(), CheckResult.id.desc())
        .all()
    )
    return {
        "target_id": target_record.id,
        "target_name": target_record.name,
        "total_checks": len(history),
        "history": history,
    }


@router.get("/{target_id}/stats")
def get_target_stats(target_id: int, db: Session = Depends(get_db)):
    target_record = db.query(target).filter(target.id == target_id).first()
    if target_record is None:
        raise HTTPException(status_code=404, detail="Target not found")

    checks = db.query(CheckResult).filter(CheckResult.target_id == target_id).all()
    total_checks = len(checks)
    successful_checks = 0
    total_response_time = 0.0

    for check in checks:
        if check.is_healthy:
            successful_checks += 1
        total_response_time += check.response_time_ms

    failed_checks = total_checks - successful_checks
    if total_checks:
        uptime_percentage = round((successful_checks / total_checks) * 100, 2)
        average_response_time = round(total_response_time / total_checks, 2)
    else:
        uptime_percentage = 0
        average_response_time = 0

    return {
        "target_id": target_record.id,
        "target_name": target_record.name,
        "total_checks": total_checks,
        "successful_checks": successful_checks,
        "failed_checks": failed_checks,
        "uptime_percentage": uptime_percentage,
        "average_response_time_ms": average_response_time,
    }
