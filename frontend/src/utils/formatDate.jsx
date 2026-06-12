// frontend/src/utils/formatDate.jsx
// Consistent EST (America/New_York) rendering for all user-facing timestamps.
// Timestamps are stored in UTC; this formats them for display only.
const EST_OPTIONS = {
  timeZone: "America/New_York",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: true,
};

export function formatEST(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return `${new Intl.DateTimeFormat("en-US", EST_OPTIONS).format(d)} EST`;
}

export default formatEST;
