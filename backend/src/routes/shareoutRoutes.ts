import { Router } from 'express';
import { getShareOuts, calculateShareOut } from '../controllers/shareoutController';
import { authenticate } from '../middleware/authMiddleware';
import { authorizeRoles } from '../middleware/roleMiddleware';

const router = Router();

router.use(authenticate);

router.get('/', getShareOuts);
router.post('/calculate', authorizeRoles('ADMIN', 'TREASURER'), calculateShareOut);

export default router;
