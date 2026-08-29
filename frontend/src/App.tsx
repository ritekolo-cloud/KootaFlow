import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from './store/auth.store';
import { AppLayout } from './layouts/AppLayout';
import { LoginPage } from './pages/auth/LoginPage';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { MembersPage } from './pages/members/MembersPage';
import { MemberDetailPage } from './pages/members/MemberDetailPage';
import { SavingsPage } from './pages/savings/SavingsPage';
import { SharesPage } from './pages/shares/SharesPage';
import { LoansPage } from './pages/loans/LoansPage';
import { ShareOutPage } from './pages/shareout/ShareOutPage';
import { TransactionsPage } from './pages/transactions/TransactionsPage';
import { NotificationsPage } from './pages/notifications/NotificationsPage';
import { GroupsPage } from './pages/groups/GroupsPage';
import { UsersPage } from './pages/users/UsersPage';
import { SettingsPage } from './pages/settings/SettingsPage';
import { UserRole } from './types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { isAuthenticated, user, checkAuth } = useAuthStore();
  const location = useLocation();

  useEffect(() => {
    checkAuth();
  }, []);

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <Routes>
      {/* Public Route */}
      <Route path="/login" element={<LoginPage />} />

      {/* Protected App Routes inside Shell */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />

        <Route
          path="members"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'TREASURER']}>
              <MembersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="members/:id"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'TREASURER']}>
              <MemberDetailPage />
            </ProtectedRoute>
          }
        />

        <Route path="savings" element={<SavingsPage />} />
        <Route path="shares" element={<SharesPage />} />
        <Route path="loans" element={<LoansPage />} />

        <Route
          path="share-out"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <ShareOutPage />
            </ProtectedRoute>
          }
        />

        <Route path="transactions" element={<TransactionsPage />} />
        <Route path="notifications" element={<NotificationsPage />} />

        <Route
          path="groups"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <GroupsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="users"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <UsersPage />
            </ProtectedRoute>
          }
        />

        <Route path="settings" element={<SettingsPage />} />
      </Route>

      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
