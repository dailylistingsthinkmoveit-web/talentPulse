/**
 * TalentPulse — Send Email Utility
 * Calls the backend /api/send-email endpoint with the current jobs array.
 */

export async function sendJobsEmail({ jobs, searchParams }) {
  const response = await fetch("/api/send-email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jobs, searchParams }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to send email");
  }

  return data;
}
