"""Unicode PDF fonts for ReportLab (Latin + Dari/Arabic/Pashto).

Helvetica cannot render Arabic-script glyphs. We register bundled DejaVu Sans
and reshape Arabic runs into presentation forms so words like ``دخل`` stay
joined and readable on ReportLab's left-to-right canvas.
"""

from __future__ import annotations

import re
from functools import lru_cache
from pathlib import Path

from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

_FONT_DIR = Path(__file__).resolve().parent / "fonts"
_REGULAR_NAME = "DejaVuSans"
_BOLD_NAME = "DejaVuSans-Bold"

_ARABIC_RE = re.compile(r"[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]+")

# letter → (isolated, initial, medial, final). Empty string = form not used.
# Dual-joining letters have all four; right-joining only have isolated + final.
_ISOLATED, _INITIAL, _MEDIAL, _FINAL = 0, 1, 2, 3
_LETTERS: dict[str, tuple[str, str, str, str]] = {
    "\u0627": ("\ufe8d", "", "", "\ufe8e"),  # ALEF
    "\u0628": ("\ufe8f", "\ufe91", "\ufe92", "\ufe90"),  # BEH
    "\u0629": ("\ufe93", "", "", "\ufe94"),  # TEH MARBUTA
    "\u062a": ("\ufe95", "\ufe97", "\ufe98", "\ufe96"),  # TEH
    "\u062b": ("\ufe99", "\ufe9b", "\ufe9c", "\ufe9a"),  # THEH
    "\u062c": ("\ufe9d", "\ufe9f", "\ufea0", "\ufe9e"),  # JEEM
    "\u062d": ("\ufea1", "\ufea3", "\ufea4", "\ufea2"),  # HAH
    "\u062e": ("\ufea5", "\ufea7", "\ufea8", "\ufea6"),  # KHAH
    "\u062f": ("\ufea9", "", "", "\ufeaa"),  # DAL
    "\u0630": ("\ufeab", "", "", "\ufeac"),  # THAL
    "\u0631": ("\ufead", "", "", "\ufeae"),  # REH
    "\u0632": ("\ufeaf", "", "", "\ufeb0"),  # ZAIN
    "\u0633": ("\ufeb1", "\ufeb3", "\ufeb4", "\ufeb2"),  # SEEN
    "\u0634": ("\ufeb5", "\ufeb7", "\ufeb8", "\ufeb6"),  # SHEEN
    "\u0635": ("\ufeb9", "\ufebb", "\ufebc", "\ufeba"),  # SAD
    "\u0636": ("\ufebd", "\ufebf", "\ufec0", "\ufebe"),  # DAD
    "\u0637": ("\ufec1", "\ufec3", "\ufec4", "\ufec2"),  # TAH
    "\u0638": ("\ufec5", "\ufec7", "\ufec8", "\ufec6"),  # ZAH
    "\u0639": ("\ufec9", "\ufecb", "\ufecc", "\ufeca"),  # AIN
    "\u063a": ("\ufecd", "\ufecf", "\ufed0", "\ufece"),  # GHAIN
    "\u0641": ("\ufed1", "\ufed3", "\ufed4", "\ufed2"),  # FEH
    "\u0642": ("\ufed5", "\ufed7", "\ufed8", "\ufed6"),  # QAF
    "\u0643": ("\ufed9", "\ufedb", "\ufedc", "\ufeda"),  # KAF
    "\u0644": ("\ufedd", "\ufedf", "\ufee0", "\ufede"),  # LAM
    "\u0645": ("\ufee1", "\ufee3", "\ufee4", "\ufee2"),  # MEEM
    "\u0646": ("\ufee5", "\ufee7", "\ufee8", "\ufee6"),  # NOON
    "\u0647": ("\ufee9", "\ufeeb", "\ufeec", "\ufeea"),  # HEH
    "\u0648": ("\ufeed", "", "", "\ufeee"),  # WAW
    "\u0649": ("\ufeef", "", "", "\ufef0"),  # ALEF MAKSURA
    "\u064a": ("\ufef1", "\ufef3", "\ufef4", "\ufef2"),  # YEH
    "\u067e": ("\ufb56", "\ufb58", "\ufb59", "\ufb57"),  # PEH
    "\u0686": ("\ufb7a", "\ufb7c", "\ufb7d", "\ufb7b"),  # TCHEH
    "\u0698": ("\ufb8a", "", "", "\ufb8b"),  # JEH
    "\u06a9": ("\ufb8e", "\ufb90", "\ufb91", "\ufb8f"),  # KEHEH
    "\u06af": ("\ufb92", "\ufb94", "\ufb95", "\ufb93"),  # GAF
    "\u06cc": ("\ufbfc", "\ufbfe", "\ufbff", "\ufbfd"),  # FARSI YEH
}


