import fitz
from pathlib import Path

source = Path('attached_assets/redhex-hybrid-long-short-research-pack_1786695481004.pdf')
out_dir = Path('.agents/outputs/redhex-pages')
out_dir.mkdir(parents=True, exist_ok=True)

doc = fitz.open(source)
for index, page in enumerate(doc, start=1):
    pixmap = page.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)
    pixmap.save(out_dir / f'page-{index}.png')
print(f'rendered {len(doc)} pages to {out_dir}')
