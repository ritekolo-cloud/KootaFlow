import { Router } from 'express';
import { requireAdmin, requireOfficer } from '../../middleware/auth.middleware';
import { calculateShareOut, executeShareOut, getShareOutById, listShareOuts } from './shareout.controller';

const router = Router();

router.get('/', requireOfficer, listShareOuts);
router.get('/calculate', requireOfficer, calculateShareOut);
router.get('/:id', requireOfficer, getShareOutById);
router.post('/', requireAdmin, executeShareOut);

export default router;
