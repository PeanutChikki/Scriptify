"""Scriptify FastAPI Backend Server.

Implements all 5 screens and application flow steps in exact order:
1. Template Library (cards from temp_index.json and Database/templates, upload .dotx only)
2. Prompt Input & Template Selection (Qwen plain-text numbered template selection, retry once, manual fallback)
3. Placeholder Extraction (doc_to_txt.py -> placeholders.txt)
4. Filling Placeholders loop (index | value plain text extraction until every placeholder has a value)
5. Document Generation (output.txt)
6. Preview & Revisions loop ("Any changes?" -> Qwen updates output.txt)
7. Download (text_to_pdf.py or text_to_doc.py, browser download, session reset)
"""

from __future__ import annotations

import os
import shutil
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, File, Form, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, PlainTextResponse
from pydantic import BaseModel

# Add project root to sys.path so modules resolve anywhere
ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from Database.docx_store import (
    delete_document,
    get_document_by_index,
    get_document_path,
    insert_document,
    list_documents,
)
from LLM.doc_to_txt import (
    extract_full_text,
    extract_placeholders,
    find_placeholder_values,
    generate_document_text,
    get_placeholders,
    revise_document_text,
    write_placeholders_file,
)
from LLM.qwen_client import OllamaClientError, ask_qwen, check_ollama_available
from LLM.template_selector import (
    TemplateSelectionError,
    detect_template,
    load_table,
    select_and_copy_template,
)
from LLM.txt_to_doc import txt_to_doc
from LLM.txt_to_pdf import txt_to_pdf

# App instantiation
app = FastAPI(
    title="Scriptify API",
    description="Local AI-Powered Document Generator",
    version="1.0.0",
)

# Enable CORS for Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Standard paths
DATABASE_DIR = ROOT_DIR / "Database"
TEMPLATES_DIR = DATABASE_DIR / "templates"
INDEX_FILE = DATABASE_DIR / "temp_index.json"
WORKING_DIR = ROOT_DIR


class SessionState:
    """In-memory session state for the active document flow."""

    def __init__(self):
        self.reset()

    def reset(self):
        self.user_prompt: str = ""
        self.template_id: Optional[int] = None
        self.template_name: str = ""
        self.placeholders: List[str] = []
        self.filled_values: Dict[str, str] = {}
        self.missing_placeholders: List[str] = []
        self.output_text: str = ""
        self.revision_history: List[Dict[str, str]] = []

        # File paths
        self.input_docx: Path = WORKING_DIR / "input.docx"
        self.placeholders_txt: Path = WORKING_DIR / "placeholders.txt"
        self.output_txt: Path = WORKING_DIR / "output.txt"
        self.output_docx: Path = WORKING_DIR / "output.docx"
        self.output_pdf: Path = WORKING_DIR / "output.pdf"


session = SessionState()


# Pydantic Schemas
class StartPromptRequest(BaseModel):
    prompt: str
    template_id: Optional[int] = None


class FillPlaceholdersRequest(BaseModel):
    answers: Dict[str, str]
    extra_context: Optional[str] = None


class ReviseRequest(BaseModel):
    instruction: str


# ==============================================================================
# Health and System Status
# ==============================================================================


@app.get("/api/health")
def get_health():
    is_ready, message = check_ollama_available()
    return {
        "status": "ok" if is_ready else "degraded",
        "ollama_ready": is_ready,
        "message": message,
    }


# ==============================================================================
# Screen 1: Template Library
# ==============================================================================


