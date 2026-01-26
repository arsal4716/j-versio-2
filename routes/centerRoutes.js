const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const {
  createCenter,
  getCenters,
  getCenterById,
  updateCenter,
  deleteCenter,
} = require('../controllers/centerController');
const { auth, authorize } = require('../middlewares/auth');

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
router.delete('/:id', authorize(['super_admin']), deleteCenter);

module.exports = router;
