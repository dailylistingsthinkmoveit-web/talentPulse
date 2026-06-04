/**
 * TalentPulse — Local Express Dev Server
 * Mirrors the Vercel /api/jobs.js serverless function for local development.
 * Run with: node server.js   (or via npm run dev with concurrently)
 */

require("dotenv").config();
const express = require("express");
const xlsx = require("xlsx");
const { Resend } = require("resend");
const app = express();
const PORT = 3001;

app.use(express.json());

// ── Same mapping tables as /api/jobs.js ────────────────────────────────────
const DATE_POSTED_MAP = {
  "Any Time": "all",
  "Last 24 Hours": "today",
  "Last 3 Days": "3days",
  "Last 7 Days": "week",
  "Last 30 Days": "month",
};

const JOB_TYPE_MAP = {
  "Full-Time": "FULLTIME",
  "Part-Time": "PARTTIME",
  Contract: "CONTRACTOR",
  Internship: "INTERN",
};

const EXPERIENCE_MAP = {
  "Entry Level": "no_experience",
  "Mid Level": "more_than_3_years_experience",
  "Senior Level": "more_than_3_years_experience",
};

// ── CORS ───────────────────────────────────────────────────────────────────
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

// ── Chrome DevTools probe — silence the CSP console noise ─────────────────
app.get("/.well-known/appspecific/com.chrome.devtools.json", (req, res) => {
  res.status(404).end();
});

// ── GET /api/jobs ──────────────────────────────────────────────────────────
app.get("/api/jobs", async (req, res) => {
  try {
    const {
      query,
      location,
      datePosted = "Any Time",
      jobType,
      workType,
      experienceLevel,
      numPages = "1",
    } = req.query;

    if (!query) {
      return res.status(400).json({ error: true, message: "query parameter is required" });
    }

    const searchQuery = location ? `${query} in ${location}` : query;
    const datePostedMapped = DATE_POSTED_MAP[datePosted] || "all";

    // Map employment types
    let employmentTypes;
    if (jobType) {
      const types = jobType.split(",");
      const mapped = types.map((t) => JOB_TYPE_MAP[t.trim()]).filter(Boolean);
      if (mapped.length > 0) employmentTypes = mapped.join(",");
    }

    // Remote only
    let remoteOnly = false;
    if (workType) {
      const workTypes = workType.split(",");
      remoteOnly =
        workTypes.length === 1 && workTypes[0].trim().toLowerCase() === "remote";
    }

    // Experience
    const jobRequirements = EXPERIENCE_MAP[experienceLevel] || undefined;

    // Pages
    const pages = Math.min(Math.max(parseInt(numPages, 10) || 1, 1), 5);

    const params = new URLSearchParams({
      query: searchQuery,
      page: "1",
      num_pages: String(pages),
      date_posted: datePostedMapped,
    });
    if (remoteOnly) params.append("remote_jobs_only", "true");
    if (employmentTypes) params.append("employment_types", employmentTypes);
    if (jobRequirements) params.append("job_requirements", jobRequirements);

    const apiUrl = `https://jsearch.p.rapidapi.com/search?${params.toString()}`;

    const apiKey = process.env.RAPIDAPI_KEY;
    if (!apiKey || apiKey === "paste_your_rapidapi_key_here") {
      return res.status(500).json({
        error: true,
        message: "RAPIDAPI_KEY is not set. Please add it to your .env file.",
      });
    }

    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "X-RapidAPI-Key": apiKey,
        "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
      },
    });

    if (!response.ok) {
      if (response.status === 429) {
        return res.status(429).json({
          error: true,
          message: "Too many requests. Please wait a moment and try again.",
        });
      }
      return res.status(response.status).json({
        error: true,
        message: `JSearch API returned status ${response.status}`,
      });
    }

    const data = await response.json();
    const jobs = data.data || [];
    return res.status(200).json({ jobs, total: jobs.length });
  } catch (err) {
    console.error("Server error:", err.message);
    return res.status(500).json({ error: true, message: err.message });
  }
});