@app.get("/api/templates")
def get_templates():
    """List cards for all templates read from Database/ and temp_index.json."""
    table = load_table(INDEX_FILE)
    templates = []

    for name, idx in sorted(table.items(), key=lambda x: x[1]):
        # Look for template file
        filename = f"{name}.docx"
        path = TEMPLATES_DIR / filename
        if not path.is_file():
            filename = f"{name}.dotx"
            path = TEMPLATES_DIR / filename

        ph_list = []
        if path.is_file():
            try:
                ph_list = get_placeholders(path)
            except Exception:
                ph_list = []

        display_name = name.replace("_", " ").title()
        templates.append(
            {
                "id": str(idx),
                "index": idx,
                "name": display_name,
                "key": name,
                "description": f"Standard {display_name} template.",
                "filename": filename if path.is_file() else "",
                "placeholders": ph_list,
                "createdAt": "2026-10-01T10:00:00Z",
            }
        )

    return templates


@app.post("/api/templates/upload")
async def upload_template(
    file: UploadFile = File(...),
    name: Optional[str] = Form(None),
    description: Optional[str] = Form(""),
):
    """Upload a Word template (.dotx only), validate, save to database/, update temp_index.json."""
    original_filename = file.filename or "template.dotx"

    # Strictly validate .dotx extension as per requirement
    if not original_filename.lower().endswith(".dotx"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file format. Only Microsoft Word template files (.dotx) are permitted.",
        )

    # Save uploaded file temporarily to validate and insert
    temp_dir = DATABASE_DIR / ".tmp_uploads"
    temp_dir.mkdir(parents=True, exist_ok=True)
    temp_path = temp_dir / original_filename

    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Base name for normalization
        chosen_name = name.strip() if name and name.strip() else Path(original_filename).stem

        # Insert into database/docx_store
        new_index = insert_document(
            temp_path,
            name=chosen_name,
            replace=True,
            index_path=INDEX_FILE,
            templates_dir=TEMPLATES_DIR,
        )

        saved_path = get_document_by_index(new_index, index_path=INDEX_FILE, templates_dir=TEMPLATES_DIR)
        placeholders = get_placeholders(saved_path)

        return {
            "id": str(new_index),
            "index": new_index,
            "name": chosen_name.replace("_", " ").title(),
            "key": saved_path.stem,
            "filename": saved_path.name,
            "placeholders": placeholders,
            "description": description or f"Custom uploaded template: {chosen_name}",
        }
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process template: {exc}",
        ) from exc
    finally:
        if temp_path.exists():
            temp_path.unlink()


@app.delete("/api/templates/{template_id}")
def delete_template_endpoint(template_id: str):
    """Delete a template by ID index or name, removing it from Database/ and temp_index.json."""
    try:
        ref: int | str = int(template_id) if template_id.strip().isdigit() else template_id.strip()
        success = delete_document(
            ref,
            index_path=INDEX_FILE,
            templates_dir=TEMPLATES_DIR,
        )
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Template '{template_id}' was not found.",
            )

        # Clear active session template if it was the one deleted
        if session.template_id is not None and (
            str(session.template_id) == str(template_id).strip()
            or session.template_name == str(template_id).strip()
        ):
            session.template_id = None
            session.template_name = ""

        return {
            "status": "ok",
            "message": f"Template '{template_id}' deleted successfully.",
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete template: {exc}",
        ) from exc


# ==============================================================================
# Screen 2 & Step 3: Prompt Input & Template Selection (backend)
# ==============================================================================


