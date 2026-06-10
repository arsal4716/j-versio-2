// backend/routes/settingsRoutes.js
import express from "express";
import settingsController from "../controllers/settingsController.js";
import { auth, authorize } from "../middlewares/auth.js";

const router = express.Router();
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

router.get("/:centerId", auth, asyncHandler(settingsController.get));
router.put(
  "/:centerId",
  auth,
  authorize(["super_admin", "admin"]),
  asyncHandler(settingsController.update)
);

export default router;
