import time
from app.jobs import manager, JobStatus

def test_job_runs_and_stores_result():
    def work(ctx):
        time.sleep(0.01)
        return {"total": 42}
    job = manager.submit("probe", work, {})
    for _ in range(100):
        if manager.get(job.id).status == JobStatus.done:
            break
        time.sleep(0.01)
    assert manager.get(job.id).result == {"total": 42}