// backend/routes/dashboardRoutes.js
import express from "express";
import { getDashboardStats } from "../controllers/dashboardController.js";
import { auth, authorize } from "../middlewares/auth.js";

const router = express.Router();
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

router.get("/stats", auth, authorize(["super_admin", "admin"]), asyncHandler(getDashboardStats));

export default router;
