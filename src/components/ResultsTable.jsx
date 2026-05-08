import { useState, useEffect, useRef } from "react";
import { downloadExcel } from "../utils/excel";
import { sendJobsEmail } from "../utils/sendEmail";

const WORK_TYPE_BADGE = {
  Remote: "badge-remote",
  Hybrid: "badge-hybrid",
  "On-Site": "badge-onsite",
};

const JOB_TYPE_BADGE = {
  "Full-Time": "badge-fulltime",
  "Part-Time": "badge-parttime",
  Contract: "badge-contract",
  Internship: "badge-intern",
};

// ── Toast component ──────────────────────────────────────────────────────────
function Toast({ message, type, onDone }) {
  const [visible, setVisible] = useState(true);
  const timerRef = useRef(null);

  useEffect(() => {
    // Start fade-out 600ms before removal
    timerRef.current = setTimeout(() => setVisible(false), 3400);
    return () => clearTimeout(timerRef.current);
  }, []);

  // When fade-out animation ends, notify parent to remove the toast
  function handleAnimEnd() {
    if (!visible) onDone();
  }

  return (
    <div
      className={`toast toast-${type} ${visible ? "toast-in" : "toast-out"}`}
      onAnimationEnd={handleAnimEnd}
      role={type === "error" ? "alert" : "status"}
    >
      {message}
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
export default function ResultsTable({ jobs, searchParams }) {
  const [isSending, setIsSending] = useState(false);
  const [toast, setToast] = useState(null); // { message, type }

  if (!jobs || jobs.length === 0) return null;

  const { jobPosition, province, country } = searchParams || {};

  function handleDownload() {
    downloadExcel(jobs, jobPosition || "Jobs", province || "", country || "");
  }

  async function handleSendEmail() {
    if (!jobs || jobs.length === 0) {
      setToast({ message: "No jobs to send. Please search first.", type: "error" });
      return;
    }

    setIsSending(true);
    try {
      await sendJobsEmail({
        jobs,
        searchParams: {
          jobPosition: jobPosition || "Jobs",
          location: [province, country].filter(Boolean).join(", ") || "Unknown",
          date: new Date().toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          }),
        },
      });
      setToast({
        message: "✓ Results sent to sidhanth.ui@gmail.com",
        type: "success",
      });
    } catch (err) {
      setToast({
        message: "✗ Failed to send email. Please try again.",
        type: "error",
      });
    } finally {
      setIsSending(false);
    }
  }

  return (
    <>
      {/* ── Toast notification ──────────────────────────────────────────── */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onDone={() => setToast(null)}
        />
      )}

      <section className="results-section fade-in">
        {/* ── Header row ─────────────────────────────────────────────────── */}
        <div className="results-header">
          <div className="results-meta">
            <h2 className="results-title">
              Found{" "}
              <span className="results-count">{jobs.length}</span>{" "}
              job{jobs.length !== 1 ? "s" : ""}
            </h2>
            {jobPosition && (
              <p className="results-subtitle">
                {jobPosition}
                {(province || country) && (
                  <> &mdash; {[province, country].filter(Boolean).join(", ")}</>
                )}
              </p>
            )}
          </div>

          <div className="results-actions">
            <button
              className="btn btn-download"
              onClick={handleDownload}
              title="Download results as Excel file"
            >
              <span className="btn-icon">⬇</span>
              Download Excel
            </button>

            <button
              className="btn btn-email"
              onClick={handleSendEmail}
              disabled={isSending}
              title="Send results to sidhanth.ui@gmail.com"
            >
              {isSending ? (
                <span className="btn-loading">
                  <span className="spinner-inline" />
                  Sending…
                </span>
              ) : (
                <>
                  <span className="btn-icon">✉</span>
                  Send Email
                </>
              )}
            </button>
          </div>
        </div>

        {/* ── Scrollable table ───────────────────────────────────────────── */}
        <div className="table-wrapper">
          <table className="jobs-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Company</th>
                <th>Job Title</th>
                <th>Location</th>
                <th>Type</th>
                <th>Work</th>
                <th>Salary</th>
                <th>Experience</th>
                <th>Posted</th>
                <th>Source</th>
                <th>Apply</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job, idx) => (
                <tr key={job.id || idx} className={idx % 2 === 0 ? "row-even" : "row-odd"}>
                  <td className="col-num">{idx + 1}</td>
                  <td className="col-company">
                    <span className="company-name">{job.companyName}</span>
                  </td>
                  <td className="col-title">{job.jobTitle}</td>
                  <td className="col-location">{job.location}</td>
                  <td className="col-type">
                    <span className={`badge ${JOB_TYPE_BADGE[job.jobType] || "badge-default"}`}>
                      {job.jobType}
                    </span>
                  </td>
                  <td className="col-work">
                    <span className={`badge ${WORK_TYPE_BADGE[job.workType] || "badge-default"}`}>
                      {job.workType}
                    </span>
                  </td>
                  <td className="col-salary">{job.salary}</td>
                  <td className="col-exp">{job.experienceLevel}</td>
                  <td className="col-date">{job.datePosted}</td>
                  <td className="col-source">{job.publisher}</td>
                  <td className="col-apply">
                    {job.applyUrl && job.applyUrl !== "#" ? (
                      <a
                        href={job.applyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="apply-link"
                      >
                        Apply →
                      </a>
                    ) : (
                      <span className="apply-unavailable">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <div className="results-footer">
          <span>
            Showing {jobs.length} result{jobs.length !== 1 ? "s" : ""}
          </span>
          <button className="btn btn-download btn-sm" onClick={handleDownload}>
            <span className="btn-icon">⬇</span>
            Download Excel
          </button>
        </div>
      </section>
    </>
  );
}
