
import time
import requests


def check_api(url: str) -> dict:
    start_time = time.perf_counter()

    try:
        response = requests.get(
            url,
            timeout=10,
            allow_redirects=True
        )

        response_time = round(
            (time.perf_counter() - start_time) * 1000,
            2
        )

        if 200 <= response.status_code < 400:
            is_healthy = True
        else:
            is_healthy = False

        return {
            "url": url,
            "status_code": response.status_code,
            "response_time_ms": response_time,
            "is_healthy": is_healthy,
            "error": None
        }

    except requests.RequestException as error:

        response_time = round(
            (time.perf_counter() - start_time) * 1000,
            2
        )

        return {
            "url": url,
            "status_code": None,
            "response_time_ms": response_time,
            "is_healthy": False,
            "error": str(error)
        }
