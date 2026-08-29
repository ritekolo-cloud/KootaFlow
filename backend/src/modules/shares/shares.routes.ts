import { Router } from 'express';
import { requireTreasurer } from '../../middleware/auth.middleware';
import { getSharesForMember, purchaseShares, getSharesSummary } from './shares.controller';

const router = Router();

router.get('/summary', requireTreasurer, getSharesSummary);
router.get('/member/:memberId', getSharesForMember); // Scoped to own member if role is MEMBER
router.post('/', requireTreasurer, purchaseShares);

export default router;
