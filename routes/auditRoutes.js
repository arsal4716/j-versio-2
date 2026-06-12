// backend/routes/auditRoutes.js
import express from "express";
import auditController from "../controllers/auditController.js";
import { auth, authorize } from "../middlewares/auth.js";

const router = express.Router();
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

router.get("/", auth, authorize(["super_admin", "admin"]), asyncHandler(auditController.list));

export default router;
