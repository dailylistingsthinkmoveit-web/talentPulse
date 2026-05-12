import { useState, useCallback } from "react";
import JobForm from "./components/JobForm";
import ResultsTable from "./components/ResultsTable";
import StatusBar from "./components/StatusBar";
import { searchJobs } from "./utils/jsearch";
import "./App.css";

export default function App() {
  const [status, setStatus] = useState("idle"); // "idle"|"loading"|"success"|"empty"|"error"
  const [jobs, setJobs] = useState([]);
  const [searchParams, setSearchParams] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSearch = useCallback(async (formData) => {
    setStatus("loading");
    setJobs([]);
    setErrorMessage("");
    setSearchParams({ ...formData });

    try {
      const results = await searchJobs(formData);

      if (results.length === 0) {
        setStatus("empty");
      } else {
        setJobs(results);
        setStatus("success");
      }
    } catch (err) {
      console.error("Search failed:", err);
      setErrorMessage(err.message || "");
      setStatus("error");
    }
  }, []);

  const isLoading = status === "loading";
  const locationStr = searchParams
    ? [searchParams.province, searchParams.country].filter(Boolean).join(", ")
    : "";

  return (
    <div className="app-root">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="app-header">
        <div className="header-inner">
          <div className="logo-mark" aria-hidden="true">TP</div>
          <div className="logo-text">
            <span className="logo-name">TalentPulse</span> 
          </div>
        </div>
      </header>

      {/* ── Main layout ─────────────────────────────────────────────────── */}
      <main className="app-main">
        <div className="layout">

          {/* Left sidebar — Search form */}
          <aside className="layout-sidebar">
            <JobForm onSearch={handleSearch} isLoading={isLoading} />
          </aside>

          {/* Right panel — Results */}
          <div className="layout-content">
            <StatusBar
              status={status}
              jobPosition={searchParams?.jobPosition}
              location={locationStr}
              count={jobs.length}
              errorMessage={errorMessage}
            />

            {status === "idle" && (
              <div className="empty-state card">
                <div className="empty-state-icon" aria-hidden="true">🔍</div>
                <h2 className="empty-state-title">Find your next opportunity</h2>
                <p className="empty-state-body">
                  Fill in the search form and click <strong>Search Jobs</strong> to
                  get real-time job listings from across the web — aggregated from
                  LinkedIn, Indeed, Glassdoor, and more.
                </p>
                <ul className="empty-state-features">
                  <li>Filter by job type, work arrangement &amp; experience</li>
                  <li>Up to 50 results per search</li>
                  <li>Download results as a formatted Excel file</li>
                </ul>
              </div>
            )}

            <ResultsTable jobs={jobs} searchParams={searchParams} />
          </div>
        </div>
      </main>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer className="app-footer">
        <p>
          TalentPulse &copy; {new Date().getFullYear()} &mdash; Powered by{" "}
          <b>Think & Move IT Solutions. All rights reserved.</b>
        </p>
      </footer>
    </div>
  );
}
