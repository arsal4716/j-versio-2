const express = require('express');
const router = express.Router();
const controller = require('../controllers/formSetupController');
const { auth, authorize } = require('../middlewares/auth');
const multer = require('multer');
const upload = multer();

// Protect all routes
router.use(auth);

// CRUD
router.post('/', upload.none(), controller.createFormSetup);
router.get('/', authorize(['super_admin', 'admin', 'user']), controller.getAllFormSetups);
router.get("/center/campaigns", controller.getCampaignsForCenter);
router.get("/campaign/:campaignName", controller.getFormSetupByCampaign);
router.get('/:centerId/:campaignName', controller.getFormSetupByCenterCampaign);
router.put('/:id', authorize(['super_admin', 'admin']), upload.none(), controller.updateFormSetup);
router.delete('/:id', authorize(['super_admin']), controller.deleteFormSetup);
router.get("/fields/:centerId/:campaignName", controller.getFormSetupByCenterCampaign);

module.exports = router;
