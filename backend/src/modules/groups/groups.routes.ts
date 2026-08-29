import { Router } from 'express';
import { requireAdmin, requireStaff } from '../../middleware/auth.middleware';
import {
  listGroups, getGroup, createGroup, updateGroup,
  listCycles, createCycle, updateCycle,
} from './groups.controller';

const router = Router();

// Groups
router.get('/', requireStaff, listGroups);
router.post('/', requireAdmin, createGroup);
router.get('/:id', requireStaff, getGroup);
router.patch('/:id', requireAdmin, updateGroup);

// Cycles (nested under groups)
router.get('/:groupId/cycles', requireStaff, listCycles);
router.post('/:groupId/cycles', requireAdmin, createCycle);
router.patch('/:groupId/cycles/:cycleId', requireAdmin, updateCycle);

export default router;
