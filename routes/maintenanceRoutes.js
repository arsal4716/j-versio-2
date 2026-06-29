// backend/routes/maintenanceRoutes.js
import express from "express";
import { auth, authorize } from "../middlewares/auth.js";
import { ROLES } from "../config/constants.js";
import { getMaintenance, setMaintenance } from "../controllers/maintenanceController.js";

const router = express.Router();

// Public status (the SPA reads this on load / poll).
router.get("/", getMaintenance);
// Only a super admin can toggle it.
router.post("/", auth, authorize([ROLES.SUPER_ADMIN]), setMaintenance);

export default router;