// ── POST /api/send-email ───────────────────────────────────────────────────
app.post("/api/send-email", async (req, res) => {
  try {
    const { jobs, searchParams } = req.body;

    // ── Validate ─────────────────────────────────────────────────────────
    if (!jobs || jobs.length === 0) {
      return res.status(400).json({ success: false, message: "No jobs to send" });
    }

    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey || resendKey === "your_resend_api_key_here") {
      return res.status(500).json({
        success: false,
        message: "RESEND_API_KEY is not set. Please add it to your .env file.",
      });
    }

    const { jobPosition = "Jobs", location = "", date } = searchParams || {};
    const today = date || new Date().toLocaleDateString("en-US", {
      year: "numeric", month: "long", day: "numeric",
    });
    const todayShort = new Date().toISOString().split("T")[0];

    // ── Build Excel in memory ─────────────────────────────────────────────
    const COLUMNS = [
      { key: "companyName",    label: "Company Name",  width: 25 },
      { key: "jobTitle",       label: "Job Title",     width: 35 },
      { key: "location",       label: "Location",      width: 28 },
      { key: "jobType",        label: "Job Type",      width: 14 },
      { key: "workType",       label: "Work Type",     width: 12 },
      { key: "salary",         label: "Salary",        width: 30 },
      { key: "experienceLevel",label: "Experience",    width: 14 },
      { key: "datePosted",     label: "Date Posted",   width: 15 },
      { key: "publisher",      label: "Source",        width: 18 },
      { key: "applyUrl",       label: "Apply URL",     width: 55 },
    ];

    const titleRow   = ["ThinkmoveIT Job Search Results"];
    const metaRow    = [`Position: ${jobPosition}  |  Location: ${location}  |  Date: ${today}  |  Results: ${jobs.length}`];
    const blankRow   = [""];
    const headerRow  = COLUMNS.map((c) => c.label);
    const dataRows   = jobs.map((job) => COLUMNS.map((c) => job[c.key] || ""));

    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.aoa_to_sheet([titleRow, metaRow, blankRow, headerRow, ...dataRows]);

    ws["!cols"] = COLUMNS.map((c) => ({ wch: c.width }));
    ws["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: COLUMNS.length - 1 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: COLUMNS.length - 1 } },
    ];

    // Header row styles
    COLUMNS.forEach((col, colIndex) => {
      const cellRef = xlsx.utils.encode_cell({ r: 3, c: colIndex });
      if (!ws[cellRef]) ws[cellRef] = { v: col.label, t: "s" };
      ws[cellRef].s = {
        font: { bold: true, sz: 12, color: { rgb: "1B2A4A" } },
        fill: { fgColor: { rgb: "DBEAFE" } },
        alignment: { horizontal: "center", vertical: "center" },
      };
    });

    // Data row alternating colors + hyperlinks for Apply URL (col 9)
    const applyUrlColIndex = 9;
    jobs.forEach((job, rowIndex) => {
      const sheetRow = rowIndex + 4;
      const bgColor = rowIndex % 2 === 0 ? "FFFFFF" : "F9FAFB";
      COLUMNS.forEach((_, colIndex) => {
        const cellRef = xlsx.utils.encode_cell({ r: sheetRow, c: colIndex });
        if (ws[cellRef]) {
          ws[cellRef].s = { fill: { fgColor: { rgb: bgColor } }, font: { sz: 11 } };
        }
        // Apply URL → clickable hyperlink
        if (colIndex === applyUrlColIndex) {
          const url = job.applyUrl;
          if (url && url !== "#") {
            ws[cellRef] = {
              v: "Apply →",
              t: "s",
              l: { Target: url, Tooltip: url },
              s: {
                fill: { fgColor: { rgb: bgColor } },
                font: { sz: 11, color: { rgb: "2563EB" }, underline: true },
              },
            };
          }
        }
      });
    });

    xlsx.utils.book_append_sheet(wb, ws, "Jobs");

    const safePosition = jobPosition.replace(/[^a-zA-Z0-9]/g, "_");
    const filename = `ThinkmoveIT_${safePosition}_${todayShort}.xlsx`;
    const base64Excel = xlsx.write(wb, { type: "base64", bookType: "xlsx" });

    // ── Send via Resend ───────────────────────────────────────────────────
    const resend = new Resend(resendKey);

    const htmlBody = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; background: #F8F9FC;">
  <div style="background: #1B2A4A; border-radius: 12px; padding: 24px; margin-bottom: 24px; text-align: center;">
    <h1 style="color: white; font-size: 24px; margin: 0;">ThinkmoveIT</h1>
    <p style="color: #93C5FD; margin: 8px 0 0; font-size: 14px;">Real-time job search results</p>
  </div>
  <div style="background: white; border-radius: 12px; padding: 24px; margin-bottom: 16px;">
    <h2 style="color: #111827; font-size: 18px; margin: 0 0 16px;">Your job search results are ready</h2>
    <p style="color: #6B7280; font-size: 15px; line-height: 1.6; margin: 0 0 16px;">
      Please find attached the Excel file containing <strong>${jobs.length} job listings</strong> for
      <strong>${jobPosition}</strong> in <strong>${location}</strong>.
    </p>
    <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
      <tr style="border-bottom: 1px solid #E5E7EB;">
        <td style="padding: 10px 0; color: #6B7280;">Position</td>
        <td style="padding: 10px 0; color: #111827; font-weight: 500; text-align: right;">${jobPosition}</td>
      </tr>
      <tr style="border-bottom: 1px solid #E5E7EB;">
        <td style="padding: 10px 0; color: #6B7280;">Location</td>
        <td style="padding: 10px 0; color: #111827; font-weight: 500; text-align: right;">${location}</td>
      </tr>
      <tr style="border-bottom: 1px solid #E5E7EB;">
        <td style="padding: 10px 0; color: #6B7280;">Total Jobs</td>
        <td style="padding: 10px 0; color: #111827; font-weight: 500; text-align: right;">${jobs.length} listings</td>
      </tr>
      <tr>
        <td style="padding: 10px 0; color: #6B7280;">Sent On</td>
        <td style="padding: 10px 0; color: #111827; font-weight: 500; text-align: right;">${today}</td>
      </tr>
    </table>
  </div>
  <p style="color: #9CA3AF; font-size: 12px; text-align: center; margin: 0;">
    Sent via ThinkmoveIT · Real-time job search platform
  </p>
</div>`;

    await resend.emails.send({
      from: "ThinkmoveIT <onboarding@resend.dev>",
      to: process.env.RECIPIENT_EMAIL,
      subject: `Job Search Results — ${jobPosition} in ${location}`,
      html: htmlBody,
      attachments: [
        {
          filename,
          content: base64Excel,
          encoding: "base64",
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        },
      ],
    });

    return res.status(200).json({ success: true, message: "Email sent" });
  } catch (err) {
    console.error("Send email error:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── Start ──────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅  TalentPulse API server running at http://localhost:${PORT}`);
  console.log(`   Endpoint: http://localhost:${PORT}/api/jobs`);
});
