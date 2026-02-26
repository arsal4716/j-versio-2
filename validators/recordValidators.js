// backend/validators/recordValidators.js
const Joi = require("joi");

const listRecordsQuerySchema = Joi.object({
  // IMPORTANT: your portal uses campaignName
  campaignName: Joi.string().trim().max(120).required(),

  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().optional(),

  cursor: Joi.string().optional(),
  limit: Joi.number().integer().min(1).max(50).default(15),

  q: Joi.string().trim().max(200).allow("").optional(),
}).unknown(true);

module.exports = { listRecordsQuerySchema };