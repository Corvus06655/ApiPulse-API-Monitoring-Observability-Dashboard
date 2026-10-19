from apscheduler.schedulers.background import BackgroundScheduler

from app.database import sessionlocal
from app.models import target, CheckResult
from app.services.checker import check_api


scheduler = BackgroundScheduler()


def run_monitoring():
    print("\n--- Automatic monitoring started ---")

    db = sessionlocal()

    try:
        targets = db.query(target).all()

        print(f"Targets found: {len(targets)}")

        for target_record in targets:
            print(f"Checking API: {target_record.url}")

            result = check_api(target_record.url)

            check_record = CheckResult(
                target_id=target_record.id,
                status_code=result["status_code"],
                response_time_ms=result["response_time_ms"],
                is_healthy=result["is_healthy"],
                error=result["error"]
            )

            db.add(check_record)

        db.commit()

        print("Monitoring results saved successfully!")

    except Exception as error:
        db.rollback()
        print(f"Monitoring error: {error}")

    finally:
        db.close()
        print("--- Automatic monitoring finished ---")


def start_scheduler():
    if not scheduler.running:
        scheduler.add_job(
            func=run_monitoring,
            trigger="interval",
            seconds=60,
            id="api_monitoring",
            replace_existing=True,
            max_instances=1
        )

        scheduler.start()

        print("ApiPulse scheduler started!")
        print("Monitoring interval: 60 seconds")


def stop_scheduler():
    if scheduler.running:
        scheduler.shutdown(wait=False)
        print("ApiPulse scheduler stopped!")