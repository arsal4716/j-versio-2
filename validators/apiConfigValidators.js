// backend/validators/apiConfigValidators.js
const Joi = require("joi");

const keyValue = Joi.object({
  key: Joi.string().trim().max(200).allow(""),
  value: Joi.string().trim().max(5000).allow(""),
  enabled: Joi.boolean().default(true),
  secret: Joi.boolean().default(false),
});

const createApiConfigSchema = Joi.object({
  centerId: Joi.string().hex().length(24).required(),
  campaignId: Joi.string().hex().length(24).required(),
  apiName: Joi.string().trim().max(120).required(),
  method: Joi.string().valid("GET", "POST", "PUT", "DELETE", "PATCH").required(),
  endpointUrl: Joi.string().trim().max(5000).required(),

  headers: Joi.array().items(keyValue).default([]),
  queryParams: Joi.array().items(keyValue).default([]),

  bodyType: Joi.string().valid("json", "xml", "form-data", "raw", "encrypted").default("json"),
  bodySchema: Joi.any().default({}),

  authType: Joi.string().valid("none", "bearer", "basic", "apiKey").default("none"),
  authConfig: Joi.any().default({}),

  timeout: Joi.number().integer().min(1000).max(120000).default(15000),
  retryCount: Joi.number().integer().min(0).max(10).default(0),

  status: Joi.string().valid("active", "inactive").default("active"),
});

const updateApiConfigSchema = Joi.object({
  apiName: Joi.string().trim().max(120),
  method: Joi.string().valid("GET", "POST", "PUT", "DELETE", "PATCH"),
  endpointUrl: Joi.string().trim().max(5000),

  headers: Joi.array().items(keyValue),
  queryParams: Joi.array().items(keyValue),

  bodyType: Joi.string().valid("json", "xml", "form-data", "raw", "encrypted"),
  bodySchema: Joi.any(),

  authType: Joi.string().valid("none", "bearer", "basic", "apiKey"),
  authConfig: Joi.any(),

  timeout: Joi.number().integer().min(1000).max(120000),
  retryCount: Joi.number().integer().min(0).max(10),

  status: Joi.string().valid("active", "inactive"),
}).min(1);

module.exports = { createApiConfigSchema, updateApiConfigSchema };