import express from "express";
const router = express.Router();
import { verifyCenterCode } from "../controllers/verificationCodeController.js";

router.post("/verify-code", verifyCenterCode);

export default router;
