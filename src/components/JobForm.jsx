import { useState } from "react";

const DATE_OPTIONS = [
  "Any Time",
  "Last 24 Hours",
  "Last 3 Days",
  "Last 7 Days",
  "Last 30 Days",
];

const JOB_TYPE_OPTIONS = ["Full-Time", "Part-Time", "Contract", "Internship"];
const WORK_TYPE_OPTIONS = ["Remote", "Hybrid", "On-Site"];
const EXPERIENCE_OPTIONS = ["Any", "Entry Level", "Mid Level", "Senior Level"];
const RESULT_OPTIONS = [10, 20, 30, 50];

const INITIAL_STATE = {
  jobPosition: "",
  country: "",
  province: "",
  datePosted: "Last 7 Days",
  jobTypes: ["Full-Time"],
  workTypes: [],
  experienceLevel: "Any",
  numResults: 20,
};

export default function JobForm({ onSearch, isLoading }) {
  const [form, setForm] = useState(INITIAL_STATE);
  const [errors, setErrors] = useState({});

  // ── Validation ─────────────────────────────────────────────────────────────
  function validate() {
    const newErrors = {};
    if (!form.jobPosition.trim()) {
      newErrors.jobPosition = "Please enter a job position.";
    }
    if (!form.country.trim()) {
      newErrors.country = "Please enter a country.";
    }
    return newErrors;
  }

  // ── Handlers ───────────────────────────────────────────────────────────────
  function handleTextChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  }

  function handleSelectChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleCheckboxGroup(groupName, value) {
    setForm((prev) => {
      const current = prev[groupName];
      const updated = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      return { ...prev, [groupName]: updated };
    });
  }

  function handleSubmit(e) {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    onSearch(form);
  }

  function handleReset() {
    setForm(INITIAL_STATE);
    setErrors({});
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <form className="job-form card" onSubmit={handleSubmit} noValidate>
      <h2 className="form-title">Search Jobs</h2>

      {/* Job Position */}
      <div className={`form-group ${errors.jobPosition ? "has-error" : ""}`}>
        <label htmlFor="jobPosition">
          Job Position <span className="required">*</span>
        </label>
        <input
          id="jobPosition"
          name="jobPosition"
          type="text"
          value={form.jobPosition}
          onChange={handleTextChange}
          placeholder="e.g. Accountant, React Developer, Physiotherapist"
          disabled={isLoading}
          autoComplete="off"
        />
        {errors.jobPosition && (
          <span className="field-error">{errors.jobPosition}</span>
        )}
      </div>

      {/* Country */}
      <div className={`form-group ${errors.country ? "has-error" : ""}`}>
        <label htmlFor="country">
          Country <span className="required">*</span>
        </label>
        <input
          id="country"
          name="country"
          type="text"
          value={form.country}
          onChange={handleTextChange}
          placeholder="e.g. Canada"
          disabled={isLoading}
          autoComplete="off"
        />
        {errors.country && (
          <span className="field-error">{errors.country}</span>
        )}
      </div>

      {/* Province / State */}
      <div className="form-group">
        <label htmlFor="province">Province / State / City</label>
        <input
          id="province"
          name="province"
          type="text"
          value={form.province}
          onChange={handleTextChange}
          placeholder="e.g. Ontario"
          disabled={isLoading}
          autoComplete="off"
        />
      </div>

      {/* Date Posted */}
      <div className="form-group">
        <label htmlFor="datePosted">Date Posted</label>
        <select
          id="datePosted"
          name="datePosted"
          value={form.datePosted}
          onChange={handleSelectChange}
          disabled={isLoading}
        >
          {DATE_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>

      {/* Job Type */}
      <div className="form-group">
        <label className="group-label">Job Type</label>
        <div className="checkbox-grid">
          {JOB_TYPE_OPTIONS.map((opt) => (
            <label key={opt} className="checkbox-label">
              <input
                type="checkbox"
                checked={form.jobTypes.includes(opt)}
                onChange={() => handleCheckboxGroup("jobTypes", opt)}
                disabled={isLoading}
              />
              <span className="checkbox-custom" />
              {opt}
            </label>
          ))}
        </div>
      </div>

      {/* Work Type */}
      <div className="form-group">
        <label className="group-label">Work Type</label>
        <div className="checkbox-grid">
          {WORK_TYPE_OPTIONS.map((opt) => (
            <label key={opt} className="checkbox-label">
              <input
                type="checkbox"
                checked={form.workTypes.includes(opt)}
                onChange={() => handleCheckboxGroup("workTypes", opt)}
                disabled={isLoading}
              />
              <span className="checkbox-custom" />
              {opt}
            </label>
          ))}
        </div>
      </div>

      {/* Experience Level */}
      <div className="form-group">
        <label htmlFor="experienceLevel">Experience Level</label>
        <select
          id="experienceLevel"
          name="experienceLevel"
          value={form.experienceLevel}
          onChange={handleSelectChange}
          disabled={isLoading}
        >
          {EXPERIENCE_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>

      {/* Number of Results */}
      <div className="form-group">
        <label htmlFor="numResults">Number of Results</label>
        <select
          id="numResults"
          name="numResults"
          value={form.numResults}
          onChange={handleSelectChange}
          disabled={isLoading}
        >
          {RESULT_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
        <span className="field-hint">~10 results per API page</span>
      </div>

      {/* Actions */}
      <div className="form-actions">
        <button
          type="submit"
          className="btn btn-primary btn-search"
          disabled={isLoading}
        >
          {isLoading ? (
            <span className="btn-loading">
              <span className="spinner-inline" />
              Searching…
            </span>
          ) : (
            "Search Jobs"
          )}
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-reset"
          onClick={handleReset}
          disabled={isLoading}
        >
          Reset
        </button>
      </div>
    </form>
  );
}
