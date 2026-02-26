// backend/utils/cursorPagination.js
const mongoose = require("mongoose");

function encodeCursor({ createdAt, id }) {
  return Buffer.from(JSON.stringify({ createdAt, id })).toString("base64");
}

function decodeCursor(cursor) {
  try {
    const raw = Buffer.from(cursor, "base64").toString("utf8");
    const parsed = JSON.parse(raw);
    if (!parsed?.createdAt || !parsed?.id) return null;
    const date = new Date(parsed.createdAt);
    if (Number.isNaN(date.getTime())) return null;
    if (!mongoose.Types.ObjectId.isValid(parsed.id)) return null;
    return { createdAt: date, id: new mongoose.Types.ObjectId(parsed.id) };
  } catch {
    return null;
  }
}

function buildCursorMatch(cursorObj) {
  if (!cursorObj) return {};
  const { createdAt, id } = cursorObj;
  return {
    $or: [
      { createdAt: { $lt: createdAt } },
      { createdAt: createdAt, _id: { $lt: id } },
    ],
  };
}

module.exports = { encodeCursor, decodeCursor, buildCursorMatch };