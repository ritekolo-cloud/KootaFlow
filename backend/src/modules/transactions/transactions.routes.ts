import { Router } from 'express';
import { requireOfficer } from '../../middleware/auth.middleware';
import { listTransactions, getTransaction } from './transactions.controller';

const router = Router();

router.get('/', requireOfficer, listTransactions);
router.get('/:id', requireOfficer, getTransaction);

export default router;
