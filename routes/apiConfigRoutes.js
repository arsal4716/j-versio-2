// backend/routes/apiConfigRoutes.js
import express from "express";
const router = express.Router();
import { auth, authorize } from "../middlewares/auth.js"; 

import validate from "../middlewares/validate.js";
import { createApiConfigSchema, updateApiConfigSchema } from "../validators/apiConfigValidators.js";
import apiConfigController from "../controllers/apiConfigController.js";

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// All API-config routes require authentication.
router.use(auth);

// Portal endpoints — available to any authenticated role (tenant-checked in the
// controller): list a campaign's APIs by name, and push a lead through one.
router.get("/by-campaign", asyncHandler(apiConfigController.listByCampaign));
router.post("/:id/execute-lead", asyncHandler(apiConfigController.executeForLead));

// Everything below manages API configs and is super-admin only.
router.use(authorize(["super_admin"]));

router.post("/", validate(createApiConfigSchema), apiConfigController.create);
router.get("/", apiConfigController.list);
router.patch("/:id", validate(updateApiConfigSchema), apiConfigController.update);
router.patch("/:id/toggle", apiConfigController.toggle);
router.delete("/:id", apiConfigController.softDelete);

router.post("/:id/execute", apiConfigController.execute);

export default router;