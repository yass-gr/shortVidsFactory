import json
import threading
import time
import uuid
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Callable, Iterator


class JobStatus(str, Enum):
    queued = "queued"
    running = "running"
    done = "done"
    error = "error"


@dataclass
class Job:
    id: str
    kind: str
    status: JobStatus = JobStatus.queued
    progress: float = 0.0
    message: str = ""
    result: Any = None
    error: str | None = None
    _lock: Any = field(default_factory=threading.Lock)


class _JobManager:
    def __init__(self):
        self._jobs: dict[str, Job] = {}

    def submit(self, kind: str, fn: Callable[[dict], Any], args: dict) -> Job:
        job = Job(id=uuid.uuid4().hex[:12], kind=kind)
        self._jobs[job.id] = job

        def runner():
            try:
                with job._lock:
                    job.status = JobStatus.running
                    job.progress = 0.05
                    job.message = "started"
                result = fn(args)
                with job._lock:
                    job.result = result
                    job.status = JobStatus.done
                    job.progress = 1.0
                    job.message = "done"
            except Exception as e:  # noqa
                with job._lock:
                    job.status = JobStatus.error
                    job.error = str(e)
                    job.progress = 1.0
                    job.message = "error"

        threading.Thread(target=runner, daemon=True).start()
        return job

    def get(self, job_id: str) -> Job:
        return self._jobs[job_id]

    def event_stream(self, job_id: str) -> Iterator[str]:
        """Yield SSE events until the job reaches a terminal state."""
        job = self.get(job_id)
        last: tuple | None = None
        while True:
            with job._lock:
                sig = (job.status.value, job.progress, job.message)
                status, progress = job.status, job.progress
                result, error = job.result, job.error
            if sig != last:
                last = sig
                data = {"id": job.id, "status": status.value, "progress": progress}
                if status is JobStatus.done:
                    data["result"] = result
                if error:
                    data["error"] = error
                yield f"event: {status.value}\ndata: {json.dumps(data)}\n\n"
            if status in (JobStatus.done, JobStatus.error):
                break
            time.sleep(0.25)


manager = _JobManager()