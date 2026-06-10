import express from "express";
const router = express.Router();
import controller from "../controllers/formSetupController.js";
import { auth, authorize } from "../middlewares/auth.js";
import multer from "multer";
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

export default router;
