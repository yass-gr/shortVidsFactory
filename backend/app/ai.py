import json
import os
import re
import subprocess
from pathlib import Path


class InvalidAIOutput(Exception):
    pass


_json_re = re.compile(r"```json\s*(.*?)\s*```", re.DOTALL)


def extract_json_blocks(stdout: str) -> list[dict]:
    blocks = []
    for m in _json_re.finditer(stdout):
        blocks.append(json.loads(m.group(1)))
    if not blocks:
        raise InvalidAIOutput("No JSON block found in model output")
    return blocks


class OpenCodeClient:
    def __init__(self, binary: str | None = None):
        self.binary = binary or os.environ.get("SHORTSVIDS_OPENCODE_BIN", "opencode")

    def run(self, prompt: str, cwd: Path, agent: str | None = None) -> str:
        cmd = [self.binary, "run", "--format", "json", "--dir", str(cwd)]
        if os.environ.get("SHORTSVIDS_OPENCODE_MODEL"):
            cmd += ["--model", os.environ["SHORTSVIDS_OPENCODE_MODEL"]]
        if agent:
            cmd += ["--agent", agent]
        cmd.append(prompt)
        out = subprocess.run(cmd, capture_output=True, text=True, cwd=str(cwd), timeout=600)
        if out.returncode != 0:
            raise InvalidAIOutput(out.stderr[-2000:])
        return out.stdout