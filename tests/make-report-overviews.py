"""Verdichtet die acht Berichtsvarianten zu Übersichten für die visuelle Abschlussprüfung."""

from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "tmp" / "report-pdfs"
OUTPUT = SOURCE / "overviews"
REPORTS = [
    ("Kompakter Musterbericht", "compact-sample"),
    ("Kompakter Belastungsbericht", "compact-stress"),
    ("Bewertung abgeschlossen", "compact-complete"),
    ("Offene Maßnahmen", "compact-conditional"),
    ("Nicht abschließbar", "compact-not-concludable"),
    ("Nicht fortführbar", "compact-stopped"),
    ("Vollständiger Musternachweis", "evidence-sample"),
    ("Vollständiger Belastungsnachweis", "evidence-stress"),
]


def page_number(path: Path) -> int:
    return int(path.stem.split("-")[-1])


OUTPUT.mkdir(parents=True, exist_ok=True)
font = ImageFont.load_default(size=16)
for title, directory in REPORTS:
    pages = sorted((SOURCE / directory).glob("page-*.png"), key=page_number)
    columns = 5 if len(pages) <= 25 else 9
    cell_width = 300 if columns == 5 else 190
    cell_height = int(cell_width * 1.47) + 24
    rows = (len(pages) + columns - 1) // columns
    canvas = Image.new("RGB", (columns * cell_width + 24, rows * cell_height + 52), "#d9dee2")
    draw = ImageDraw.Draw(canvas)
    draw.text((12, 12), f"{title} · {len(pages)} Seiten", fill="#17242c", font=font)
    for index, path in enumerate(pages):
        row, column = divmod(index, columns)
        left = 12 + column * cell_width
        top = 44 + row * cell_height
        page = Image.open(path).convert("RGB")
        thumb = ImageOps.contain(page, (cell_width - 16, cell_height - 34), method=Image.Resampling.LANCZOS)
        canvas.paste(thumb, (left + (cell_width - thumb.width) // 2, top + 22))
        draw.text((left + 7, top + 2), f"S. {page_number(path)}", fill="#17242c", font=font)
    target = OUTPUT / f"{directory}.png"
    canvas.save(target, optimize=True)
    print(target)
