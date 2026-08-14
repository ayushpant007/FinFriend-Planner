from pathlib import Path

import fitz


PDF_DIR = Path("public/SIF")
OUTPUT_DIR = Path(".agents/outputs/sif-pdf-previews")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

representatives = {
    "summit-equity-long-short-research-pack.pdf",
    "altiva-hybrid-long-short-research-pack.pdf",
    "qsif-sector-rotation-long-short-research-pack.pdf",
    "titanium-hybrid-long-short-research-pack.pdf",
    "dynasif-equity-long-short-research-pack.pdf",
}

rows = []
for path in sorted(PDF_DIR.glob("*.pdf")):
    doc = fitz.open(path)
    first_page_text = doc[0].get_text("text").replace("\n", " ").strip()
    rows.append(
        f"{path.name}\tpages={doc.page_count}\ttext={first_page_text[:240]}"
    )
    if path.name in representatives:
        pix = doc[0].get_pixmap(matrix=fitz.Matrix(1.5, 1.5), alpha=False)
        pix.save(OUTPUT_DIR / f"{path.stem}.png")
    doc.close()

(OUTPUT_DIR / "manifest.txt").write_text("\n".join(rows) + "\n")
print(f"Inspected {len(rows)} PDFs; rendered {len(representatives)} representative first pages.")