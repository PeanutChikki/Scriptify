# Scriptify API Contract (v1)

This document specifies the REST HTTP endpoints expected by the frontend application when running against the real backend (`VITE_USE_MOCK=false`).

---

## 1. Templates

### 1.1 List Templates
- **Endpoint**: `GET /api/templates`
- **Response**: `200 OK`
```json
[
  {
    "id": "tpl-1",
    "name": "Leave Application",
    "description": "Academic and workplace leave request form",
    "filename": "leave_application.docx",
    "createdAt": "2026-10-01T10:00:00Z",
    "placeholders": ["Applicant Name", "Department", "From Date", "To Date", "Reason"]
  }
]
```

### 1.2 Add Template
- **Endpoint**: `POST /api/templates`
- **Content-Type**: `multipart/form-data`
- **Form Fields**:
  - `name`: string (required)
  - `description`: string (optional)
  - `file`: file (.docx, max 10MB, optional)
  - `content`: string (pasted template text with `{{placeholders}}`, optional)
- **Response**: `201 Created`
```json
{
  "id": "tpl-12",
  "name": "Non-Disclosure Agreement",
  "description": "Mutual confidentiality terms",
  "filename": "nda.docx",
  "createdAt": "2026-10-09T18:00:00Z",
  "placeholders": ["Disclosing Party", "Receiving Party", "Term"]
}
```

### 1.3 Delete Template
- **Endpoint**: `DELETE /api/templates/:id`
- **Response**: `204 No Content` or `200 OK`

---

## 2. Document Generation & Revisions

### 2.1 Generate Document
- **Endpoint**: `POST /api/documents/generate`
- **Content-Type**: `application/json`
- **Body**:
```json
{
  "prompt": "Draft an offer letter for Priya Nair, Software Engineer, starting 1 Nov, salary 18 LPA",
  "templateId": "tpl-11" // Optional: null or omitted for auto-selection by LLM
}
```

#### Responses:
- **Success (`200 OK`)**:
```json
{
  "status": "ok",
  "documentId": "doc-98421",
  "templateId": "tpl-11",
  "templateName": "Employment Offer Letter",
  "fields": {
    "Candidate Name": "Priya Nair",
    "Designation": "Software Engineer",
    "Annual CTC": "18 LPA",
    "Joining Date": "1 November 2026",
    "Work Location": "Bangalore, India"
  },
  "version": 1,
  "htmlContent": "<div class=\"doc-header\">...</div>"
}
```

- **Incomplete Prompt (`200 OK` or `422 Unprocessable Entity`)**:
```json
{
  "status": "incomplete",
  "missingFields": [
    "Candidate Name",
    "Annual CTC",
    "Joining Date"
  ],
  "message": "The prompt is missing mandatory parameters required by the template."
}
```

- **Inference or Server Error (`500 / 503 / 504`)**:
```json
{
  "status": "error",
  "code": "LLM_TIMEOUT", // or "LLM_INFERENCE_FAILED", "BACKEND_OFFLINE", "TEMPLATE_NOT_FOUND"
  "message": "Local model failed to respond within 60s."
}
```

---

### 2.2 Revise Document
- **Endpoint**: `POST /api/documents/:id/revise`
- **Content-Type**: `application/json`
- **Body**:
```json
{
  "instruction": "Change salary to 20 LPA and start date to 1 Dec"
}
```
*Note: The backend maintains or looks up session context (original prompt, template, prior extracted fields, and revision history) to execute context-aware regeneration.*

#### Responses:
- Same discriminated union structure as `generateDocument`:
  - `{ status: "ok", documentId, templateId, templateName, fields, version, htmlContent }`
  - `{ status: "incomplete", missingFields: [...], message: "..." }`
  - `{ status: "error", code: "...", message: "..." }`

---

## 3. Previews & Downloads

### 3.1 Get Document Preview
- **Endpoint**: `GET /api/documents/:id/preview`
- **Response**: `200 OK`
```json
{
  "documentId": "doc-98421",
  "templateId": "tpl-11",
  "templateName": "Employment Offer Letter",
  "prompt": "Draft an offer letter for Priya Nair...",
  "currentVersion": 2,
  "versions": [
    {
      "versionId": "v-1",
      "versionNumber": 1,
      "instruction": "Initial generation",
      "createdAt": "2026-10-09T18:10:00Z",
      "htmlContent": "<div class=\"doc-header\">...</div>",
      "fields": { "Candidate Name": "Priya Nair", "Annual CTC": "18 LPA" }
    },
    {
      "versionId": "v-2",
      "versionNumber": 2,
      "instruction": "Change salary to 20 LPA",
      "createdAt": "2026-10-09T18:14:00Z",
      "htmlContent": "<div class=\"doc-header\">...</div>",
      "fields": { "Candidate Name": "Priya Nair", "Annual CTC": "20 LPA" }
    }
  ],
  "fields": { "Candidate Name": "Priya Nair", "Annual CTC": "20 LPA" }
}
```

### 3.2 Get Specific Version
- **Endpoint**: `GET /api/documents/:id/versions/:versionId`
- **Response**: `200 OK` (returns single `DocumentVersion`)

### 3.3 Download Document
- **Endpoint**: `GET /api/documents/:id/download?format=docx` (or `format=pdf`)
- **Response**: `200 OK` with binary octet-stream / application MIME type:
  - `docx`: `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
  - `pdf`: `application/pdf`
  - Header: `Content-Disposition: attachment; filename="document_title.docx"`
