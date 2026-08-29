import { Router } from 'express';
import { authLimiter } from '../../middleware/rateLimit.middleware';
import { authenticate } from '../../middleware/auth.middleware';
import {
  login,
  refresh,
  logout,
  me,
  changePassword,
} from './auth.controller';

const router = Router();

router.post('/login', authLimiter, login);
router.post('/refresh', authLimiter, refresh);
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, me);
router.patch('/me/password', authenticate, changePassword);

export default router;
