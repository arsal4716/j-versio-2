// backend/routes/googleKeyRoutes.js
import express from "express";
import multer from "multer";
import { auth, authorize } from "../middlewares/auth.js";
import { ROLES } from "../config/constants.js";
import {
  uploadAdminKey,
  adminKeyStatus,
  uploadCenterKey,
} from "../controllers/googleKeyController.js";

const router = express.Router();
// Keys are small; keep them in memory and never touch local disk.
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 1024 * 1024 } });

router.use(auth);

router.get("/admin/status", authorize([ROLES.SUPER_ADMIN]), adminKeyStatus);
router.post("/admin", authorize([ROLES.SUPER_ADMIN]), upload.single("keyFile"), uploadAdminKey);
router.post(
  "/center/:id",
  authorize([ROLES.SUPER_ADMIN, ROLES.ADMIN]),
  upload.single("keyFile"),
  uploadCenterKey
);

export default router;
