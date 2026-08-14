import fitz
from pathlib import Path

pdf_path = Path("attached_assets/redhex-hybrid-long-short-research-pack_1786695926045.pdf")
output_dir = Path(".agents/outputs/redhex-pdf")
output_dir.mkdir(parents=True, exist_ok=True)

doc = fitz.open(pdf_path)
for index, page in enumerate(doc):
    pixmap = page.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)
    output_path = output_dir / f"page-{index + 1}.png"
    pixmap.save(output_path)
    print(output_path)