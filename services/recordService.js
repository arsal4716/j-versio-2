// backend/services/portalRecordService.js
import mongoose from "mongoose";
import SubmissionLog from "../models/SubmissionLog.js";
import { decodeCursor, encodeCursor, buildCursorMatch } from "../utils/cursorPagination.js";

// Start of "today" in Eastern time, returned as a UTC Date. DST-aware: the
// Eastern offset is computed at the current instant rather than hard-coded.
function estStartOfTodayUTC() {
  const now = new Date();
  const p = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  }).formatToParts(now).reduce((a, x) => ((a[x.type] = x.value), a), {});
  const wallAsUTC = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  const offsetMs = now.getTime() - wallAsUTC; // UTC - Eastern wall time
  const midnightWallAsUTC = Date.UTC(+p.year, +p.month - 1, +p.day, 0, 0, 0);
  return new Date(midnightWallAsUTC + offsetMs);
}

async function listPortalRecords({ centerId, campaignName, startDate, endDate, cursor, limit = 15, q, userId, todayOnly }) {
  const match = {
    centerId: new mongoose.Types.ObjectId(centerId),
    campaignName,
  };

  if (userId) match.userId = new mongoose.Types.ObjectId(userId);

  if (startDate || endDate || todayOnly) {
    match.createdAt = {};
    if (startDate) match.createdAt.$gte = new Date(startDate);
    if (endDate) match.createdAt.$lte = new Date(endDate);
    // The user role can never see anything older than today (Eastern).
    if (todayOnly) {
      const floor = estStartOfTodayUTC();
      if (!match.createdAt.$gte || match.createdAt.$gte < floor) {
        match.createdAt.$gte = floor;
      }
    }
  }

  if (q && q.trim()) {
    const qq = q.trim();
    // Digits-only variant so a search like "(647) 897" still matches a stored
    // 10-digit phone number.
    const digits = qq.replace(/\D/g, "");
    match.$or = [
      { "metadata.leadId": { $regex: qq, $options: "i" } },
      { "metadata.ipAddress": { $regex: qq, $options: "i" } },
      { "metadata.proxyIp": { $regex: qq, $options: "i" } },
      { "formData.phone": { $regex: qq, $options: "i" } },
      { "formData.txtPhone": { $regex: qq, $options: "i" } },
      ...(digits
        ? [
            { "formData.phone": { $regex: digits } },
            { "formData.txtPhone": { $regex: digits } },
          ]
        : []),
    ];
  }

  const cursorObj = cursor ? decodeCursor(cursor) : null;
  const cursorMatch = buildCursorMatch(cursorObj);
  const finalMatch = Object.keys(cursorMatch).length ? { $and: [match, cursorMatch] } : match;

  const docs = await SubmissionLog.find(finalMatch)
    .sort({ createdAt: -1, _id: -1 })
    .limit(limit + 1)
    .lean();

  const hasMore = docs.length > limit;
  const items = hasMore ? docs.slice(0, limit) : docs;

  const nextCursor =
    hasMore && items.length
      ? encodeCursor({ createdAt: items[items.length - 1].createdAt, id: items[items.length - 1]._id })
      : null;

  return { items, nextCursor, hasMore };
}

export { listPortalRecords };