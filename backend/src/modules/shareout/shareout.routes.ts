import { Router } from 'express';
import { requireAdmin, requireStaff } from '../../middleware/auth.middleware';
import { calculateShareOut, executeShareOut, getShareOutById, listShareOuts } from './shareout.controller';

const router = Router();

router.get('/', requireStaff, listShareOuts);
router.get('/calculate', requireAdmin, calculateShareOut);
router.get('/:id', requireStaff, getShareOutById);
router.post('/', requireAdmin, executeShareOut);

export default router;
