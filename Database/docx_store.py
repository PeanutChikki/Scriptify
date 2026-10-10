"""Store DOCX templates and maintain their numeric references.

The JSON index remains compatible with ``LLM/template_selector.py`` and has
the shape ``{"Table": {"template_name": reference_number}}``. Documents are
kept separately in ``Database/templates/<template_name>.docx``.
"""

from __future__ import annotations

import json
import os
import re
import tempfile
import zipfile
from pathlib import Path
from typing import Any


DATABASE_DIR = Path(__file__).resolve().parent
INDEX_PATH = DATABASE_DIR / "temp_index.json"
TEMPLATES_DIR = DATABASE_DIR / "templates"
_SAFE_NAME = re.compile(r"[^a-zA-Z0-9_-]+")


def _load_index(path: Path = INDEX_PATH) -> dict[str, int]:
    if not path.exists():
        return {}
    try:
        data: Any = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise ValueError(f"Could not read template index {path}: {exc}") from exc
    table = data.get("Table") if isinstance(data, dict) else None
    if not isinstance(table, dict):
        raise ValueError(f"Template index {path} must contain a 'Table' object")
    result: dict[str, int] = {}
    for name, reference in table.items():
        if not isinstance(name, str) or not isinstance(reference, int) or isinstance(reference, bool):
            raise ValueError(f"Invalid template entry in {path}: {name!r}: {reference!r}")
        result[name] = reference
    return result


def _write_index(table: dict[str, int], path: Path = INDEX_PATH) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    payload = json.dumps({"Table": table}, indent=2, ensure_ascii=False) + "\n"
    fd, temporary_name = tempfile.mkstemp(prefix=".temp_index.", suffix=".json", dir=path.parent)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as stream:
            stream.write(payload)
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temporary_name, path)
    finally:
        if os.path.exists(temporary_name):
            os.unlink(temporary_name)


def _template_name(value: str | Path) -> str:
    """Normalize a display name or filename into a safe index key."""
    name = Path(value).stem.strip()
    name = _SAFE_NAME.sub("_", name).strip("_").lower()
    if not name:
        raise ValueError("Template name must contain at least one letter or number")
    return name


def _is_docx(path: Path) -> bool:
    if path.suffix.lower() not in (".docx", ".dotx") or not path.is_file():
        return False
    try:
        with zipfile.ZipFile(path) as archive:
            return "[Content_Types].xml" in archive.namelist() and "word/document.xml" in archive.namelist()
    except (OSError, zipfile.BadZipFile):
        return False


def insert_document(
    source: str | Path,
    name: str | None = None,
    *,
    replace: bool = False,
    index_path: str | Path = INDEX_PATH,
    templates_dir: str | Path = TEMPLATES_DIR,
) -> int:
    """Copy a valid DOCX or DOTX template into the database and return its reference.

    Existing names retain their reference. Replacing an existing document
    requires ``replace=True``; new names receive the next unused positive ID.
    """
    source_path = Path(source).expanduser().resolve()
    if not _is_docx(source_path):
        raise ValueError(f"Not a valid .docx or .dotx document: {source_path}")
    template_name = _template_name(name if name is not None else source_path.name)
    index_file = Path(index_path)
    document_dir = Path(templates_dir)
    table = _load_index(index_file)
    ext = source_path.suffix.lower() or ".docx"
    destination = document_dir / f"{template_name}{ext}"

    if template_name in table:
        if destination.is_file() and not replace:
            raise FileExistsError(f"Template '{template_name}' already exists; pass replace=True to update it")
        reference = table[template_name]
    else:
        reference = max(table.values(), default=0) + 1

    document_dir.mkdir(parents=True, exist_ok=True)
    fd, temporary_name = tempfile.mkstemp(prefix=f".{template_name}.", suffix=".docx", dir=document_dir)
    os.close(fd)
    try:
        with source_path.open("rb") as src, open(temporary_name, "wb") as dst:
            while chunk := src.read(1024 * 1024):
                dst.write(chunk)
            dst.flush()
            os.fsync(dst.fileno())
        previous_document = destination.read_bytes() if destination.is_file() else None
        os.replace(temporary_name, destination)
        if template_name not in table:
            table[template_name] = reference
        try:
            _write_index(table, index_file)
        except Exception:
            if previous_document is None:
                destination.unlink(missing_ok=True)
            else:
                destination.write_bytes(previous_document)
            raise
    finally:
        if os.path.exists(temporary_name):
            os.unlink(temporary_name)
    return reference


def delete_document(
    template: str | int,
    *,
    index_path: str | Path = INDEX_PATH,
    templates_dir: str | Path = TEMPLATES_DIR,
) -> bool:
    """Delete a template by name or reference number; return False if absent."""
    index_file = Path(index_path)
    document_dir = Path(templates_dir)
    table = _load_index(index_file)
    if isinstance(template, int) and not isinstance(template, bool):
        match = next((name for name, reference in table.items() if reference == template), None)
    elif isinstance(template, str):
        if template.strip().isdigit():
            target_ref = int(template.strip())
            match = next((name for name, reference in table.items() if reference == target_ref), None)
        else:
            match = None
        if match is None:
            normalized = _template_name(template)
            match = normalized if normalized in table else None
    else:
        raise TypeError("template must be a template name or integer reference")
    if match is None:
        return False

    (document_dir / f"{match}.docx").unlink(missing_ok=True)
    (document_dir / f"{match}.dotx").unlink(missing_ok=True)
    table.pop(match)
    _write_index(table, index_file)
    return True


def get_document_path(
    template: str | int,
    *,
    index_path: str | Path = INDEX_PATH,
    templates_dir: str | Path = TEMPLATES_DIR,
) -> Path:
    """Resolve a name or reference to its stored DOCX path."""
    table = _load_index(Path(index_path))
    if isinstance(template, int) and not isinstance(template, bool):
        match = next((name for name, reference in table.items() if reference == template), None)
    elif isinstance(template, str):
        if template.strip().isdigit():
            target_ref = int(template.strip())
            match = next((name for name, reference in table.items() if reference == target_ref), None)
        else:
            match = None
        if match is None:
            normalized = _template_name(template)
            match = normalized if normalized in table else None
    else:
        raise TypeError("template must be a template name or integer reference")
    if match is None:
        raise KeyError(f"Unknown template: {template!r}")
    path_docx = Path(templates_dir) / f"{match}.docx"
    path_dotx = Path(templates_dir) / f"{match}.dotx"
    if path_docx.is_file():
        return path_docx
    if path_dotx.is_file():
        return path_dotx
    raise FileNotFoundError(f"Template '{match}' is indexed but missing: {path_docx}")


def get_document_by_index(
    index: int,
    *,
    index_path: str | Path = INDEX_PATH,
    templates_dir: str | Path = TEMPLATES_DIR,
) -> Path:
    """Return the stored DOCX file path for a numeric template reference."""
    if not isinstance(index, int) or isinstance(index, bool):
        raise TypeError("index must be an integer template reference")
    return get_document_path(index, index_path=index_path, templates_dir=templates_dir)


def list_documents(*, index_path: str | Path = INDEX_PATH) -> dict[str, int]:
    """Return a copy of the name-to-reference table."""
    return _load_index(Path(index_path))
