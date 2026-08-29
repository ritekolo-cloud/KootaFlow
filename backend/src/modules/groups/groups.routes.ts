import { Router } from 'express';
import { requireAdmin, requireOfficer } from '../../middleware/auth.middleware';
import {
  listGroups, getGroup, createGroup, updateGroup,
  listCycles, createCycle, updateCycle,
} from './groups.controller';

const router = Router();

// Groups
router.get('/', requireOfficer, listGroups);
router.post('/', requireAdmin, createGroup);
router.get('/:id', requireOfficer, getGroup);
router.patch('/:id', requireAdmin, updateGroup);

// Cycles (nested under groups)
router.get('/:groupId/cycles', requireOfficer, listCycles);
router.post('/:groupId/cycles', requireAdmin, createCycle);
router.patch('/:groupId/cycles/:cycleId', requireAdmin, updateCycle);

export default router;
