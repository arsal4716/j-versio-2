const express = require("express");
const router = express.Router();
const submitFormController = require("../controllers/submitFormController");
const { auth } = require("../middlewares/auth");

const asyncHandler = fn => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// fetch dynamic form
router.get(
  "/:centerId/:campaignName/form",
  auth,
  asyncHandler(submitFormController.getCampaignFormFields)
);

// submit form
router.post(
  "/:centerId/:campaignName",
  auth,
  asyncHandler(submitFormController.submitForm)
);

module.exports = router;
