import html2canvas from "html2canvas";
import jsPDF from "jspdf";

type PageRange = {
  start: number;
  end: number;
};

type TableContinuationBlock = PageRange & {
  headerStart: number;
  headerEnd: number;
};

type PaginatedReportOptions = {
  exportWidth?: number;
  scale?: number;
  title?: string;
  titleTargetSelector?: string;
};

export function getInvestmentProposalTitle(name?: string | null) {
  const normalizedName = name?.trim().replace(/\s+/g, " ");
  return normalizedName
    ? `${normalizedName} Investment Proposal`
    : "Investment Proposal";
}

const PDF_PAGE_BREAK_SELECTOR = [
  "header",
  "footer",
  "section",
  "article",
  ".pdf-section",
  ".print-avoid-break",
  ".pdf-keep-together",
  ".consolidated-product",
  ".card",
  "figure",
  "table thead",
  "table tbody tr",
  ".recharts-responsive-container",
].join(",");
const PDF_CONTENT_BOUNDARY_SELECTOR =
  "table tbody tr,p,li,blockquote,pre,td,th";
const PDF_KEEP_TOGETHER_SELECTOR =
  ".print-avoid-break,.pdf-section,.pdf-keep-together,.consolidated-product,section,article,.card,figure,table";

const PDF_EXPORT_STYLES = `
  [data-pdf-export-root] {
    box-sizing: border-box !important;
    min-width: 0 !important;
    max-width: none !important;
    overflow: visible !important;
    background-color: #ffffff !important;
  }
  [data-pdf-export-root] *,
  [data-pdf-export-root] *::before,
  [data-pdf-export-root] *::after {
    box-sizing: border-box !important;
    min-width: 0 !important;
    max-width: 100% !important;
  }
  [data-pdf-export-root] img,
  [data-pdf-export-root] svg,
  [data-pdf-export-root] canvas,
  [data-pdf-export-root] video {
    max-width: 100% !important;
  }
  [data-pdf-export-root] table {
    width: 100% !important;
    max-width: 100% !important;
  }
  [data-pdf-export-root] td,
  [data-pdf-export-root] th,
  [data-pdf-export-root] p,
  [data-pdf-export-root] a {
    overflow-wrap: break-word !important;
    word-break: normal !important;
  }
  [data-pdf-export-root] .pdf-no-wrap {
    white-space: nowrap !important;
    overflow-wrap: normal !important;
    word-break: keep-all !important;
  }
  [data-pdf-export-root] .fund-allocation-table {
    table-layout: fixed !important;
  }
  [data-pdf-export-root] .fund-allocation-table th,
  [data-pdf-export-root] .fund-allocation-table td {
    padding-left: 4px !important;
    padding-right: 4px !important;
    vertical-align: middle !important;
  }
  [data-pdf-export-root] .fund-allocation-table th:nth-child(1),
  [data-pdf-export-root] .fund-allocation-table td:nth-child(1) {
    width: 23% !important;
  }
  [data-pdf-export-root] .fund-allocation-table th:nth-child(2),
  [data-pdf-export-root] .fund-allocation-table td:nth-child(2) {
    width: 18% !important;
  }
  [data-pdf-export-root] .fund-allocation-table th:nth-child(3),
  [data-pdf-export-root] .fund-allocation-table td:nth-child(3),
  [data-pdf-export-root] .fund-allocation-table th:nth-child(4),
  [data-pdf-export-root] .fund-allocation-table td:nth-child(4) {
    width: 12% !important;
  }
  [data-pdf-export-root] .fund-allocation-table th:nth-child(5),
  [data-pdf-export-root] .fund-allocation-table td:nth-child(5) {
    width: 13% !important;
  }
  [data-pdf-export-root] .fund-allocation-table th:nth-child(n+6),
  [data-pdf-export-root] .fund-allocation-table td:nth-child(n+6) {
    width: 6.666% !important;
  }
  [data-pdf-export-root] .overflow-x-auto,
  [data-pdf-export-root] .overflow-auto {
    max-width: 100% !important;
    overflow: visible !important;
  }
  [data-pdf-export-root] .card {
    overflow: visible !important;
  }
  [data-pdf-export-root] .recharts-responsive-container {
    width: 100% !important;
    max-width: 100% !important;
    min-width: 0 !important;
  }
  [data-pdf-export-root] .recharts-wrapper,
  [data-pdf-export-root] .recharts-surface {
    max-width: 100% !important;
  }
  [data-pdf-export-root] .no-print,
  [data-pdf-export-root] [class~="print:hidden"] {
    display: none !important;
  }
`;

