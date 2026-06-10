// backend/routes/apiConfigRoutes.js
import express from "express";
const router = express.Router();
import { auth, authorize } from "../middlewares/auth.js"; 

import validate from "../middlewares/validate.js";
import { createApiConfigSchema, updateApiConfigSchema } from "../validators/apiConfigValidators.js";
import apiConfigController from "../controllers/apiConfigController.js";

router.use(auth, authorize(["super_admin"]));

router.post("/", validate(createApiConfigSchema), apiConfigController.create);
router.get("/", apiConfigController.list);
router.patch("/:id", validate(updateApiConfigSchema), apiConfigController.update);
router.patch("/:id/toggle", apiConfigController.toggle);
router.delete("/:id", apiConfigController.softDelete);

router.post("/:id/execute", apiConfigController.execute);

export default router;