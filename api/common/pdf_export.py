"""Shared ReportLab helpers for Unicode (Dari / Arabic / Pashto) PDF exports."""

from __future__ import annotations

from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.platypus import Paragraph

from api.common.pdf_fonts import ensure_pdf_fonts, prepare_pdf_text

# Dark header fill used across exports — Paragraph TEXTCOLOR does not follow
# TableStyle TEXTCOLOR, so header cells must paint white themselves.
HEADER_BG = colors.HexColor("#111827")
HEADER_FG = colors.white


def pdf_paragraph(
    text,
    style=None,
    *,
    bold: bool = False,
    text_color=None,
    font_size: float | None = None,
) -> Paragraph:
    """Escape + reshape Arabic-script text into a ReportLab Paragraph."""
    font_regular, font_bold = ensure_pdf_fonts()
    styles = getSampleStyleSheet()
    base = style or styles["Normal"]
    font_name = font_bold if bold else font_regular
    size = font_size if font_size is not None else getattr(base, "fontSize", 9)
    fg = text_color if text_color is not None else getattr(base, "textColor", colors.black)
    named = ParagraphStyle(
        name=f"pdf_{font_name}_{int(bold)}_{id(fg)}_{size}",
        parent=base,
        fontName=font_name,
        fontSize=size,
        leading=(size + 2),
        textColor=fg,
    )
    raw = prepare_pdf_text("" if text is None else str(text))
    return Paragraph(escape(raw), named)


def pdf_header_cell(text, *, font_size: float = 8) -> Paragraph:
    """Bold white text for dark table header rows."""
    return pdf_paragraph(text, bold=True, text_color=HEADER_FG, font_size=font_size)


def apply_unicode_table_fonts(table_style_commands: list) -> list:
    """Replace Helvetica font commands with registered Unicode fonts."""
    font_regular, font_bold = ensure_pdf_fonts()
    out = []
    for cmd in table_style_commands:
        if not cmd:
            out.append(cmd)
            continue
        op = cmd[0]
        if op == "FONTNAME":
            current = cmd[-1]
            mapped = font_bold if "Bold" in str(current) else font_regular
            out.append((*cmd[:-1], mapped))
        else:
            out.append(cmd)
    return out
