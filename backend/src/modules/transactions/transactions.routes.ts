import { Router } from 'express';
import { listTransactions, getTransaction } from './transactions.controller';

const router = Router();

// Member-scoped if role is MEMBER; full ledger for officers
router.get('/', listTransactions);
router.get('/:id', getTransaction);

export default router;
