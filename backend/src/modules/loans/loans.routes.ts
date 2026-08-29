import { Router } from 'express';
import { requireTreasurer, requireChairperson } from '../../middleware/auth.middleware';
import {
  listLoans, getLoan, applyLoan, approveLoan, rejectLoan,
  repayLoan, getLoanRepayments,
} from './loans.controller';

const router = Router();

// Member-scoped if role is MEMBER; full list for officers
router.get('/', listLoans);
router.post('/', applyLoan);
router.get('/:id', getLoan);
router.get('/:id/repayments', getLoanRepayments);

// Role-restricted financial operations
router.patch('/:id/approve', requireChairperson, approveLoan);
router.patch('/:id/reject', requireChairperson, rejectLoan);
router.post('/:id/repay', requireTreasurer, repayLoan);

export default router;