export function getReportPageRanges(
  totalHeight: number,
  pageHeight: number,
  breakPoints: number[],
  keepTogetherBlocks: PageRange[] = [],
  tableContinuationBlocks: TableContinuationBlock[] = [],
): PageRange[] {
  const height = Math.max(0, Math.ceil(totalHeight));
  const printableHeight = Math.max(1, Math.floor(pageHeight));
  const boundaries = [...new Set(
    breakPoints
      .map((point) => Math.round(point))
      .filter((point) => point > 0 && point < height),
  )].sort((a, b) => a - b);
  const ranges: PageRange[] = [];
  let start = 0;

  const getContinuationHeaderHeight = (pageStart: number) => {
    const activeTable = tableContinuationBlocks
      .filter((table) => table.start < pageStart && table.end > pageStart)
      .sort((a, b) => b.start - a.start)[0];
    if (!activeTable) return 0;
    const headerHeight =
      Math.round(activeTable.headerEnd) - Math.round(activeTable.headerStart);
    return headerHeight > 0 && headerHeight < printableHeight * 0.35
      ? headerHeight
      : 0;
  };

  while (height - start + getContinuationHeaderHeight(start) > printableHeight) {
    const repeatedHeaderHeight = getContinuationHeaderHeight(start);
    const availableHeight = printableHeight - repeatedHeaderHeight;
    const idealEnd = start + availableHeight;
    const blockToMove = keepTogetherBlocks
      .map((block) => ({
        start: Math.round(block.start),
        end: Math.round(block.end),
      }))
      .filter(
        (block) =>
          block.start > start &&
          block.start < idealEnd &&
          block.end > idealEnd &&
          block.end - block.start <= availableHeight,
      )
      .sort((a, b) => a.start - b.start)[0];
    const safeBefore = boundaries.filter(
      (point) => point > start + printableHeight * 0.35 && point <= idealEnd,
    );
    const end = blockToMove?.start ?? (
      safeBefore.length > 0 ? safeBefore[safeBefore.length - 1] : idealEnd
    );

    if (end <= start || end - start > printableHeight) {
      throw new Error("Could not create a page range within the printable area.");
    }
    ranges.push({ start, end });
    start = end;
  }

  if (start < height) ranges.push({ start, end: height });
  return ranges;
}

function addBoundary(boundaries: number[], value: number, rootTop: number) {
  if (Number.isFinite(value)) boundaries.push(Math.max(0, value - rootTop));
}

function addKeepTogetherBlock(
  blocks: PageRange[],
  top: number,
  bottom: number,
  rootTop: number,
  maxHeight: number,
) {
  const start = Math.max(0, top - rootTop);
  const end = Math.max(start, bottom - rootTop);
  if (end > start && end - start <= maxHeight) blocks.push({ start, end });
}

function addTextLineBoundaries(
  element: HTMLElement,
  boundaries: number[],
  rootTop: number,
) {
  const range = document.createRange();
  range.selectNodeContents(element);
  Array.from(range.getClientRects()).forEach((rect) => {
    if (rect.height <= 0) return;
    addBoundary(boundaries, rect.top, rootTop);
    addBoundary(boundaries, rect.bottom, rootTop);
  });
  range.detach();
}

function waitForLayout() {
  return new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => resolve());
    });
  });
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

function makePageCanvas(
  source: HTMLCanvasElement,
  range: PageRange,
  repeatedHeader?: PageRange,
) {
  const pageCanvas = document.createElement("canvas");
  const bodyHeight = range.end - range.start;
  const headerHeight = repeatedHeader
    ? Math.max(0, Math.round(repeatedHeader.end) - Math.round(repeatedHeader.start))
    : 0;
  pageCanvas.width = source.width;
  pageCanvas.height = bodyHeight + headerHeight;
  const context = pageCanvas.getContext("2d");
  if (!context) throw new Error("Could not prepare a PDF page image.");

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
  if (repeatedHeader && headerHeight > 0) {
    context.drawImage(
      source,
      0,
      Math.round(repeatedHeader.start),
      source.width,
      headerHeight,
      0,
      0,
      pageCanvas.width,
      headerHeight,
    );
  }
  context.drawImage(
    source,
    0,
    range.start,
    source.width,
    bodyHeight,
    0,
    headerHeight,
    pageCanvas.width,
    bodyHeight,
  );
  return pageCanvas;
}

