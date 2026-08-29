import { Router } from 'express';
import { requireAdmin } from '../../middleware/auth.middleware';
import { listUsers, getUser, createUser, updateUser, deactivateUser } from './users.controller';

const router = Router();

router.get('/', requireAdmin, listUsers);
router.post('/', requireAdmin, createUser);
router.get('/:id', requireAdmin, getUser);
router.patch('/:id', requireAdmin, updateUser);
router.delete('/:id', requireAdmin, deactivateUser);

export default router;
