import { Router } from 'express';
import { requireOfficer, requireTreasurer, requireChairperson } from '../../middleware/auth.middleware';
import {
  listLoans, getLoan, applyLoan, approveLoan, rejectLoan,
  repayLoan, getLoanRepayments,
} from './loans.controller';

const router = Router();

router.get('/', requireOfficer, listLoans);
router.post('/', requireOfficer, applyLoan);
router.get('/:id', requireOfficer, getLoan);
router.patch('/:id/approve', requireChairperson, approveLoan);
router.patch('/:id/reject', requireChairperson, rejectLoan);
router.post('/:id/repay', requireTreasurer, repayLoan);
router.get('/:id/repayments', requireOfficer, getLoanRepayments);

export default router;
