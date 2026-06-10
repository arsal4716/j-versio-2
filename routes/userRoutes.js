// userRoutes.js
import express from "express";
const router = express.Router();
import { getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser } from "../controllers/userController.js";
import { auth, authorize } from "../middlewares/auth.js";
router.use(auth);
router.use(authorize(['super_admin']));

router.get('/', getAllUsers);
router.get('/:id', getUserById);
router.post('/', createUser);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);

export default router;