import { Router } from 'express';
import { getMembers, getMemberById, createMember, updateMember, deleteMember } from '../controllers/memberController';
import { authenticate } from '../middleware/authMiddleware';
import { authorizeRoles } from '../middleware/roleMiddleware';

const router = Router();

// Require authentication for all member routes
router.use(authenticate);

router.get('/', getMembers);
router.get('/:id', getMemberById);

// Only ADMIN and TREASURER can create/update/delete members
router.post('/', authorizeRoles('ADMIN', 'TREASURER'), createMember);
router.put('/:id', authorizeRoles('ADMIN', 'TREASURER'), updateMember);
router.delete('/:id', authorizeRoles('ADMIN', 'TREASURER'), deleteMember);

export default router;
