"""Template selector module for Scriptify.

Uses local Qwen through `llm.qwen_client.ask_qwen` to identify the best matching
template for a given user prompt. Plain text and numbered lists only (NO JSON).
"""

from __future__ import annotations

import json
import re
import shutil
import sys
from pathlib import Path
from typing import Optional

# Support importing regardless of working directory
SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent
DATABASE_DIR = PROJECT_ROOT / "Database"
TABLE_FILE = DATABASE_DIR / "temp_index.json"

try:
    from LLM.qwen_client import ask_qwen, OllamaClientError
except ImportError:
    from qwen_client import ask_qwen, OllamaClientError


class TemplateSelectionError(Exception):
    """Raised when template selection fails or model reply cannot be parsed."""
    pass


def load_table(path: Path = TABLE_FILE) -> dict[str, int]:
    """Load the template index table from JSON without exposing JSON to the LLM."""
    if not path.exists():
        return {}
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return data.get("Table", {})


def get_numbered_template_list(table: dict[str, int]) -> str:
    """Format template table into a clean numbered list: '1. template_name'."""
    # Invert to sort by index number
    sorted_items = sorted(table.items(), key=lambda item: item[1])
    lines = [f"{idx}. {name.replace('_', ' ').title()} ({name})" for name, idx in sorted_items]
    return "\n".join(lines)


def parse_index_from_reply(reply: str, valid_indexes: set[int]) -> Optional[int]:
    """Robust regex extraction of the index number from model response."""
    # Find all integer numbers in the response
    numbers = [int(n) for n in re.findall(r"\b\d+\b", reply)]
    if not numbers:
        return None

    # Check from back to front (since final answers usually appear at the end)
    for num in reversed(numbers):
        if num in valid_indexes:
            return num

    return None


def detect_template(user_prompt: str, table_path: Path = TABLE_FILE) -> Optional[int]:
    """Send numbered template list to Qwen and return the matched template index.

    Retries once if the model returns an invalid or unparseable index.
    Returns None if both attempts fail (triggering manual selection).
    """
    table = load_table(table_path)
    if not table:
        raise TemplateSelectionError(f"No templates registered in {table_path}")

    valid_indexes = set(table.values())
    numbered_list = get_numbered_template_list(table)

    prompt = (
        "You are an AI assistant helping select the best document template.\n\n"
        "Available templates:\n"
        f"{numbered_list}\n\n"
        f'User request: "{user_prompt.strip()}"\n\n'
        "Choose the single most suitable template number from the list above for this request.\n"
        "Reply with ONLY the index number and nothing else. No explanation, no words."
    )

    # Attempt 1
    try:
        raw_output = ask_qwen(prompt)
        matched = parse_index_from_reply(raw_output, valid_indexes)
        if matched is not None:
            return matched
    except OllamaClientError:
        raise
    except Exception as exc:
        pass

    # Attempt 2 (Retry once with stricter instruction)
    retry_prompt = (
        "Available templates:\n"
        f"{numbered_list}\n\n"
        f'User request: "{user_prompt.strip()}"\n\n'
        "Reply with ONLY the single digit/number of the best template. Example reply: 1"
    )

    try:
        raw_output = ask_qwen(retry_prompt)
        matched = parse_index_from_reply(raw_output, valid_indexes)
        if matched is not None:
            return matched
    except OllamaClientError:
        raise
    except Exception:
        pass

    # Unparseable after retry: return None to allow manual selection
    return None


def select_and_copy_template(
    user_prompt: str,
    manual_index: Optional[int] = None,
    output_docx: Path = PROJECT_ROOT / "input.docx",
    table_path: Path = TABLE_FILE,
    templates_dir: Path = DATABASE_DIR / "templates",
) -> tuple[int, str, Path]:
    """Select matching template (or use manual index), copy to input.docx."""
    table = load_table(table_path)
    if not table:
        raise TemplateSelectionError("Template index table is empty.")

    inv_table = {v: k for k, v in table.items()}

    index = manual_index
    if index is None:
        index = detect_template(user_prompt, table_path=table_path)

    if index is None or index not in inv_table:
        raise TemplateSelectionError(
            "Could not automatically match a template. Please select one manually."
        )

    template_name = inv_table[index]

    # Find the template file (.docx or .dotx)
    docx_file = templates_dir / f"{template_name}.docx"
    dotx_file = templates_dir / f"{template_name}.dotx"

    source_file: Optional[Path] = None
    if docx_file.is_file():
        source_file = docx_file
    elif dotx_file.is_file():
        source_file = dotx_file
    else:
        # Fallback to LLM/input.docx if available
        fallback = PROJECT_ROOT / "LLM" / "input.docx"
        if fallback.is_file():
            source_file = fallback
        else:
            raise FileNotFoundError(
                f"Template file '{template_name}' not found in {templates_dir}"
            )

    output_docx.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy(source_file, output_docx)

    return index, template_name, output_docx


if __name__ == "__main__":
    test_prompt = "I need to take 3 days off next week due to fever"
    if len(sys.argv) > 1:
        test_prompt = " ".join(sys.argv[1:])
    print(f"Testing with prompt: {test_prompt}")
    idx = detect_template(test_prompt)
    print(f"Detected template index: {idx}")
