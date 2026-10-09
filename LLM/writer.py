import re
import subprocess
import sys
from pathlib import Path
from txt_to_doc import txt_to_doc


MODEL = "hf.co/AtomicChat/Qwen3.5-4B-GGUF:Q4_K_M"
TXT_FILE = Path.cwd() / "output.txt"  # always the current folder

# Matches terminal colour/cursor escape codes and spinner characters
ANSI_RE = re.compile(r"\x1b\[[0-?]*[ -/]*[@-~]|\x1b\][^\x07]*\x07")
SPINNER_RE = re.compile(r"[⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏]")

# Safety net: remove any thinking block if the CLI still prints one
THINK_TAGS_RE = re.compile(r"<think>.*?</think>", re.DOTALL | re.IGNORECASE)
THINK_TEXT_RE = re.compile(r"Thinking\.\.\..*?\.\.\.done thinking\.", re.DOTALL)


def clean(text: str) -> str:
    text = ANSI_RE.sub("", text)
    text = SPINNER_RE.sub("", text)
    text = THINK_TAGS_RE.sub("", text)
    text = THINK_TEXT_RE.sub("", text)
    return text.strip()


def thought_rmv(text):
    tag = "</think>"
    index = text.find(tag)

    if index == -1:
        return text

    return text[index + len(tag):].strip()


def ask_model(prompt: str) -> str:
    # The prompt is passed through stdin, so quotes/newlines in it are safe.
    result = subprocess.run(
        ["ollama", "run", MODEL, "--hidethinking"],
        input=prompt,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    if result.returncode != 0:
        raise RuntimeError(result.stderr.strip() or "ollama exited with an error")
    return clean(result.stdout)


def write(prompt) -> None:
    if len(sys.argv) > 1:
        prompt = " ".join(sys.argv[1:])
    

    if not prompt:
        sys.exit("No prompt given.")
    
    print("Waiting for model...")

    try:
        answer = ask_model(prompt)
    except FileNotFoundError:
        sys.exit("Could not find 'ollama'. Is it installed and on your PATH?")
    except RuntimeError as err:
        sys.exit(f"Ollama error: {err}")

    answer = thought_rmv(answer)

    # Write the answer to output.txt (overwrites any previous content)
    TXT_FILE.write_text(answer, encoding="utf-8")
    print(f"Done. Response saved to: {TXT_FILE}")
