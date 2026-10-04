"""Erstellt Kontaktbögen der gerenderten PDF-Seiten für die visuelle Gesamtkontrolle."""

from pathlib import Path
from shutil import rmtree

from PIL import Image, ImageDraw, ImageFont, ImageOps


ROOT = Path(__file__).resolve().parents[1]
PDF_ROOT = ROOT / "tmp" / "pdfs"
OUTPUT = PDF_ROOT / "contact-sheets"
RENDERS = [
    ("Musterbericht", "sample-render"),
    ("Belastungstest", "stress-render"),
    ("Abgeschlossen", "complete-render"),
    ("Offene Maßnahmen", "conditional-render"),
    ("Nicht abschließbar", "not-concludable-render"),
    ("Nicht fortführbar", "stopped-render"),
]

COLS = 3
ROWS = 3
CELL_WIDTH = 520
CELL_HEIGHT = 775
LABEL_HEIGHT = 34
MARGIN = 18


def page_number(path: Path) -> int:
    return int(path.stem.split("-")[-1])


def make_sheet(title: str, pages: list[Path], sheet_number: int) -> None:
    canvas = Image.new(
        "RGB",
        (COLS * CELL_WIDTH + 2 * MARGIN, ROWS * CELL_HEIGHT + 2 * MARGIN),
        "#d9dee2",
    )
    draw = ImageDraw.Draw(canvas)
    font = ImageFont.load_default(size=20)
    for index, path in enumerate(pages):
        row, col = divmod(index, COLS)
        left = MARGIN + col * CELL_WIDTH
        top = MARGIN + row * CELL_HEIGHT
        image = Image.open(path).convert("RGB")
        thumb = ImageOps.contain(
            image,
            (CELL_WIDTH - 20, CELL_HEIGHT - LABEL_HEIGHT - 20),
            method=Image.Resampling.LANCZOS,
        )
        x = left + (CELL_WIDTH - thumb.width) // 2
        y = top + LABEL_HEIGHT + (CELL_HEIGHT - LABEL_HEIGHT - thumb.height) // 2
        canvas.paste(thumb, (x, y))
        draw.text(
            (left + 10, top + 5),
            f"{title} · Seite {page_number(path)}",
            fill="#1d252b",
            font=font,
        )
    safe_title = (
        title.lower()
        .replace(" ", "-")
        .replace("ä", "ae")
        .replace("ö", "oe")
        .replace("ü", "ue")
        .replace("ß", "ss")
    )
    canvas.save(OUTPUT / f"{safe_title}-{sheet_number:02d}.png", optimize=True)


if OUTPUT.exists():
    rmtree(OUTPUT)
OUTPUT.mkdir(parents=True)

total_pages = 0
total_sheets = 0
for title, directory in RENDERS:
    paths = sorted((PDF_ROOT / directory).glob("page-*.png"), key=page_number)
    total_pages += len(paths)
    for offset in range(0, len(paths), COLS * ROWS):
        make_sheet(title, paths[offset : offset + COLS * ROWS], offset // (COLS * ROWS) + 1)
        total_sheets += 1

print(f"{total_pages} Seiten auf {total_sheets} Kontaktbögen zusammengeführt: {OUTPUT}")