export async function createPaginatedReportPdf(
  reportElement: HTMLElement,
  options: PaginatedReportOptions = {},
) {
  const exportWidth = options.exportWidth ?? 800;
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });
  const pdfTitle = options.title?.trim().replace(/\s+/g, " ");
  if (pdfTitle) pdf.setProperties({ title: pdfTitle });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const marginX = 12;
  const marginTop = 12;
  const marginBottom = 15;
  const contentWidth = pageWidth - marginX * 2;
  const contentHeight = pageHeight - marginTop - marginBottom;
  const maxPageContentCssHeight = (contentHeight * exportWidth) / contentWidth;

  if (document.fonts?.ready) await document.fonts.ready;
  await waitForImages(reportElement);
  await waitForLayout();

  const initialWidth =
    reportElement.getBoundingClientRect().width ||
    reportElement.scrollWidth ||
    exportWidth;
  const estimatedHeight = Math.max(
    1,
    reportElement.scrollHeight,
    reportElement.scrollHeight * (initialWidth / exportWidth),
  );
  const maxCanvasPixels = 32_000_000;
  const safeScale = Math.min(
    options.scale ?? 2,
    26_000 / estimatedHeight,
    Math.sqrt(maxCanvasPixels / (exportWidth * estimatedHeight)),
  );
  const scale = Math.max(0.25, safeScale);
  const breakPoints: number[] = [];
  const keepTogetherBlocks: PageRange[] = [];
  const tableContinuationBlocks: TableContinuationBlock[] = [];

  const canvas = await html2canvas(reportElement, {
    scale,
    useCORS: true,
    backgroundColor: "#ffffff",
    logging: false,
    width: exportWidth,
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

      const exportStyles = clonedDocument.createElement("style");
      exportStyles.textContent = PDF_EXPORT_STYLES;
      clonedDocument.head.appendChild(exportStyles);

      clonedReport.setAttribute("data-pdf-export-root", "true");
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

      if (pdfTitle) {
        const titleTarget = options.titleTargetSelector
          ? clonedReport.querySelector<HTMLElement>(options.titleTargetSelector)
          : null;
        if (titleTarget) {
          titleTarget.textContent = pdfTitle;
        } else {
          const titleElement = clonedDocument.createElement("h1");
          titleElement.textContent = pdfTitle;
          titleElement.style.cssText =
            "box-sizing:border-box;width:100%;max-width:100%;margin:0 0 20px;padding:0 8px;color:#1f2937;font-family:Arial,sans-serif;font-size:24px;font-weight:700;line-height:1.25;text-align:center;overflow-wrap:anywhere;";
          clonedReport.insertBefore(titleElement, clonedReport.firstChild);
        }
      }

      clonedReport.querySelectorAll<HTMLElement>(".card").forEach((card) => {
        card.style.overflow = "visible";
      });
      clonedReport.querySelectorAll<HTMLElement>(".recharts-responsive-container").forEach((chart) => {
        chart.style.width = "100%";
        chart.style.maxWidth = "100%";
        chart.style.minWidth = "0";
      });
      clonedReport.querySelectorAll<HTMLElement>(".recharts-wrapper").forEach((wrapper) => {
        const width = wrapper.parentElement?.getBoundingClientRect().width || exportWidth - 40;
        wrapper.style.width = `${width}px`;
        wrapper.style.maxWidth = "100%";
      });
      clonedReport.querySelectorAll<SVGElement>(".recharts-surface").forEach((svg) => {
        const width = svg.parentElement?.getBoundingClientRect().width || exportWidth - 40;
        svg.setAttribute("width", String(width));
        svg.style.width = `${width}px`;
        svg.style.maxWidth = "100%";
      });

      const rootTop = clonedReport.getBoundingClientRect().top;
      clonedReport.querySelectorAll<HTMLElement>(PDF_KEEP_TOGETHER_SELECTOR).forEach((block) => {
        const rect = block.getBoundingClientRect();
        addKeepTogetherBlock(
          keepTogetherBlocks,
          rect.top,
          rect.bottom,
          rootTop,
          maxPageContentCssHeight,
        );
      });
      clonedReport.querySelectorAll<HTMLElement>("header").forEach((header) => {
        const nextBlock = header.nextElementSibling;
        if (!nextBlock) return;
        const headerRect = header.getBoundingClientRect();
        addKeepTogetherBlock(
          keepTogetherBlocks,
          headerRect.top,
          nextBlock.getBoundingClientRect().bottom,
          rootTop,
          maxPageContentCssHeight,
        );
      });
      clonedReport.querySelectorAll<HTMLTableElement>("table").forEach((table) => {
        const tableHead = table.querySelector("thead");
        const rows = Array.from(table.querySelectorAll<HTMLTableRowElement>("tbody tr"));
        if (!tableHead || rows.length === 0) return;

        const tableRect = table.getBoundingClientRect();
        const tableHeadRect = tableHead.getBoundingClientRect();
        const tableStart = Math.max(0, tableRect.top - rootTop);
        const tableEnd = Math.max(tableStart, tableRect.bottom - rootTop);
        const headerStart = Math.max(0, tableHeadRect.top - rootTop);
        const headerEnd = Math.max(headerStart, tableHeadRect.bottom - rootTop);
        if (tableEnd > tableStart && headerEnd > headerStart) {
          tableContinuationBlocks.push({
            start: tableStart,
            end: tableEnd,
            headerStart,
            headerEnd,
          });
        }

        const card = table.closest<HTMLElement>(
          ".card, div[class*='rounded'][class*='border']",
        );
        const cardOrHeadTop = card?.getBoundingClientRect().top ??
          tableHead.getBoundingClientRect().top;
        const sectionFitsPage =
          tableRect.bottom - cardOrHeadTop <= maxPageContentCssHeight;
        let rowsToKeep = sectionFitsPage
          ? rows.length
          : Math.min(3, rows.length);
        let leadEnd = rows[rowsToKeep - 1].getBoundingClientRect().bottom;
        while (
          rowsToKeep > 1 &&
          leadEnd - cardOrHeadTop > maxPageContentCssHeight
        ) {
          rowsToKeep -= 1;
          leadEnd = rows[rowsToKeep - 1].getBoundingClientRect().bottom;
        }
        addKeepTogetherBlock(
          keepTogetherBlocks,
          cardOrHeadTop,
          leadEnd,
          rootTop,
          maxPageContentCssHeight,
        );
      });

      clonedReport.querySelectorAll<HTMLElement>(PDF_PAGE_BREAK_SELECTOR).forEach((block) => {
        const rect = block.getBoundingClientRect();
        addBoundary(breakPoints, rect.top, rootTop);
        addBoundary(breakPoints, rect.bottom, rootTop);
      });
      clonedReport.querySelectorAll<HTMLElement>(PDF_CONTENT_BOUNDARY_SELECTOR).forEach((block) => {
        const row = block.closest<HTMLElement>("tr");
        if (
          row &&
          row !== block &&
          row.getBoundingClientRect().height <= maxPageContentCssHeight
        ) {
          return;
        }

        const keepTogether = block.parentElement?.closest<HTMLElement>(PDF_KEEP_TOGETHER_SELECTOR);
        if (keepTogether && keepTogether.getBoundingClientRect().height <= maxPageContentCssHeight) {
          return;
        }
        const rect = block.getBoundingClientRect();
        addBoundary(breakPoints, rect.top, rootTop);
        addBoundary(breakPoints, rect.bottom, rootTop);
        if (rect.height > maxPageContentCssHeight) {
          addTextLineBoundaries(block, breakPoints, rootTop);
        }
      });
      clonedReport.querySelectorAll<HTMLElement>("h1,h2,h3,h4").forEach((heading) => {
        const keepTogether = heading.closest<HTMLElement>(PDF_KEEP_TOGETHER_SELECTOR);
        if (keepTogether && keepTogether.getBoundingClientRect().height <= maxPageContentCssHeight) {
          return;
        }
        const rect = heading.getBoundingClientRect();
        addBoundary(breakPoints, rect.top, rootTop);
        if (rect.height > maxPageContentCssHeight) {
          addTextLineBoundaries(heading, breakPoints, rootTop);
        }
      });
    },
  });

  if (canvas.width === 0 || canvas.height === 0) {
    throw new Error("The report produced an empty PDF image.");
  }

  const pxToMm = contentWidth / canvas.width;
  const pagePixelHeight = contentHeight / pxToMm;
  const captureScale = canvas.width / exportWidth;
  const ranges = getReportPageRanges(
    canvas.height,
    pagePixelHeight,
    breakPoints.map((point) => point * captureScale),
    keepTogetherBlocks.map((block) => ({
      start: block.start * captureScale,
      end: block.end * captureScale,
    })),
    tableContinuationBlocks.map((table) => ({
      start: table.start * captureScale,
      end: table.end * captureScale,
      headerStart: table.headerStart * captureScale,
      headerEnd: table.headerEnd * captureScale,
    })),
  );

  ranges.forEach((range, index) => {
    if (index > 0) pdf.addPage("a4", "portrait");
    const activeTable = tableContinuationBlocks
      .filter((table) => table.start * captureScale < range.start &&
        table.end * captureScale > range.start)
      .sort((a, b) => b.start - a.start)[0];
    const repeatedHeader = activeTable
      ? {
          start: activeTable.headerStart * captureScale,
          end: activeTable.headerEnd * captureScale,
        }
      : undefined;
    const pageCanvas = makePageCanvas(canvas, range, repeatedHeader);
    const imageData = pageCanvas.toDataURL("image/jpeg", 0.94);
    const segmentHeightMm = pageCanvas.height * pxToMm;

    pdf.addImage(
      imageData,
      "JPEG",
      marginX,
      marginTop,
      contentWidth,
      Math.min(contentHeight, segmentHeightMm),
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
