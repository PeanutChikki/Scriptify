"""End-to-End test suite for Scriptify backend and workflow."""

import os
import shutil
import tempfile
from pathlib import Path
from fastapi.testclient import TestClient

from backend.server import app, session, INDEX_FILE, TEMPLATES_DIR

client = TestClient(app)


def test_e2e_flow():
    print("\n--- 1. Testing Health Endpoint ---")
    res = client.get("/api/health")
    assert res.status_code == 200, res.text
    data = res.json()
    print("Health response:", data)
    assert data["ollama_ready"] is True

    print("\n--- 2. Testing Template Library Listing ---")
    res = client.get("/api/templates")
    assert res.status_code == 200, res.text
    templates = res.json()
    print(f"Loaded {len(templates)} templates.")
    assert len(templates) >= 10
    template_names = [t["name"] for t in templates]
    assert "Leave Application" in template_names

    print("\n--- 3. Testing .dotx Template Upload & Validation ---")
    # Test rejection of non-dotx
    fake_txt = tempfile.NamedTemporaryFile("w", suffix=".txt", delete=False)
    fake_txt.write("Not a template")
    fake_txt.close()
    with open(fake_txt.name, "rb") as f:
        bad_res = client.post("/api/templates/upload", files={"file": ("test.txt", f, "text/plain")})
    os.remove(fake_txt.name)
    assert bad_res.status_code == 400
    print("Correctly rejected non-.dotx file:", bad_res.json()["detail"])

    # Test valid .dotx upload
    test_dotx = tempfile.NamedTemporaryFile("wb", suffix=".dotx", delete=False)
    # Copy leave_application.docx content into .dotx
    sample_docx = TEMPLATES_DIR / "leave_application.docx"
    test_dotx.write(sample_docx.read_bytes())
    test_dotx.close()

    with open(test_dotx.name, "rb") as f:
        upload_res = client.post(
            "/api/templates/upload",
            data={"name": "Custom Certification", "description": "Certificate template"},
            files={"file": ("cert_template.dotx", f, "application/vnd.openxmlformats-officedocument.wordprocessingml.template")},
        )
    os.remove(test_dotx.name)
    assert upload_res.status_code == 200, upload_res.text
    uploaded_data = upload_res.json()
    print(f"Successfully uploaded .dotx template: ID={uploaded_data['id']}, Name={uploaded_data['name']}")

    print("\n--- 4. Testing Step 3 & 4: Template Selection & Placeholder Extraction ---")
    user_prompt = "I need 3 days leave from 15th Oct 2026 to 18th Oct 2026 due to personal illness. My name is Alex Rivera, Computer Science Dept."
    select_res = client.post("/api/session/select-template", json={"prompt": user_prompt})
    assert select_res.status_code == 200, select_res.text
    sel_data = select_res.json()
    print("Selection response:", sel_data["templateName"])
    assert sel_data["templateId"] == "1"  # leave_application
    assert Path("input.docx").is_file()
    assert Path("placeholders.txt").is_file()
    print(f"Found {len(sel_data['placeholders'])} placeholders.")
    print("Filled:", sel_data["filled"])
    print("Missing:", sel_data["missing"])

    print("\n--- 5. Testing Screen 3: Filling Placeholders Loop ---")
    # Complete any remaining placeholders
    missing = sel_data["missing"]
    answers = {}
    for ph in missing:
        answers[ph] = f"Sample Value for {ph}"

    fill_res = client.post("/api/session/fill-placeholders", json={"answers": answers})
    assert fill_res.status_code == 200, fill_res.text
    fill_data = fill_res.json()
    print("Fill response isComplete:", fill_data["isComplete"])
    assert fill_data["isComplete"] is True
    assert len(fill_data["missing"]) == 0

    print("\n--- 6. Testing Step 5: Document Generation ---")
    gen_res = client.post("/api/session/generate")
    assert gen_res.status_code == 200, gen_res.text
    gen_data = gen_res.json()
    assert gen_data["status"] == "ok"
    assert len(gen_data["content"]) > 50
    assert Path("output.txt").is_file()
    print("Generated document preview (first 150 chars):")
    print(gen_data["content"][:150] + "...")

    print("\n--- 7. Testing Screen 4: Revision Loop ---")
    rev_res = client.post("/api/session/revise", json={"instruction": "Please make sure the tone is extremely polite and respectful"})
    assert rev_res.status_code == 200, rev_res.text
    rev_data = rev_res.json()
    assert rev_data["status"] == "ok"
    assert rev_data["version"] == 2
    print("Revision applied successfully, version:", rev_data["version"])

    print("\n--- 8. Testing Screen 5: Download PDF & Word ---")
    # Test PDF download
    pdf_res = client.get("/api/session/download?format=pdf")
    assert pdf_res.status_code == 200
    assert pdf_res.headers["content-type"] == "application/pdf"
    assert len(pdf_res.content) > 500
    print(f"PDF generated successfully ({len(pdf_res.content)} bytes).")

    # Test DOCX download
    docx_res = client.get("/api/session/download?format=docx")
    assert docx_res.status_code == 200
    assert "wordprocessingml" in docx_res.headers["content-type"]
    assert len(docx_res.content) > 1000
    print(f"DOCX generated successfully ({len(docx_res.content)} bytes).")

    print("\n--- 9. Testing Session Reset ---")
    reset_res = client.post("/api/session/reset")
    assert reset_res.status_code == 200
    assert session.user_prompt == ""
    print("Session state reset cleanly.")

    print("\n--- 10. Testing Template Deletion (DELETE /api/templates/{id}) ---")
    del_res = client.delete(f"/api/templates/{uploaded_data['id']}")
    assert del_res.status_code == 200, del_res.text
    del_json = del_res.json()
    assert del_json["status"] == "ok"
    print(f"Deleted template {uploaded_data['id']}: {del_json['message']}")

    # Verify template is no longer returned in template listing
    verify_res = client.get("/api/templates")
    current_ids = [t["id"] for t in verify_res.json()]
    assert uploaded_data["id"] not in current_ids
    print(f"Confirmed template {uploaded_data['id']} is removed from library.")

    # Second delete returns 404
    del_res_again = client.delete(f"/api/templates/{uploaded_data['id']}")
    assert del_res_again.status_code == 404
    print("Subsequent delete correctly returned 404.")

    print("\n==========================================")
    print(" ALL END-TO-END TESTS PASSED SUCCESSFULLY! ")
    print("==========================================")


if __name__ == "__main__":
    test_e2e_flow()

