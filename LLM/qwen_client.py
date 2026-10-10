"""Central Qwen LLM Client for Scriptify.

Executes:
    ollama run hf.co/AtomicChat/Qwen3.5-4B-GGUF:Q4_K_M --hidethinking

Cross-platform (Linux & Windows), non-JSON, plain-text helper with robust
thinking-block removal, ANSI stripping, and error handling.
"""

from __future__ import annotations

import re
import subprocess
import shutil
from typing import Optional

MODEL_NAME = "hf.co/AtomicChat/Qwen3.5-4B-GGUF:Q4_K_M"

# Regex for terminal ANSI codes and spinners
ANSI_RE = re.compile(r"\x1b\[[0-9;?]*[ -/]*[@-~]|\x1b\][^\x07]*\x07|\x1b[=>]")
SPINNER_RE = re.compile(r"[⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏]")
THINK_TAGS_RE = re.compile(r"<think>.*?</think>", re.DOTALL | re.IGNORECASE)
THINK_CLI_RE = re.compile(r"Thinking\.\.\..*?\.\.\.done thinking\.", re.DOTALL | re.IGNORECASE)


class OllamaClientError(Exception):
    """Raised when Ollama is unreachable, missing, or returns an error."""
    pass


def clean_llm_output(text: str) -> str:
    """Strip ANSI codes, spinner characters, and any thinking tokens."""
    if not text:
        return ""

    # Remove ANSI escapes and spinners
    text = ANSI_RE.sub("", text)
    text = SPINNER_RE.sub("", text)

    # Remove complete <think>...</think> blocks
    text = THINK_TAGS_RE.sub("", text)

    # Remove CLI thinking indicators
    text = THINK_CLI_RE.sub("", text)

    # Models sometimes print a visible analysis preamble despite --hidethinking.
    # If they label the answer explicitly, keep only that answer. Otherwise
    # discard a leading "Thinking Process:" block up to the next paragraph.
    final_match = re.search(r"(?:^|\n)\s*(?:final answer|final document|answer):\s*", text, re.IGNORECASE)
    if final_match:
        text = text[final_match.end():]
    else:
        thinking_match = re.search(r"(?:^|\n)\s*(?:thinking process|reasoning|analysis):\s*", text, re.IGNORECASE)
        if thinking_match:
            tail = text[thinking_match.end():]
            # A blank line usually separates the model's preamble from its answer.
            paragraphs = re.split(r"\n\s*\n", tail, maxsplit=1)
            text = paragraphs[1] if len(paragraphs) > 1 else ""

    # If an isolated </think> tag is present (e.g. from Thinking Process: block)
    if "</think>" in text.lower():
        parts = re.split(r"</think>", text, flags=re.IGNORECASE)
        text = parts[-1]

    # Remove any stray unclosed <think> tag
    text = re.sub(r"<think>.*", "", text, flags=re.DOTALL | re.IGNORECASE)

    # Clean leading/trailing whitespace
    return text.strip()


def check_ollama_available() -> tuple[bool, str]:
    """Verify that the ollama CLI is installed and the model is reachable."""
    ollama_bin = shutil.which("ollama")
    if not ollama_bin:
        return False, "Ollama CLI is not installed or not in your system PATH."

    try:
        proc = subprocess.run(
            ["ollama", "list"],
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=10,
        )
        if proc.returncode != 0:
            return False, f"Ollama daemon error: {proc.stderr.strip()}"
        if MODEL_NAME.lower() not in proc.stdout.lower() and "qwen3.5-4b" not in proc.stdout.lower():
            return False, f"Model '{MODEL_NAME}' is not pulled yet. Run: ollama pull {MODEL_NAME}"
        return True, "Ollama is ready."
    except subprocess.TimeoutExpired:
        return False, "Ollama connection timed out. Ensure the Ollama service is running."
    except Exception as exc:
        return False, f"Could not connect to Ollama: {exc}"


def ask_qwen(
    prompt: str,
    timeout_seconds: int = 180,
    think: Optional[bool] = None,
    extra_args: Optional[list[str]] = None,
) -> str:
    """Send a prompt to the local Qwen model and return the clean plain-text reply.

    Args:
        prompt: The plain text prompt to pass to the model.
        timeout_seconds: Maximum time to wait for generation.
        think: If False, passes '--think=false' to ollama run to disable thinking output.
        extra_args: Additional command-line flags to pass to ollama run.

    Returns:
        Clean plain-text response string.

    Raises:
        OllamaClientError: When Ollama fails, times out, or is missing.
    """
    if not prompt or not prompt.strip():
        raise OllamaClientError("Cannot send an empty prompt to Qwen.")

    ollama_bin = shutil.which("ollama")
    if not ollama_bin:
        raise OllamaClientError(
            "Ollama is not installed or not found in system PATH. "
            "Please install Ollama from https://ollama.ai and start the service."
        )

    cmd = ["ollama", "run", MODEL_NAME, "--hidethinking"]
    if think is False:
        cmd.append("--think=false")
    elif think is True:
        cmd.append("--think=true")

    if extra_args:
        cmd.extend(extra_args)

    try:
        proc = subprocess.run(
            cmd,
            input=prompt,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=timeout_seconds,
        )
    except subprocess.TimeoutExpired as exc:
        raise OllamaClientError(
            f"Qwen model inference timed out after {timeout_seconds} seconds."
        ) from exc
    except FileNotFoundError as exc:
        raise OllamaClientError(
            "Ollama command not found. Ensure Ollama is installed and on your PATH."
        ) from exc
    except Exception as exc:
        raise OllamaClientError(f"Unexpected error running Ollama: {exc}") from exc

    if proc.returncode != 0:
        err_msg = proc.stderr.strip() or "Ollama process exited with an error"
        raise OllamaClientError(f"Ollama execution failed: {err_msg}")

    return clean_llm_output(proc.stdout)