def _connects_after(letter: str) -> bool:
    forms = _LETTERS.get(letter)
    return bool(forms and (forms[_INITIAL] or forms[_MEDIAL]))


def _connects_before(letter: str) -> bool:
    forms = _LETTERS.get(letter)
    return bool(forms and (forms[_FINAL] or forms[_MEDIAL]))


def _reshape_arabic_run(text: str) -> str:
    """Convert a logical Arabic run into joined presentation forms (still logical order)."""
    chars = list(text)
    n = len(chars)
    out: list[str] = []
    for i, ch in enumerate(chars):
        forms = _LETTERS.get(ch)
        if not forms:
            out.append(ch)
            continue
        prev_ch = chars[i - 1] if i > 0 else ""
        next_ch = chars[i + 1] if i + 1 < n else ""
        join_before = bool(prev_ch) and _connects_after(prev_ch) and _connects_before(ch)
        join_after = bool(next_ch) and _connects_after(ch) and _connects_before(next_ch)
        if join_before and join_after:
            form = forms[_MEDIAL] or forms[_ISOLATED]
        elif join_before:
            form = forms[_FINAL] or forms[_ISOLATED]
        elif join_after:
            form = forms[_INITIAL] or forms[_ISOLATED]
        else:
            form = forms[_ISOLATED] or ch
        out.append(form or ch)
    return "".join(out)


def _candidate_paths(filename: str) -> list[Path]:
    return [
        _FONT_DIR / filename,
        Path("/usr/share/fonts/truetype/dejavu") / filename,
        Path("/usr/share/fonts/truetype/liberation") / filename.replace("DejaVuSans", "LiberationSans"),
    ]


@lru_cache(maxsize=1)
def ensure_pdf_fonts() -> tuple[str, str]:
    """Register Unicode TTF fonts once; return ``(regular, bold)`` font names."""
    regular_path = next((p for p in _candidate_paths("DejaVuSans.ttf") if p.is_file()), None)
    bold_path = next((p for p in _candidate_paths("DejaVuSans-Bold.ttf") if p.is_file()), None)
    if regular_path is None:
        return "Helvetica", "Helvetica-Bold"
    if _REGULAR_NAME not in pdfmetrics.getRegisteredFontNames():
        pdfmetrics.registerFont(TTFont(_REGULAR_NAME, str(regular_path)))
    if bold_path is not None and _BOLD_NAME not in pdfmetrics.getRegisteredFontNames():
        pdfmetrics.registerFont(TTFont(_BOLD_NAME, str(bold_path)))
        pdfmetrics.registerFontFamily(
            _REGULAR_NAME,
            normal=_REGULAR_NAME,
            bold=_BOLD_NAME,
        )
        return _REGULAR_NAME, _BOLD_NAME
    return _REGULAR_NAME, _REGULAR_NAME


def prepare_pdf_text(text: str | None) -> str:
    """Shape Arabic-script runs for ReportLab so Dari words stay joined and ordered.

    Prefer ``arabic-reshaper`` + ``python-bidi`` when installed; otherwise use the
    built-in presentation-form reshaper and reverse each run for the LTR canvas.
    """
    if not text:
        return ""
    value = str(text)
    if not _ARABIC_RE.search(value):
        return value

    try:
        import arabic_reshaper
        from bidi.algorithm import get_display

        def _shape_ext(match: re.Match[str]) -> str:
            return get_display(arabic_reshaper.reshape(match.group(0)))

        return _ARABIC_RE.sub(_shape_ext, value)
    except ImportError:

        def _shape_local(match: re.Match[str]) -> str:
            # Reshape to joined glyphs, then reverse for LTR painting.
            return _reshape_arabic_run(match.group(0))[::-1]

        return _ARABIC_RE.sub(_shape_local, value)
