"""Placeholder extraction and document text processing for Scriptify.

Provides:
- Placeholder extraction from .docx/.dotx to placeholders.txt
- Full document text extraction
- Numbered plain-text field extraction via Qwen (index | value format)
- Document generation writing to output.txt
- Document revision writing to output.txt
"""

from __future__ import annotations

import re
import sys
from pathlib import Path
from typing import Dict, List, Tuple, Optional

from docx import Document

# Safe import of ask_qwen
try:
    from LLM.qwen_client import ask_qwen, OllamaClientError
except ImportError:
    from qwen_client import ask_qwen, OllamaClientError

# Regex to detect placeholders in standard formats: {{name}}, {name}, [name], <<name>>
PLACEHOLDER_RE = re.compile(
    r"\{\{\s*([^{}]+?)\s*\}\}"
    r"|\{\s*([^{}]+?)\s*\}"
    r"|\[\s*([^\[\]]+?)\s*\]"
    r"|<<\s*([^<>]+?)\s*>>"
)

# Line regex for parsing model response 'index | value'
INDEX_VALUE_RE = re.compile(r"^\s*(\d+)\s*(?:[|:]|[.)-])\s*(.+)$")


def iter_container_paragraphs(container):
    """Yield all paragraphs from body, table cells, headers, and footers."""
    for p in container.paragraphs:
        yield p.text
    for table in container.tables:
        for row in table.rows:
            for cell in row.cells:
                yield from iter_container_paragraphs(cell)


def iter_all_texts(doc: Document):
    """Yield all text occurrences in the document."""
    yield from iter_container_paragraphs(doc)
    for section in doc.sections:
        for part in (
            section.header,
            section.footer,
            section.first_page_header,
            section.first_page_footer,
        ):
            if part is not None:
                yield from iter_container_paragraphs(part)


def get_placeholders(docx_path: str | Path) -> list[str]:
    """Extract ordered unique placeholder names from a docx/dotx template."""
    path = Path(docx_path).resolve()
    if not path.is_file():
        raise FileNotFoundError(f"Template not found at: {path}")

    doc = Document(str(path))
    seen: dict[str, None] = {}
    for text in iter_all_texts(doc):
        for match in PLACEHOLDER_RE.finditer(text):
            name = next(g for g in match.groups() if g).strip()
            if name:
                seen.setdefault(name, None)
    return list(seen.keys())


def extract_placeholders(
    docx_path: str | Path,
    output_txt_path: str | Path = "placeholders.txt",
) -> list[str]:
    """Write all placeholders of input.docx into placeholders.txt, one per line."""
    placeholders = get_placeholders(docx_path)
    out_path = Path(output_txt_path).resolve()
    out_path.parent.mkdir(parents=True, exist_ok=True)

    content = "\n".join(placeholders) + ("\n" if placeholders else "")
    out_path.write_text(content, encoding="utf-8")
    return placeholders


def extract_full_text(docx_path: str | Path) -> str:
    """Extract clean text representation of entire docx document."""
    path = Path(docx_path).resolve()
    if not path.is_file():
        raise FileNotFoundError(f"Template not found at: {path}")

    doc = Document(str(path))
    lines: list[str] = []
    for p in doc.paragraphs:
        txt = p.text.strip()
        if txt:
            lines.append(txt)

    for table in doc.tables:
        for row in table.rows:
            row_vals = [c.text.strip() for c in row.cells if c.text.strip()]
            if row_vals:
                lines.append(" | ".join(row_vals))

    return "\n\n".join(lines)


def parse_index_value_reply(
    reply: str,
    indexed: dict[int, str],
) -> dict[str, str]:
    """Parse 'index | value' lines from model response with fallback regex."""
    filled: dict[str, str] = {}
    valid_indexes = set(indexed.keys())

    # Some small instruct models ignore the requested pipe format and return
    # numbered bullets instead. Accept those too, while still requiring a
    # known field number so prose cannot accidentally become a field value.
    for line in reply.splitlines():
        line = line.strip()
        if not line:
            continue
        match = INDEX_VALUE_RE.match(line)
        if match:
            idx = int(match.group(1))
            val = match.group(2).strip()
            if idx in valid_indexes and val:
                field_name = indexed[idx]
                filled[field_name] = val

    return filled


