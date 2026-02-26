// backend/routes/recordRoutes.js
const router = require("express").Router();
const { auth } = require("../middlewares/auth");
const tenantContext = require("../middlewares/tenantContext");
const validate = require("../middlewares/validate");
const { listRecordsQuerySchema } = require("../validators/recordValidators");
const recordController = require("../controllers/recordController");

router.get("/", auth, tenantContext, validate(listRecordsQuerySchema, "query"), recordController.list);

module.exports = router;