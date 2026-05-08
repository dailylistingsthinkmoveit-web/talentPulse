/**
 * TalentPulse — Vercel Serverless Function
 * Secure backend proxy between React frontend and JSearch API.
 * The RAPIDAPI_KEY is never exposed to the client.
 */

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


module.exports = async function handler(req, res) {
  // ── CORS headers ──────────────────────────────────────────────────────────
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Handle preflight
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: true, message: "Method not allowed" });
  }

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
      return res
        .status(400)
        .json({ error: true, message: "query parameter is required" });
    }

    // ── Build JSearch query string ─────────────────────────────────────────
    const searchQuery = location ? `${query} in ${location}` : query;

    // ── Map date_posted ────────────────────────────────────────────────────
    const datePostedMapped = DATE_POSTED_MAP[datePosted] || "all";

    // ── Map employment_types ───────────────────────────────────────────────
    let employmentTypes = undefined;
    if (jobType) {
      const types = Array.isArray(jobType) ? jobType : jobType.split(",");
      const mapped = types
        .map((t) => JOB_TYPE_MAP[t.trim()])
        .filter(Boolean);
      if (mapped.length > 0) {
        employmentTypes = mapped.join(",");
      }
    }

    // ── Map remote_jobs_only ───────────────────────────────────────────────
    let remoteOnly = false;
    if (workType) {
      const workTypes = Array.isArray(workType)
        ? workType
        : workType.split(",");
      // Only set remote_jobs_only=true when Remote is the ONLY workType selected
      remoteOnly =
        workTypes.length === 1 &&
        workTypes[0].trim().toLowerCase() === "remote";
    }

    // ── Map job_requirements (experience) ─────────────────────────────────
    const jobRequirements = EXPERIENCE_MAP[experienceLevel] || undefined;

    // ── Validate num_pages ─────────────────────────────────────────────────
    const pages = Math.min(Math.max(parseInt(numPages, 10) || 1, 1), 5);

    // ── Build JSearch URL ─────────────────────────────────────────────────
    const params = new URLSearchParams({
      query: searchQuery,
      page: "1",
      num_pages: String(pages),
      date_posted: datePostedMapped,
    });

    if (remoteOnly) {
      params.append("remote_jobs_only", "true");
    }
    if (employmentTypes) {
      params.append("employment_types", employmentTypes);
    }
    if (jobRequirements) {
      params.append("job_requirements", jobRequirements);
    }

    const apiUrl = `https://jsearch.p.rapidapi.com/search?${params.toString()}`;

    // ── Call JSearch API ───────────────────────────────────────────────────
    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "X-RapidAPI-Key": process.env.RAPIDAPI_KEY,
        "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("JSearch API error:", response.status, errorText);

      if (response.status === 429) {
        return res.status(429).json({
          error: true,
          message:
            "Too many requests to JSearch API. Please wait a moment and try again.",
        });
      }

      return res.status(response.status).json({
        error: true,
        message: `JSearch API returned status ${response.status}`,
      });
    }

    const data = await response.json();

    // Return only the jobs array — never expose the raw API key or internals
    const jobs = data.data || [];
    return res.status(200).json({ jobs, total: jobs.length });
  } catch (err) {
    console.error("Serverless function error:", err);
    return res.status(500).json({
      error: true,
      message: err.message || "Internal server error",
    });
  }
};
