import { Router } from 'express';
import { requireStaff } from '../../middleware/auth.middleware';
import {
  listMembers, getMember, createMember, updateMember, getMemberLedger,
} from './members.controller';

const router = Router();

router.get('/', requireStaff, listMembers);
router.post('/', requireStaff, createMember);
router.get('/:id', getMember); // Scoped to own member if role is MEMBER
router.patch('/:id', requireStaff, updateMember);
router.get('/:id/ledger', getMemberLedger); // Scoped to own member if role is MEMBER

export default router;
