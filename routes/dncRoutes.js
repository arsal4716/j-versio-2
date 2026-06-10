// backend/routes/dncRoutes.js
import express from "express";
import dncController from "../controllers/dncController.js";
import { auth, authorize } from "../middlewares/auth.js";
import { upload } from "../middlewares/upload.js";

const router = express.Router();
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// Real-time phone check — available to any authenticated role (agents use it
// on the form page). Tenant access is enforced inside the service.
router.post("/check", auth, asyncHandler(dncController.check));

// Internal DNC management — admin / super_admin only.
router.get("/internal/stats", auth, authorize(["super_admin", "admin"]), asyncHandler(dncController.stats));
router.get("/internal", auth, authorize(["super_admin", "admin"]), asyncHandler(dncController.listInternal));
router.post(
  "/internal/upload",
  auth,
  authorize(["super_admin", "admin"]),
  upload.single("file"),
  asyncHandler(dncController.uploadInternal)
);
router.post("/internal", auth, authorize(["super_admin", "admin"]), asyncHandler(dncController.addInternal));
router.delete("/internal/:id", auth, authorize(["super_admin", "admin"]), asyncHandler(dncController.deleteInternal));
router.delete("/internal", auth, authorize(["super_admin", "admin"]), asyncHandler(dncController.clearInternal));

export default router;
