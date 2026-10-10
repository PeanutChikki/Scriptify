# Scriptify 📄✨
### AI-Powered Document Generator Running Fully Locally

Scriptify is an intelligent document generator that matches user requirements against pre-uploaded Word templates, extracts fields, fills in missing parameters through an interactive loop, generates complete documents, supports conversational revisions, and exports to PDF and Word (.docx)—all running 100% locally with Ollama and Qwen.

---

## 🚀 Prerequisites

1. **Python 3.10+**
2. **Node.js 18+ and npm** (for frontend development/builds)
3. **Ollama** (local LLM runtime)

### 1. Install Ollama & Pull the Model

#### On Linux:
```bash
curl -fsSL https://ollama.ai/install.sh | sh
```

#### On Windows:
Download and run the installer from:
[https://ollama.ai/download/windows](https://ollama.ai/download/windows)

#### Pull the required Qwen model (4B):
```bash
ollama run hf.co/AtomicChat/Qwen3.5-4B-GGUF:Q4_K_M --hidethinking
```
*(You can exit the interactive prompt by typing `/bye`).*

---

## 🏃 Quick Start (One-Click)

### Linux:
```bash
./run.sh
```

### Windows:
Double-click `run.bat` or run in Command Prompt / PowerShell:
```cmd
run.bat
```

Once started, open your browser at:
👉 **[http://127.0.0.1:8000](http://127.0.0.1:8000)**

---

## 🛠️ Manual Installation & Development

### 1. Backend Setup
```bash
# Create virtual environment
python3 -m venv .venv

# Activate virtual environment
# On Linux / macOS:
source .venv/bin/activate
# On Windows:
.venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start backend server
python backend/server.py
```
Backend will run at `http://127.0.0.1:8000`.

### 2. Frontend Development (Optional)
To run Vite live-reloading dev server:
```bash
cd Frontend
npm install
npm run dev
```
Frontend dev server will run at `http://localhost:5173` with automatic API proxying to port 8000.

---

## 📋 Application Workflow (5 Screens)

1. **Screen 1: Template Library**
   - Displays cards for all templates in `Database/templates/` indexed in `Database/temp_index.json`.
   - **Add New**: Upload custom Word template (`.dotx` only). Validates extension, stores in database, updates index, and transitions to Screen 2.
   - **Use Existing**: Continue to Screen 2 with auto-matching or a selected template.

2. **Screen 2: Prompt Input**
   - Clean view with a prompt composer fixed at the bottom center.
   - User types the document type, context, and requirements (`user_prompt`).
   - Qwen selects the best matching template using a plain-text numbered list (no JSON). If selection is invalid, retries once with fallback to manual selection.
   - The selected template is copied to `input.docx`.

3. **Step 4 & Screen 3: Placeholder Extraction & Missing-Information Loop**
   - `doc_to_txt.py` extracts all template placeholders to `placeholders.txt`.
   - Qwen extracts matching field values in plain text `index | value` format.
   - Any missing fields are presented to the user in a form / prompt.
   - Loop continues until every single placeholder is provided.

4. **Step 5 & Screen 4: Document Generation, Preview & Revisions**
   - Qwen generates the full document from template text and `placeholders.txt`, writing to `output.txt`.
   - Shown in a paper-style view (white page, realistic margins, typography on gray canvas).
   - "Do you want any changes?" text box fixed at the bottom center allows conversational edits.
   - Qwen applies revisions and overwrites `output.txt` in real time.

5. **Screen 5: Download**
   - Choose **PDF** or **Word (.docx)**.
   - Background runs `text_to_pdf.py` (FPDF) or `text_to_doc.py` (python-docx).
   - Browser triggers immediate file download.
   - Shows "Downloaded successfully" message and resets session state for the next document.

---

## 🛡️ Edge Cases Handled

- **Empty Prompts**: Validated with user-friendly warnings before sending to LLM.
- **Wrong File Uploads**: Rejects non-`.dotx` template uploads with clear error messaging.
- **Ollama Unreachable or Model Missing**: Health checks and user alerts directing the user to start Ollama or pull the model.
- **Unparseable Model Replies**: Regex parsing extracts index numbers and `index | value` lines while filtering conversational text; retries once with simplified instructions before manual fallback.
- **Unicode & FPDF Safety**: PDF generator normalizes smart quotes (`’`, `“`, `”`), dashes (`—`), and non-Latin characters so FPDF never crashes.
- **Cross-Platform Paths**: Uses `pathlib.Path` and UTF-8 encoding across all files on Linux and Windows.

---

## 📂 Project Architecture

```
Scriptify/
├── backend/
│   └── server.py             # FastAPI REST server & static UI hosting
├── Database/
│   ├── docx_store.py         # Template storage & temp_index.json manager
│   ├── temp_index.json       # Index table for pre-uploaded templates
│   └── templates/            # Storage directory for .docx / .dotx templates
├── LLM/
│   ├── qwen_client.py        # Central ask_qwen helper (subprocess + cleanup)
│   ├── template_selector.py  # Plain-text template matching with retry
│   ├── doc_to_txt.py         # Placeholder extractor, filler & text generator
│   ├── txt_to_doc.py         # Document builder (python-docx)
│   ├── txt_to_pdf.py         # PDF builder with unicode normalization (fpdf2)
│   ├── input.docx            # Active session template
│   ├── placeholders.txt      # Active session placeholders
│   └── output.txt            # Active session output text
├── Frontend/
│   ├── src/
│   │   ├── api/              # Typed REST client
│   │   ├── state/            # React DocumentContext state manager
│   │   ├── pages/            # 5-screen sequential UI components
│   │   └── components/       # Document paper preview, drawers, modals
│   └── dist/                 # Production pre-built assets
├── requirements.txt          # Python dependencies
├── run.sh                    # Linux startup script
├── run.bat                   # Windows startup script
└── README.md                 # Documentation
```

