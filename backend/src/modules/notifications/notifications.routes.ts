import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { listNotifications, markRead, markAllRead } from './notifications.controller';

const router = Router();

router.get('/', authenticate, listNotifications);
router.patch('/:id/read', authenticate, markRead);
router.patch('/read-all', authenticate, markAllRead);

export default router;
