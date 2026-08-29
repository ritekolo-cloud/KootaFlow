import { Router } from 'express';
import { requireOfficer, requireTreasurer } from '../../middleware/auth.middleware';
import {
  getSavingsAccount, deposit, withdraw, getSavingsSummary,
} from './savings.controller';

const router = Router();

router.get('/summary', requireOfficer, getSavingsSummary);
router.get('/member/:memberId', requireOfficer, getSavingsAccount);
router.post('/deposit', requireTreasurer, deposit);
router.post('/withdraw', requireTreasurer, withdraw);

export default router;
