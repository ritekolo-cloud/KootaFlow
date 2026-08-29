import { Router } from 'express';
import { requireAdmin, requireOfficer } from '../../middleware/auth.middleware';
import {
  listMembers, getMember, createMember, updateMember, getMemberLedger,
} from './members.controller';

const router = Router();

router.get('/', requireOfficer, listMembers);
router.post('/', requireOfficer, createMember);
router.get('/:id', requireOfficer, getMember);
router.patch('/:id', requireOfficer, updateMember);
router.get('/:id/ledger', requireOfficer, getMemberLedger);

export default router;
