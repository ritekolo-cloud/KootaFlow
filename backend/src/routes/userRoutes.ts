import { Router } from 'express';
import { getUsers, createUser, updateUser, resetPassword } from '../controllers/userController';
import { authenticate } from '../middleware/authMiddleware';
import { authorizeRoles } from '../middleware/roleMiddleware';

const router = Router();

// Protect all user routes: only ADMIN can access
router.use(authenticate);
router.use(authorizeRoles('ADMIN'));

router.get('/', getUsers);
router.post('/', createUser);
router.put('/:id', updateUser);
router.patch('/:id/reset-password', resetPassword);

export default router;
