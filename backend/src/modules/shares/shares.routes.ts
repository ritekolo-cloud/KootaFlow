import { Router } from 'express';
import { requireOfficer, requireTreasurer } from '../../middleware/auth.middleware';
import { getSharesForMember, purchaseShares, getSharesSummary } from './shares.controller';

const router = Router();

router.get('/summary', requireOfficer, getSharesSummary);
router.get('/member/:memberId', requireOfficer, getSharesForMember);
router.post('/', requireTreasurer, purchaseShares);

export default router;
