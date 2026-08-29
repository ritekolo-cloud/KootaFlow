import { Response, NextFunction } from 'express';
import { prisma } from '../../config/database';
import { sendSuccess, parsePagination, buildPaginationMeta } from '../../utils/response';
import { AppError } from '../../middleware/error.middleware';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';

export async function listNotifications(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { page, limit, skip } = parsePagination(req.query as Record<string, unknown>);
    const unreadOnly = req.query.unread === 'true';

    const where: Record<string, unknown> = { userId: req.user!.id };
    if (unreadOnly) where.isRead = false;

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { userId: req.user!.id, isRead: false } }),
    ]);

    sendSuccess(
      res,
      { notifications, unreadCount },
      'Notifications retrieved',
      200,
      buildPaginationMeta(total, page, limit)
    );
  } catch (err) {
    next(err);
  }
}

export async function markRead(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    const notification = await prisma.notification.findUnique({ where: { id } });
    if (!notification) throw new AppError('Notification not found', 404);
    if (notification.userId !== req.user!.id) throw new AppError('Not authorized', 403);

    const updated = await prisma.notification.update({ where: { id }, data: { isRead: true } });
    sendSuccess(res, updated, 'Notification marked as read');
  } catch (err) {
    next(err);
  }
}

export async function markAllRead(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { count } = await prisma.notification.updateMany({
      where: { userId: req.user!.id, isRead: false },
      data: { isRead: true },
    });
    sendSuccess(res, { markedRead: count }, 'All notifications marked as read');
  } catch (err) {
    next(err);
  }
}