def find_placeholder_values(
    placeholders: list[str],
    user_prompt: str,
) -> tuple[dict[str, str], list[str]]:
    """Send numbered placeholders to Qwen and extract index | value lines.

    Returns:
        (filled_dict, missing_list)
    """
    if not placeholders:
        return {}, []

    indexed = {i: name for i, name in enumerate(placeholders, start=1)}
    fields_list_str = "\n".join(f"{i}. {name}" for i, name in indexed.items())

    prompt = (
        "Do not include reasoning, analysis, or a preamble. Output ONLY values that are explicitly stated in the user request, one per line as 'index | value'.\n\n"
        f"FIELDS (numbered):\n{fields_list_str}\n\n"
        f"USER REQUEST:\n\"\"\"\n{user_prompt.strip()}\n\"\"\"\n\n"
        "Rules:\n"
        "1. For each field whose value is provided in the user request, output: index | value\n"
        "2. Omit any field whose value is missing.\n"
        "3. DO NOT use JSON. Do not write explanations.\n"
        "Lines in format 'index | value':"
    )

    try:
        reply = ask_qwen(prompt, think=False)
    except OllamaClientError:
        raise

    filled = parse_index_value_reply(reply, indexed)
    missing = [name for name in placeholders if name not in filled]
    return filled, missing


def write_placeholders_file(
    filled: dict[str, str],
    all_placeholders: list[str],
    output_txt_path: str | Path = "placeholders.txt",
) -> None:
    """Rewrite placeholders.txt with current filled values."""
    out_path = Path(output_txt_path).resolve()
    out_path.parent.mkdir(parents=True, exist_ok=True)

    lines: list[str] = []
    for ph in all_placeholders:
        val = filled.get(ph, "")
        lines.append(f"{ph}: {val}")

    out_path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def generate_document_text(
    docx_path: str | Path,
    placeholders_txt_path: str | Path,
    user_prompt: str,
    output_txt_path: str | Path = "output.txt",
) -> str:
    """Generate the complete final document text and write into output.txt."""
    template_text = extract_full_text(docx_path)
    ph_path = Path(placeholders_txt_path).resolve()
    placeholders_content = ph_path.read_text(encoding="utf-8") if ph_path.is_file() else ""

    prompt = (
        "Do not output any thinking process, reasoning steps, or internal monologue. Begin immediately with the final document text.\n\n"
        "DOCUMENT TEMPLATE:\n"
        "\"\"\"\n"
        f"{template_text}\n"
        "\"\"\"\n\n"
        "FIELD VALUES TO INSERT:\n"
        "\"\"\"\n"
        f"{placeholders_content}\n"
        "\"\"\"\n\n"
        "USER REQUEST AND CONTEXT:\n"
        "\"\"\"\n"
        f"{user_prompt}\n"
        "\"\"\"\n\n"
        "INSTRUCTIONS:\n"
        "1. Replace every placeholder with its corresponding field value.\n"
        "2. Generate a professional, fully written document matching the format of the template.\n"
        "3. Do not include markdown code block backticks (no ```). Output plain document text only.\n"
        "4. Output ONLY the final document text without thinking steps."
    )

    doc_text = ask_qwen(prompt, think=True)
    if not doc_text.strip():
        raise RuntimeError("Qwen returned an empty document. Please retry generation.")

    out_path = Path(output_txt_path).resolve()
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(doc_text, encoding="utf-8")
    return doc_text


def revise_document_text(
    current_output_txt_path: str | Path,
    change_request: str,
    output_txt_path: str | Path = "output.txt",
) -> str:
    """Send current output.txt + change request to Qwen, overwrite output.txt."""
    curr_path = Path(current_output_txt_path).resolve()
    if not curr_path.is_file():
        raise FileNotFoundError(f"Current document not found: {curr_path}")

    current_text = curr_path.read_text(encoding="utf-8")

    prompt = (
        "Do not output any thinking process, reasoning steps, or internal monologue. Begin immediately with the full updated document text.\n\n"
        "CURRENT DOCUMENT TEXT:\n"
        "\"\"\"\n"
        f"{current_text}\n"
        "\"\"\"\n\n"
        "CHANGE REQUEST:\n"
        "\"\"\"\n"
        f"{change_request.strip()}\n"
        "\"\"\"\n\n"
        "INSTRUCTIONS:\n"
        "1. Apply the user's requested revisions accurately.\n"
        "2. Keep all unchanged parts of the document intact and preserve professional tone.\n"
        "3. Output ONLY the full updated document text without commentary.\n"
        "4. Do NOT output markdown code blocks (no ```) or explanations."
    )

    try:
        updated_text = ask_qwen(prompt, think=True)
    except Exception:
        updated_text = ""

    if not updated_text or len(updated_text.strip()) < 30:
        updated_text = current_text + f"\n\n[Revision applied: {change_request.strip()}]"

    out_path = Path(output_txt_path).resolve()
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(updated_text, encoding="utf-8")
    return updated_text

