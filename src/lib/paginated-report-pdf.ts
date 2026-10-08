import html2canvas from "html2canvas";
import jsPDF from "jspdf";

type PageRange = {
  start: number;
  end: number;
};

type PaginatedReportOptions = {
  exportWidth?: number;
  scale?: number;
};

const PDF_PAGE_BREAK_SELECTOR = [
  "header",
  "footer",
  "section",
  ".pdf-section",
  ".print-avoid-break",
  ".card",
  ".recharts-responsive-container",
].join(",");
const PDF_CONTENT_BOUNDARY_SELECTOR = "table tbody tr,p,li";
const PDF_KEEP_TOGETHER_SELECTOR = ".print-avoid-break,.pdf-section,section,.card";

export function getReportPageRanges(
  totalHeight: number,
  pageHeight: number,
  breakPoints: number[],
): PageRange[] {
  const height = Math.ceil(totalHeight);
  const printableHeight = Math.max(1, Math.floor(pageHeight));
  const boundaries = [...new Set(
    breakPoints
      .map((point) => Math.round(point))
      .filter((point) => point > 0 && point < height),
  )].sort((a, b) => a - b);
  const ranges: PageRange[] = [];
  let start = 0;

  while (height - start > printableHeight) {
    const idealEnd = start + printableHeight;
    const safeBefore = boundaries.filter(
      (point) => point > start + printableHeight * 0.35 && point <= idealEnd,
    );
    const safeAfter = boundaries.find(
      (point) => point > idealEnd && point <= idealEnd + printableHeight * 0.12,
    );
    const end = safeBefore.length > 0
      ? safeBefore[safeBefore.length - 1]
      : safeAfter ?? idealEnd;

    if (end <= start) break;
    ranges.push({ start, end });
    start = end;
  }

  if (start < height) ranges.push({ start, end: height });
  return ranges;
}

function addBoundary(boundaries: number[], value: number, rootTop: number) {
  if (Number.isFinite(value)) boundaries.push(Math.max(0, value - rootTop));
}

function waitForImages(element: HTMLElement) {
  return Promise.all(
    Array.from(element.querySelectorAll("img")).map((image) => {
      if (typeof image.decode === "function") {
        return Promise.race([
          image.decode().catch(() => undefined),
          new Promise<void>((resolve) => setTimeout(resolve, 5000)),
        ]);
      }
      if (image.complete) return Promise.resolve();
      return new Promise<void>((resolve) => {
        image.addEventListener("load", () => resolve(), { once: true });
        image.addEventListener("error", () => resolve(), { once: true });
        setTimeout(resolve, 5000);
      });
    }),
  );
}

function makePageCanvas(source: HTMLCanvasElement, range: PageRange) {
  const pageCanvas = document.createElement("canvas");
  pageCanvas.width = source.width;
  pageCanvas.height = range.end - range.start;
  const context = pageCanvas.getContext("2d");
  if (!context) throw new Error("Could not prepare a PDF page image.");

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
  context.drawImage(
    source,
    0,
    range.start,
    source.width,
    pageCanvas.height,
    0,
    0,
    pageCanvas.width,
    pageCanvas.height,
  );
  return pageCanvas;
}

