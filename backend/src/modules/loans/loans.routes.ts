import { Router } from 'express';
import { requireTreasurer, requireAdmin } from '../../middleware/auth.middleware';
import {
  listLoans, getLoan, applyLoan, approveLoan, rejectLoan,
  repayLoan, getLoanRepayments,
} from './loans.controller';

const router = Router();

// Member-scoped if role is MEMBER; full list for ADMIN/TREASURER
router.get('/', listLoans);
router.post('/', applyLoan);
router.get('/:id', getLoan);
router.get('/:id/repayments', getLoanRepayments);

// Role-restricted financial operations:
// ADMIN approves/rejects loans
router.patch('/:id/approve', requireAdmin, approveLoan);
router.patch('/:id/reject', requireAdmin, rejectLoan);
// TREASURER or ADMIN records repayments
router.post('/:id/repay', requireTreasurer, repayLoan);

export default router;
