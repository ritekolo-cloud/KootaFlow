"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const dotenv_1 = __importDefault(require("dotenv"));
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const memberRoutes_1 = __importDefault(require("./routes/memberRoutes"));
const savingRoutes_1 = __importDefault(require("./routes/savingRoutes"));
const loanRoutes_1 = __importDefault(require("./routes/loanRoutes"));
const repaymentRoutes_1 = __importDefault(require("./routes/repaymentRoutes"));
const shareoutRoutes_1 = __importDefault(require("./routes/shareoutRoutes"));
const dashboardRoutes_1 = __importDefault(require("./routes/dashboardRoutes"));
const userRoutes_1 = __importDefault(require("./routes/userRoutes"));
const errorHandler_1 = require("./middleware/errorHandler");
dotenv_1.default.config();
const app = (0, express_1.default)();
// Security and utility middlewares
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: true,
    credentials: true,
}));
app.use(express_1.default.json());
// Routes
app.use('/api/auth', authRoutes_1.default);
app.use('/api/members', memberRoutes_1.default);
app.use('/api/savings', savingRoutes_1.default);
app.use('/api/loans', loanRoutes_1.default);
app.use('/api/repayments', repaymentRoutes_1.default);
app.use('/api/shareout', shareoutRoutes_1.default);
app.use('/api/dashboard', dashboardRoutes_1.default);
app.use('/api/users', userRoutes_1.default);
// Health check endpoint
app.get('/api/health', (req, res) => {
    res.status(200).json({ success: true, message: 'Server is healthy' });
});
// Global Error Handler
app.use(errorHandler_1.errorHandler);
exports.default = app;
