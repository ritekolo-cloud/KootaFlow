"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const userController_1 = require("../controllers/userController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const roleMiddleware_1 = require("../middleware/roleMiddleware");
const router = (0, express_1.Router)();
// Protect all user routes: only ADMIN can access
router.use(authMiddleware_1.authenticate);
router.use((0, roleMiddleware_1.authorizeRoles)('ADMIN'));
router.get('/', userController_1.getUsers);
router.post('/', userController_1.createUser);
router.put('/:id', userController_1.updateUser);
router.patch('/:id/reset-password', userController_1.resetPassword);
exports.default = router;
