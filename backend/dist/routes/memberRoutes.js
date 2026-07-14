"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const memberController_1 = require("../controllers/memberController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const roleMiddleware_1 = require("../middleware/roleMiddleware");
const router = (0, express_1.Router)();
// Require authentication for all member routes
router.use(authMiddleware_1.authenticate);
router.get('/', memberController_1.getMembers);
router.get('/:id', memberController_1.getMemberById);
// Only ADMIN and TREASURER can create/update/delete members
router.post('/', (0, roleMiddleware_1.authorizeRoles)('ADMIN', 'TREASURER'), memberController_1.createMember);
router.put('/:id', (0, roleMiddleware_1.authorizeRoles)('ADMIN', 'TREASURER'), memberController_1.updateMember);
router.delete('/:id', (0, roleMiddleware_1.authorizeRoles)('ADMIN', 'TREASURER'), memberController_1.deleteMember);
exports.default = router;
