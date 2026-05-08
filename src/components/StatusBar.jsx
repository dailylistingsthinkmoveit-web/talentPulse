/**
 * StatusBar — Shows loading / success / error / empty states.
 * status: "idle" | "loading" | "success" | "empty" | "error"
 */
export default function StatusBar({ status, jobPosition, location, count, errorMessage }) {
  if (status === "idle") return null;

  if (status === "loading") {
    return (
      <div className="status-bar status-loading" role="status" aria-live="polite">
        <span className="spinner" aria-hidden="true" />
        <span>
          Searching for <strong>{jobPosition}</strong> jobs
          {location ? ` in ${location}` : ""}…{" "}
          <span className="status-hint">This usually takes 5–10 seconds.</span>
        </span>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="status-bar status-success" role="status" aria-live="polite">
        <span className="status-icon">✓</span>
        <span>
          Found <strong>{count} job{count !== 1 ? "s" : ""}</strong>. Showing results below.
        </span>
      </div>
    );
  }

  if (status === "empty") {
    return (
      <div className="status-bar status-warning" role="status" aria-live="polite">
        <span className="status-icon">⚠</span>
        <span>
          No jobs found for <strong>{jobPosition}</strong>
          {location ? ` in ${location}` : ""}. Try broader search terms or
          different filters.
        </span>
      </div>
    );
  }

  if (status === "error") {
    const is429 =
      errorMessage && (errorMessage.includes("429") || errorMessage.toLowerCase().includes("too many"));
    return (
      <div className="status-bar status-error" role="alert" aria-live="assertive">
        <span className="status-icon">✕</span>
        <span>
          {is429
            ? "Too many requests. Please wait a moment and try again."
            : errorMessage ||
              "Something went wrong. Please check your connection and try again."}
        </span>
      </div>
    );
  }

  return null;
}
