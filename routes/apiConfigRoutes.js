// backend/routes/apiConfigRoutes.js
const router = require("express").Router();
const { auth, authorize } = require("../middlewares/auth"); 

const validate = require("../middlewares/validate");
const { createApiConfigSchema, updateApiConfigSchema } = require("../validators/apiConfigValidators");
const apiConfigController = require("../controllers/apiConfigController");

router.use(auth, authorize(["super_admin"]));

router.post("/", validate(createApiConfigSchema), apiConfigController.create);
router.get("/", apiConfigController.list);
router.patch("/:id", validate(updateApiConfigSchema), apiConfigController.update);
router.patch("/:id/toggle", apiConfigController.toggle);
router.delete("/:id", apiConfigController.softDelete);

router.post("/:id/execute", apiConfigController.execute);

module.exports = router;