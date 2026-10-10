"""Convert plain text documents to PDF using FPDF with cross-platform and unicode safety."""

from pathlib import Path
from fpdf import FPDF


def sanitize_for_fpdf(text: str) -> str:
    """Normalize common Unicode characters into Latin-1 compatible characters."""
    replacements = {
        "\u2018": "'",
        "\u2019": "'",
        "\u201c": '"',
        "\u201d": '"',
        "\u2013": "-",
        "\u2014": "--",
        "\u2026": "...",
        "\u2022": "*",
        "\u00a0": " ",
        "\u200b": "",
    }
    for orig, repl in replacements.items():
        text = text.replace(orig, repl)
    return text.encode("latin-1", errors="replace").decode("latin-1")


def txt_to_pdf(txt_path: str | Path, pdf_path: str | Path | None = None, encoding: str = "utf-8", font_size: int = 11) -> str:
    """Convert a .txt file to a .pdf file. Long lines wrap automatically."""
    in_path = Path(txt_path).resolve()
    if not in_path.is_file():
        raise FileNotFoundError(f"Input text file not found: {in_path}")

    if pdf_path is None:
        out_path = in_path.with_suffix(".pdf")
    else:
        out_path = Path(pdf_path).resolve()

    out_path.parent.mkdir(parents=True, exist_ok=True)

    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()
    pdf.set_font("Helvetica", size=font_size)

    with open(in_path, "r", encoding=encoding, errors="replace") as f:
        for line in f:
            clean_line = sanitize_for_fpdf(line.rstrip("\r\n"))
            pdf.multi_cell(0, 6.5, clean_line, new_x="LMARGIN", new_y="NEXT")

    pdf.output(str(out_path))
    return str(out_path)