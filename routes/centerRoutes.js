import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { createCenter,
  getCenters,
  getCenterById,
  updateCenter,
  deleteCenter,
  setCenterAccess, } from "../controllers/centerController.js";
import { auth, authorize } from "../middlewares/auth.js";
import { fileURLToPath } from "url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const router = express.Router();
const tmpDir = path.join(__dirname, '..', 'uploads', 'tmp');
fs.mkdirSync(tmpDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, tmpDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${uniqueName}-${file.originalname}`);
  },
});

const upload = multer({ storage });
router.use(auth);

router.post('/', upload.single('clientKeyFile'), createCenter);
router.get('/', getCenters);
router.get('/:id', getCenterById);
router.put('/:id', upload.single('clientKeyFile'), updateCenter);
router.patch('/:id/access', authorize(['super_admin']), setCenterAccess);
router.delete('/:id', authorize(['super_admin']), deleteCenter);

export default router;
