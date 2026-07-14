import { Router } from 'express';
import { createRepayment, getRepayments } from '../controllers/repaymentController';
import { authenticate } from '../middleware/authMiddleware';
import { authorizeRoles } from '../middleware/roleMiddleware';

const router = Router();

router.use(authenticate);

router.get('/', getRepayments);
router.post('/', authorizeRoles('ADMIN', 'TREASURER'), createRepayment);

export default router;
