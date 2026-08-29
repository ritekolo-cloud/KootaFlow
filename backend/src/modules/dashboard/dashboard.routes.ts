import { Router } from 'express';
import { requireOfficer } from '../../middleware/auth.middleware';
import { getDashboard } from './dashboard.controller';

const router = Router();

router.get('/', requireOfficer, getDashboard);

export default router;
