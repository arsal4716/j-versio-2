// backend/routes/recordRoutes.js
import express from "express";
const router = express.Router();
import { auth } from "../middlewares/auth.js";
import tenantContext from "../middlewares/tenantContext.js";
import validate from "../middlewares/validate.js";
import { listRecordsQuerySchema } from "../validators/recordValidators.js";
import recordController from "../controllers/recordController.js";

router.get("/", auth, tenantContext, validate(listRecordsQuerySchema, "query"), recordController.list);

export default router;