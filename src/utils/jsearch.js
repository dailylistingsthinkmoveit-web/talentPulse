/**
 * TalentPulse — JSearch API call logic
 * Handles building the request, calling the backend proxy, and mapping results.
 */

const NUM_PAGES_MAP = {
  10: 1,
  20: 2,
  30: 3,
  50: 5,
};

/**
 * Maps a raw JSearch job object to our normalized display format.
 * @param {Object} job - Raw job from JSearch API
 * @returns {Object} Normalized job object
 */
function mapJob(job) {
  // ── Salary ────────────────────────────────────────────────────────────────
  let salary = "Not specified";
  if (job.job_min_salary && job.job_max_salary) {
    const currency = job.job_salary_currency || "$";
    const period = job.job_salary_period
      ? ` / ${job.job_salary_period.toLowerCase()}`
      : "";
    salary = `${currency}${Number(job.job_min_salary).toLocaleString()} – ${currency}${Number(job.job_max_salary).toLocaleString()}${period}`;
  } else if (job.job_salary_period) {
    salary = job.job_salary_period;
  }

  // ── Work type ─────────────────────────────────────────────────────────────
  let workType = "On-Site";
  if (job.job_is_remote) {
    workType = "Remote";
  } else if (
    job.job_description &&
    job.job_description.toLowerCase().includes("hybrid")
  ) {
    workType = "Hybrid";
  }

  // ── Experience ────────────────────────────────────────────────────────────
  let experienceLevel = "Not specified";
  const months =
    job.job_required_experience?.required_experience_in_months;
  if (months != null && months >= 0) {
    const years = Math.round(months / 12);
    experienceLevel = years === 0 ? "Entry level" : `${years} yr${years !== 1 ? "s" : ""}`;
  }

  // ── Date posted ───────────────────────────────────────────────────────────
  let datePosted = "Not specified";
  if (job.job_posted_at_datetime_utc) {
    try {
      datePosted = new Date(job.job_posted_at_datetime_utc).toLocaleDateString(
        "en-US",
        { year: "numeric", month: "short", day: "numeric" }
      );
    } catch {
      datePosted = "Not specified";
    }
  }

  return {
    id: job.job_id || `${job.employer_name}-${job.job_title}-${Math.random()}`,
    companyName: job.employer_name || "Not specified",
    jobTitle: job.job_title || "Not specified",
    location:
      [job.job_city, job.job_state, job.job_country]
        .filter(Boolean)
        .join(", ") || "Not specified",
    jobType: formatJobType(job.job_employment_type) || "Not specified",
    workType,
    salary,
    experienceLevel,
    datePosted,
    publisher: job.job_publisher || "Not specified",
    applyUrl: job.job_apply_link || "#",
  };
}

/**
 * Formats raw employment type string (e.g. FULLTIME → Full-Time).
 */
function formatJobType(raw) {
  const map = {
    FULLTIME: "Full-Time",
    PARTTIME: "Part-Time",
    CONTRACTOR: "Contract",
    INTERN: "Internship",
  };
  return map[raw] || raw;
}


/**
 * Searches for jobs by calling the TalentPulse backend proxy.
 *
 * @param {Object} formData - Values from JobForm
 * @param {string} formData.jobPosition
 * @param {string} formData.country
 * @param {string} formData.province
 * @param {string} formData.datePosted
 * @param {string[]} formData.jobTypes      - e.g. ["Full-Time", "Contract"]
 * @param {string[]} formData.workTypes     - e.g. ["Remote", "Hybrid"]
 * @param {string} formData.experienceLevel
 * @param {number} formData.numResults      - 10 | 20 | 30 | 50
 * @returns {Promise<Object[]>} Array of normalized job objects
 */
export async function searchJobs(formData) {
  const {
    jobPosition,
    country,
    province,
    datePosted,
    jobTypes = [],
    workTypes = [],
    experienceLevel,
    numResults,
  } = formData;

  // Build the location string for the query
  const locationParts = [province, country].filter(Boolean);
  const location = locationParts.join(" ");
  const query = jobPosition.trim();

  const numPages = NUM_PAGES_MAP[Number(numResults)] || 2;

  const params = new URLSearchParams({
    query,
    location,
    datePosted: datePosted || "Any Time",
    numPages: String(numPages),
  });

  if (jobTypes.length > 0) {
    params.set("jobType", jobTypes.join(","));
  }
  if (workTypes.length > 0) {
    params.set("workType", workTypes.join(","));
  }
  if (experienceLevel && experienceLevel !== "Any") {
    params.set("experienceLevel", experienceLevel);
  }

  const res = await fetch(`/api/jobs?${params.toString()}`);

  if (!res.ok) {
    let errMsg = `Request failed with status ${res.status}`;
    try {
      const body = await res.json();
      if (body.message) errMsg = body.message;
    } catch {
      // ignore parse error
    }
    const err = new Error(errMsg);
    err.status = res.status;
    throw err;
  }

  const data = await res.json();

  if (data.error) {
    throw new Error(data.message || "Unknown error from API");
  }

  let jobs = (data.jobs || []).map(mapJob);

  // ── Client-side filtering ─────────────────────────────────────────────────
  // JSearch's server-side type filters are unreliable — many listings have
  // missing or mismatched metadata. We filter strictly after mapping, when
  // values are guaranteed to be in our normalised format.

  // Job Type: e.g. ["Full-Time", "Contract"]
  if (jobTypes.length > 0) {
    jobs = jobs.filter((job) => jobTypes.includes(job.jobType));
  }

  // Work Type: e.g. ["Remote", "Hybrid", "On-Site"]
  // JSearch has no server-side hybrid/on-site filter at all, so this is
  // the only way to enforce it.
  if (workTypes.length > 0) {
    jobs = jobs.filter((job) => workTypes.includes(job.workType));
  }

  return jobs;
}
