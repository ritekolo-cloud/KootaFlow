import { Router } from 'express';
import { getSavings, createSaving } from '../controllers/savingController';
import { authenticate } from '../middleware/authMiddleware';
import { authorizeRoles } from '../middleware/roleMiddleware';

const router = Router();

router.use(authenticate);

router.get('/', getSavings);
router.post('/', authorizeRoles('ADMIN', 'TREASURER'), createSaving);

export default router;
