from fpdf import FPDF

def txt_to_pdf(txt_path, pdf_path=None, encoding="utf-8", font_size=12):
    """Convert a .txt file to a .pdf file. Long lines wrap automatically."""
    if pdf_path is None:
        pdf_path = txt_path.rsplit(".", 1)[0] + ".pdf"

    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()
    pdf.set_font("Helvetica", size=font_size)

    with open(txt_path, "r", encoding=encoding) as f:
        for line in f:
            pdf.multi_cell(0, 7, line.rstrip("\n"), new_x="LMARGIN", new_y="NEXT")

    pdf.output(pdf_path)
    return pdf_path