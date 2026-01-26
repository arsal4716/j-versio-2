const express = require("express");
const router = express.Router();
const { verifyCenterCode } = require("../controllers/verificationCodeController");

router.post("/verify-code", verifyCenterCode);

module.exports = router;