@app.post("/api/session/select-template")
def select_template(req: StartPromptRequest):
    """Send user_prompt to Qwen, pick template, copy to input.docx, extract placeholders."""
    if not req.prompt or not req.prompt.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User prompt cannot be empty.",
        )

    # Reset previous session state
    session.reset()
    session.user_prompt = req.prompt.strip()

    # Step 3: Template Selection
    try:
        index, template_name, copied_path = select_and_copy_template(
            user_prompt=session.user_prompt,
            manual_index=req.template_id,
            output_docx=session.input_docx,
            table_path=INDEX_FILE,
            templates_dir=TEMPLATES_DIR,
        )
    except TemplateSelectionError as err:
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "status": "manual_selection_required",
                "message": str(err),
            },
        )
    except OllamaClientError as err:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Local LLM error: {err}",
        ) from err
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to select template: {err}",
        ) from err

    session.template_id = index
    session.template_name = template_name

    # Step 4: Placeholder Extraction to placeholders.txt
    try:
        placeholders = extract_placeholders(
            docx_path=session.input_docx,
            output_txt_path=session.placeholders_txt,
        )
        session.placeholders = placeholders
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to extract placeholders: {exc}",
        ) from exc

    # Screen 3: Initial check for field values in user_prompt
    try:
        filled, missing = find_placeholder_values(
            placeholders=session.placeholders,
            user_prompt=session.user_prompt,
        )
        session.filled_values = filled
        session.missing_placeholders = missing
        write_placeholders_file(
            session.filled_values,
            session.placeholders,
            session.placeholders_txt,
        )
    except Exception as exc:
        session.filled_values = {}
        session.missing_placeholders = list(session.placeholders)

    return {
        "status": "ok",
        "templateId": str(session.template_id),
        "templateName": session.template_name.replace("_", " ").title(),
        "placeholders": session.placeholders,
        "filled": session.filled_values,
        "missing": session.missing_placeholders,
        "isComplete": len(session.missing_placeholders) == 0,
    }


# ==============================================================================
# Screen 3: Filling Placeholders (missing-information loop)
# ==============================================================================


@app.post("/api/session/fill-placeholders")
def fill_placeholders(req: FillPlaceholdersRequest):
    """Receive user answers for missing fields, update context and placeholders.txt."""
    if not session.placeholders:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active template in session.",
        )

    # Merge answers provided directly by the user
    for field_name, val in req.answers.items():
        if val and str(val).strip():
            session.filled_values[field_name] = str(val).strip()

    # If user added free-form text, query Qwen for any remaining missing fields
    if req.extra_context and req.extra_context.strip():
        session.user_prompt += "\n" + req.extra_context.strip()
        remaining_missing = [
            ph for ph in session.placeholders if ph not in session.filled_values
        ]
        if remaining_missing:
            try:
                new_filled, _ = find_placeholder_values(
                    placeholders=remaining_missing,
                    user_prompt=session.user_prompt,
                )
                session.filled_values.update(new_filled)
            except Exception:
                pass

    # Recalculate missing placeholders
    session.missing_placeholders = [
        ph for ph in session.placeholders if ph not in session.filled_values
    ]

    # Rewrite placeholders.txt
    write_placeholders_file(
        session.filled_values,
        session.placeholders,
        session.placeholders_txt,
    )

    return {
        "status": "ok",
        "filled": session.filled_values,
        "missing": session.missing_placeholders,
        "isComplete": len(session.missing_placeholders) == 0,
    }


# ==============================================================================
# Step 5: Document Generation
# ==============================================================================


@app.post("/api/session/generate")
def generate_document():
    """Extract full text of input.docx, generate document with Qwen, write to output.txt."""
    if not session.input_docx.is_file():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="input.docx is missing. Please start from template selection.",
        )

    if session.missing_placeholders:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "message": "Please provide values for all required fields before generating the document.",
                "missingFields": session.missing_placeholders,
            },
        )

    try:
        output_text = generate_document_text(
            docx_path=session.input_docx,
            placeholders_txt_path=session.placeholders_txt,
            user_prompt=session.user_prompt,
            output_txt_path=session.output_txt,
        )
        session.output_text = output_text
        session.revision_history = [
            {"version": "1", "instruction": "Initial generation", "content": output_text}
        ]
        return {
            "status": "ok",
            "content": output_text,
            "templateName": session.template_name.replace("_", " ").title(),
            "version": 1,
        }
    except OllamaClientError as err:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Local LLM error: {err}",
        ) from err
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Generation failed: {exc}",
        ) from exc


# ==============================================================================
# Screen 4: Preview and Revisions ("Any changes?")
# ==============================================================================


