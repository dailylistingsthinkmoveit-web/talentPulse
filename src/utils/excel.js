/**
 * ThinkmoveIT — Excel Export Utility
 * Uses SheetJS (xlsx) to generate a formatted .xlsx file from job results.
 */

import * as XLSX from "xlsx";

const COLUMNS = [
  { key: "companyName", label: "Company Name", width: 25 },
  { key: "jobTitle", label: "Job Title", width: 35 },
  { key: "location", label: "Location", width: 28 },
  { key: "jobType", label: "Job Type", width: 14 },
  { key: "workType", label: "Work Type", width: 12 },
  { key: "salary", label: "Salary", width: 30 },
  { key: "experienceLevel", label: "Experience", width: 14 },
  { key: "datePosted", label: "Date Posted", width: 15 },
  { key: "publisher", label: "Source", width: 18 },
  { key: "applyUrl", label: "Apply URL", width: 55 },
];

/**
 * Downloads job results as a formatted Excel file.
 *
 * @param {Object[]} jobs        - Normalized job objects from jsearch.js
 * @param {string}   jobPosition - Used in filename + metadata row
 * @param {string}   province    - Used in metadata row
 * @param {string}   country     - Used in metadata row
 */
export function downloadExcel(jobs, jobPosition, province, country) {
  const wb = XLSX.utils.book_new();

  // ── Build rows ────────────────────────────────────────────────────────────
  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const locationStr = [province, country].filter(Boolean).join(", ");

  // Row 1 — Title
  const titleRow = ["ThinkmoveIT Job Search Results"];

  // Row 2 — Search metadata
  const metaRow = [
    `Search: ${jobPosition}  |  Location: ${locationStr}  |  Date: ${today}  |  Results: ${jobs.length}`,
  ];

  // Row 3 — blank
  const blankRow = [""];

  // Row 4 — Column headers
  const headerRow = COLUMNS.map((c) => c.label);

  // Rows 5+ — Data
  const dataRows = jobs.map((job) =>
    COLUMNS.map((c) => job[c.key] || "")
  );

  // Combine all rows
  const allRows = [titleRow, metaRow, blankRow, headerRow, ...dataRows];

  const ws = XLSX.utils.aoa_to_sheet(allRows);

  // ── Column widths ─────────────────────────────────────────────────────────
  ws["!cols"] = COLUMNS.map((c) => ({ wch: c.width }));

  // ── Merge title cell across all columns ───────────────────────────────────
  const numCols = COLUMNS.length;
  ws["!merges"] = [
    // Title row: A1 across all columns
    { s: { r: 0, c: 0 }, e: { r: 0, c: numCols - 1 } },
    // Meta row: A2 across all columns
    { s: { r: 1, c: 0 }, e: { r: 1, c: numCols - 1 } },
  ];

  // ── Cell styles (supported by xlsx-style or SheetJS Pro; gracefully ignored otherwise) ──
  // Title style — large, bold, navy
  const titleCellRef = XLSX.utils.encode_cell({ r: 0, c: 0 });
  if (!ws[titleCellRef]) ws[titleCellRef] = { v: titleRow[0], t: "s" };
  ws[titleCellRef].s = {
    font: { bold: true, sz: 16, color: { rgb: "1B2A4A" } },
    alignment: { horizontal: "center", vertical: "center" },
    fill: { fgColor: { rgb: "EFF6FF" } },
  };

  // Meta row style
  const metaCellRef = XLSX.utils.encode_cell({ r: 1, c: 0 });
  if (!ws[metaCellRef]) ws[metaCellRef] = { v: metaRow[0], t: "s" };
  ws[metaCellRef].s = {
    font: { italic: true, sz: 11, color: { rgb: "6B7280" } },
    alignment: { horizontal: "center", vertical: "center" },
    fill: { fgColor: { rgb: "F9FAFB" } },
  };

  // Header row styles — bold, light blue background
  COLUMNS.forEach((_, colIndex) => {
    const cellRef = XLSX.utils.encode_cell({ r: 3, c: colIndex });
    if (!ws[cellRef]) ws[cellRef] = { v: COLUMNS[colIndex].label, t: "s" };
    ws[cellRef].s = {
      font: { bold: true, sz: 12, color: { rgb: "1B2A4A" } },
      fill: { fgColor: { rgb: "DBEAFE" } },
      alignment: { horizontal: "center", vertical: "center", wrapText: true },
      border: {
        bottom: { style: "medium", color: { rgb: "2563EB" } },
      },
    };
  });

  // Data row styles — alternating row colors + hyperlinks for Apply URL (col 9)
  const applyUrlColIndex = 9;

  jobs.forEach((job, rowIndex) => {
    const sheetRow = rowIndex + 4; // offset: 3 header rows + 1 blank row (0-indexed)
    const isEven = rowIndex % 2 === 0;
    const bgColor = isEven ? "FFFFFF" : "F0F4FF";

    COLUMNS.forEach((_, colIndex) => {
      const cellRef = XLSX.utils.encode_cell({ r: sheetRow, c: colIndex });
      if (ws[cellRef]) {
        ws[cellRef].s = {
          fill: { fgColor: { rgb: bgColor } },
          alignment: { vertical: "center", wrapText: false },
          font: { sz: 11 },
        };
      }

      // ── Apply URL → clickable hyperlink ──────────────────────────────
      if (colIndex === applyUrlColIndex) {
        const url = job.applyUrl;
        if (url && url !== "#") {
          // Display short label instead of the raw URL, link opens the URL
          ws[cellRef] = {
            v: "Apply →",
            t: "s",
            l: { Target: url, Tooltip: url },
            s: {
              fill: { fgColor: { rgb: bgColor } },
              font: { sz: 11, color: { rgb: "2563EB" }, underline: true },
              alignment: { vertical: "center" },
            },
          };
        }
      }
    });
  });

  // ── Row heights ───────────────────────────────────────────────────────────
  ws["!rows"] = [
    { hpt: 32 }, // Title row
    { hpt: 20 }, // Meta row
    { hpt: 8 },  // Blank row
    { hpt: 22 }, // Header row
    // Data rows get default height
  ];

  // ── Add sheet to workbook ─────────────────────────────────────────────────
  XLSX.utils.book_append_sheet(wb, ws, "Jobs");

  // ── Generate filename ─────────────────────────────────────────────────────
  const dateStr = new Date().toISOString().split("T")[0]; // e.g. 2026-05-07
  const safePosition = jobPosition.replace(/[^a-zA-Z0-9]/g, "_");
  const filename = `ThinkmoveIT_${safePosition}_${dateStr}.xlsx`;

  // ── Trigger download ──────────────────────────────────────────────────────
  XLSX.writeFile(wb, filename);
}
