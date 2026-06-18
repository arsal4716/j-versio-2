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

// `suffix` (default true) appends " EST" to the formatted value. Pass
// { suffix: false } when the surrounding label already says EST (e.g. a column
// header "TimeStamp(EST)") so the value reads "06/18/2026, 05:30:28 PM".
export function formatEST(value, { suffix = true } = {}) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const formatted = new Intl.DateTimeFormat("en-US", EST_OPTIONS).format(d);
  return suffix ? `${formatted} EST` : formatted;
}

export default formatEST;
