import express from "express";
const router = express.Router();
import submitFormController from "../controllers/submitFormController.js";
import { auth } from "../middlewares/auth.js";

const asyncHandler = fn => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// fetch dynamic form
router.get(
  "/:centerId/:campaignName/form",
  auth,
  asyncHandler(submitFormController.getCampaignFormFields)
);

// submit form (enqueues a job, returns jobId)
router.post(
  "/:centerId/:campaignName",
  auth,
  asyncHandler(submitFormController.submitForm)
);

// poll submission job status/result
router.get(
  "/status/:jobId",
  auth,
  asyncHandler(submitFormController.getSubmissionStatus)
);

export default router;
