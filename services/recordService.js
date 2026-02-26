// backend/services/portalRecordService.js
const mongoose = require("mongoose");
const SubmissionLog = require("../models/SubmissionLog");
const { decodeCursor, encodeCursor, buildCursorMatch } = require("../utils/cursorPagination");

async function listPortalRecords({ centerId, campaignName, startDate, endDate, cursor, limit = 15, q }) {
  const match = {
    centerId: new mongoose.Types.ObjectId(centerId),
    campaignName,
  };

  if (startDate || endDate) {
    match.createdAt = {};
    if (startDate) match.createdAt.$gte = new Date(startDate);
    if (endDate) match.createdAt.$lte = new Date(endDate);
  }

  if (q && q.trim()) {
    const qq = q.trim();
    match.$or = [
      { "metadata.leadId": { $regex: qq, $options: "i" } },
      { "metadata.ipAddress": { $regex: qq, $options: "i" } },
      { "metadata.proxyIp": { $regex: qq, $options: "i" } },
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

module.exports = { listPortalRecords };