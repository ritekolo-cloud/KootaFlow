import { Router } from 'express';
import { requireOfficer } from '../../middleware/auth.middleware';
import {
  listMembers, getMember, createMember, updateMember, getMemberLedger,
} from './members.controller';

const router = Router();

router.get('/', requireOfficer, listMembers);
router.post('/', requireOfficer, createMember);
router.get('/:id', getMember); // Scoped to own member if role is MEMBER
router.patch('/:id', requireOfficer, updateMember);
router.get('/:id/ledger', getMemberLedger); // Scoped to own member if role is MEMBER

export default router;
