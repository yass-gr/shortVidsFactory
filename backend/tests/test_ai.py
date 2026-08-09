import json
from app.ai import OpenCodeClient, extract_json_blocks, InvalidAIOutput

def test_extract_json_blocks_parses_markdown():
    raw = 'Here you go:\n```json\n{"scripts": []}\n```\n'
    assert extract_json_blocks(raw) == [{"scripts": []}]

def test_extract_json_blocks_errors_when_missing():
    try:
        extract_json_blocks("no code block here")
        assert False, "should raise"
    except InvalidAIOutput:
        pass