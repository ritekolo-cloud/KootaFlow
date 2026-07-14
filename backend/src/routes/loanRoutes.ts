import { Router } from 'express';
import { getLoans, createLoan, updateLoan } from '../controllers/loanController';
import { authenticate } from '../middleware/authMiddleware';
import { authorizeRoles } from '../middleware/roleMiddleware';

const router = Router();

router.use(authenticate);

router.get('/', getLoans);
router.post('/', authorizeRoles('ADMIN', 'TREASURER'), createLoan);
router.put('/:id', authorizeRoles('ADMIN', 'TREASURER'), updateLoan);

export default router;