export async function createPaginatedReportPdf(
  reportElement: HTMLElement,
  options: PaginatedReportOptions = {},
) {
  const exportWidth = options.exportWidth ?? 800;
  const initialWidth = reportElement.getBoundingClientRect().width || exportWidth;
  const estimatedHeight = Math.max(
    1,
    reportElement.scrollHeight * (exportWidth / initialWidth),
  );
  const maxCanvasPixels = 32_000_000;
  const safeScale = Math.min(
    options.scale ?? 2,
    26_000 / estimatedHeight,
    Math.sqrt(maxCanvasPixels / (exportWidth * estimatedHeight)),
  );
  const scale = Math.max(0.5, safeScale);
  const breakPoints: number[] = [];

  if (document.fonts?.ready) await document.fonts.ready;
  await waitForImages(reportElement);

  const canvas = await html2canvas(reportElement, {
    scale,
    useCORS: true,
    backgroundColor: "#ffffff",
    logging: false,
    windowWidth: exportWidth,
    onclone: (clonedDocument) => {
      clonedDocument.documentElement.classList.remove("dark");
      clonedDocument.body?.classList.remove("dark");
      clonedDocument
        .querySelectorAll<HTMLElement>('.no-print, [class~="print:hidden"]')
        .forEach((element) => element.remove());

      clonedDocument.querySelectorAll<HTMLElement>("[class]").forEach((element) => {
        if (
          element.classList.contains("hidden") &&
          element.classList.contains("print:block")
        ) {
          element.style.display = "block";
        }
      });

      const clonedReport = clonedDocument.getElementById(reportElement.id);
      if (!clonedReport) return;

      clonedReport.style.width = `${exportWidth}px`;
      clonedReport.style.maxWidth = "none";
      clonedReport.style.minWidth = "0";
      clonedReport.style.margin = "0";
      clonedReport.style.boxSizing = "border-box";
      clonedReport.style.height = "auto";
      clonedReport.style.minHeight = "0";
      clonedReport.style.maxHeight = "none";
      clonedReport.style.overflow = "visible";
      clonedReport.style.backgroundColor = "#ffffff";
      clonedReport.style.transform = "none";

      clonedReport.querySelectorAll<HTMLElement>(".card").forEach((card) => {
        card.style.overflow = "visible";
      });
      clonedReport.querySelectorAll<HTMLElement>(".recharts-responsive-container").forEach((chart) => {
        chart.style.width = "100%";
        chart.style.minWidth = "0";
      });
      clonedReport.querySelectorAll<HTMLElement>(".recharts-wrapper").forEach((wrapper) => {
        const width = wrapper.parentElement?.getBoundingClientRect().width || exportWidth - 40;
        wrapper.style.width = `${width}px`;
      });
      clonedReport.querySelectorAll<SVGElement>(".recharts-surface").forEach((svg) => {
        const width = svg.parentElement?.getBoundingClientRect().width || exportWidth - 40;
        svg.setAttribute("width", String(width));
        svg.style.width = `${width}px`;
      });

      const rootTop = clonedReport.getBoundingClientRect().top;
      const maxPageContentCssHeight =
        ((297 - 12 - 15) * exportWidth) / (210 - 12 * 2);
      clonedReport.querySelectorAll<HTMLElement>(PDF_PAGE_BREAK_SELECTOR).forEach((block) => {
        const rect = block.getBoundingClientRect();
        addBoundary(breakPoints, rect.top, rootTop);
        addBoundary(breakPoints, rect.bottom, rootTop);
      });
      clonedReport.querySelectorAll<HTMLElement>(PDF_CONTENT_BOUNDARY_SELECTOR).forEach((block) => {
        const keepTogether = block.parentElement?.closest<HTMLElement>(PDF_KEEP_TOGETHER_SELECTOR);
        if (keepTogether && keepTogether.getBoundingClientRect().height <= maxPageContentCssHeight) {
          return;
        }
        const rect = block.getBoundingClientRect();
        addBoundary(breakPoints, rect.top, rootTop);
        addBoundary(breakPoints, rect.bottom, rootTop);
      });
      clonedReport.querySelectorAll<HTMLElement>("h1,h2,h3,h4").forEach((heading) => {
        const keepTogether = heading.closest<HTMLElement>(PDF_KEEP_TOGETHER_SELECTOR);
        if (keepTogether && keepTogether.getBoundingClientRect().height <= maxPageContentCssHeight) {
          return;
        }
        addBoundary(breakPoints, heading.getBoundingClientRect().top, rootTop);
      });
    },
  });

  if (canvas.width === 0 || canvas.height === 0) {
    throw new Error("The report produced an empty PDF image.");
  }

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const marginX = 12;
  const marginTop = 12;
  const marginBottom = 15;
  const contentWidth = pageWidth - marginX * 2;
  const contentHeight = pageHeight - marginTop - marginBottom;
  const pxToMm = contentWidth / canvas.width;
  const pagePixelHeight = contentHeight / pxToMm;
  const captureScale = canvas.width / exportWidth;
  const ranges = getReportPageRanges(
    canvas.height,
    pagePixelHeight,
    breakPoints.map((point) => point * captureScale),
  );

  ranges.forEach((range, index) => {
    if (index > 0) pdf.addPage("a4", "portrait");
    const pageCanvas = makePageCanvas(canvas, range);
    const imageData = pageCanvas.toDataURL("image/jpeg", 0.94);
    const segmentHeightMm = pageCanvas.height * pxToMm;
    const shrinkToFit = Math.min(1, contentHeight / segmentHeightMm);
    const imageWidth = contentWidth * shrinkToFit;
    const imageHeight = segmentHeightMm * shrinkToFit;
    const imageX = (pageWidth - imageWidth) / 2;

    pdf.addImage(
      imageData,
      "JPEG",
      imageX,
      marginTop,
      imageWidth,
      imageHeight,
      `report-page-${index + 1}`,
      "FAST",
    );
    pageCanvas.width = 0;
    pageCanvas.height = 0;
  });

  const pageCount = ranges.length;
  for (let page = 1; page <= pageCount; page += 1) {
    pdf.setPage(page);
    pdf.setDrawColor(210, 216, 224);
    pdf.setLineWidth(0.2);
    pdf.line(marginX, pageHeight - 10, pageWidth - marginX, pageHeight - 10);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(100, 108, 120);
    pdf.text(`Page ${page} of ${pageCount}`, pageWidth - marginX, pageHeight - 5, {
      align: "right",
    });
  }

  return pdf;
}