@app.get("/api/session/preview")
def get_preview():
    """Return output.txt content for document preview."""
    if not session.output_txt.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No document generated yet.",
        )
    content = session.output_txt.read_text(encoding="utf-8")
    return {
        "status": "ok",
        "content": content,
        "templateName": session.template_name.replace("_", " ").title(),
        "version": len(session.revision_history) or 1,
        "history": session.revision_history,
    }


@app.post("/api/session/revise")
def revise_document(req: ReviseRequest):
    """Send output.txt + change request to Qwen, overwrite output.txt and refresh."""
    if not req.instruction or not req.instruction.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Revision instruction cannot be empty.",
        )
    if not session.output_txt.is_file():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot revise before generating the document.",
        )

    try:
        updated_text = revise_document_text(
            current_output_txt_path=session.output_txt,
            change_request=req.instruction,
            output_txt_path=session.output_txt,
        )
        session.output_text = updated_text
        new_version_num = len(session.revision_history) + 1
        session.revision_history.append(
            {
                "version": str(new_version_num),
                "instruction": req.instruction.strip(),
                "content": updated_text,
            }
        )
        return {
            "status": "ok",
            "content": updated_text,
            "version": new_version_num,
        }
    except OllamaClientError as err:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Local LLM error: {err}",
        ) from err
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Revision failed: {exc}",
        ) from exc


# ==============================================================================
# Screen 5: Download
# ==============================================================================


@app.get("/api/session/download")
def download_document(format: str = "pdf"):
    """Convert output.txt to PDF or DOCX, stream binary, then prepare for reset."""
    fmt = format.lower().strip()
    if fmt not in ("pdf", "docx", "word"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Supported formats are 'pdf' and 'docx'.",
        )

    if not session.output_txt.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No generated document to download.",
        )

    clean_name = (session.template_name or "document").replace(" ", "_")

    if fmt == "pdf":
        out_pdf_path = session.output_pdf
        try:
            txt_to_pdf(
                txt_path=session.output_txt,
                pdf_path=out_pdf_path,
                encoding="utf-8",
            )
            return FileResponse(
                path=out_pdf_path,
                media_type="application/pdf",
                filename=f"{clean_name}.pdf",
            )
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to generate PDF: {exc}",
            ) from exc

    else:
        out_docx_path = session.output_docx
        try:
            txt_to_doc(
                txt_path=session.output_txt,
                template_path=session.input_docx,
                output_path=out_docx_path,
            )
            return FileResponse(
                path=out_docx_path,
                media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                filename=f"{clean_name}.docx",
            )
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to generate Word document: {exc}",
            ) from exc


@app.post("/api/session/reset")
def reset_session():
    """Reset session state and clean temporary generation files."""
    session.reset()
    return {"status": "ok", "message": "Session reset successfully."}


# Serve built frontend static files if available
FRONTEND_DIST = ROOT_DIR / "Frontend" / "dist"
if (FRONTEND_DIST / "assets").is_dir():
    from fastapi.staticfiles import StaticFiles

    app.mount("/assets", StaticFiles(directory=str(FRONTEND_DIST / "assets")), name="assets")


@app.api_route("/{full_path:path}", methods=["GET", "HEAD"], include_in_schema=False)
async def serve_frontend(full_path: str):
    """Serve single-page frontend app for any non-API route."""
    if full_path.startswith("api/"):
        raise HTTPException(status_code=404, detail="Not found")
    target = FRONTEND_DIST / full_path
    if full_path and target.is_file():
        return FileResponse(target)
    index_file = FRONTEND_DIST / "index.html"
    if index_file.is_file():
        return FileResponse(index_file)
    return PlainTextResponse("Scriptify backend is running. Frontend build not found.")


if __name__ == "__main__":
    import uvicorn

    print("Starting Scriptify on http://127.0.0.1:8000 ...")
    uvicorn.run("backend.server:app", host="127.0.0.1", port=8000, reload=False)

