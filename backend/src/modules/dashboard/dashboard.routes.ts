import { Router } from 'express';
import { requireStaff } from '../../middleware/auth.middleware';
import { getDashboard } from './dashboard.controller';

const router = Router();

router.get('/', requireStaff, getDashboard);

export default router;
