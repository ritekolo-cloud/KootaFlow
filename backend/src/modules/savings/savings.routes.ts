import { Router } from 'express';
import { requireOfficer, requireTreasurer } from '../../middleware/auth.middleware';
import {
  getSavingsAccount, deposit, withdraw, getSavingsSummary,
} from './savings.controller';

const router = Router();

router.get('/summary', requireOfficer, getSavingsSummary);
router.get('/member/:memberId', getSavingsAccount); // Scoped to own member if role is MEMBER
router.post('/deposit', requireTreasurer, deposit);
router.post('/withdraw', requireTreasurer, withdraw);

export default router;
