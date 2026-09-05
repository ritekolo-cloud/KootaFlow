import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  PiggyBank,
  PieChart,
  Landmark,
  ArrowLeftRight,
  TrendingUp,
  Bell,
  Settings,
  ShieldCheck,
  Building2,
  LogOut,
  Menu,
  X,
  User as UserIcon,
} from 'lucide-react';
import { useAuthStore } from '../store/auth.store';
import { notificationsApi } from '../api';
import { Badge } from '../components/ui/Badge';

export const AppLayout: React.FC = () => {
  const { user, logout, isMember, isTreasurer, isAdmin } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Fetch unread notifications
  useEffect(() => {
    const fetchNotifs = async () => {
      try {
        const res = await notificationsApi.list({ unread: true, limit: 1 });
        setUnreadNotifications(res.data.unreadCount || 0);
      } catch {
        // ignore
      }
    };
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Construct role-specific navigation items
  const navItems = [
    {
      to: '/',
      label: 'Dashboard',
      icon: <LayoutDashboard size={18} />,
      roles: ['ADMIN', 'TREASURER', 'MEMBER'],
    },
    {
      to: '/groups',
      label: 'VSLA Groups',
      icon: <Building2 size={18} />,
      roles: ['ADMIN'],
    },
    {
      to: '/members',
      label: 'Members',
      icon: <Users size={18} />,
      roles: ['ADMIN', 'TREASURER'],
    },
    {
      to: '/savings',
      label: isMember() ? 'My Savings' : 'Savings',
      icon: <PiggyBank size={18} />,
      roles: ['ADMIN', 'TREASURER', 'MEMBER'],
    },
    {
      to: '/shares',
      label: isMember() ? 'My Shares' : 'Shares',
      icon: <PieChart size={18} />,
      roles: ['ADMIN', 'TREASURER', 'MEMBER'],
    },
    {
      to: '/loans',
      label: isMember() ? 'My Loans' : 'Loans',
      icon: <Landmark size={18} />,
      roles: ['ADMIN', 'TREASURER', 'MEMBER'],
    },
    {
      to: '/share-out',
      label: 'Share-Out',
      icon: <TrendingUp size={18} />,
      roles: ['ADMIN'],
    },
    {
      to: '/transactions',
      label: isMember() ? 'My Ledger' : 'Transactions',
      icon: <ArrowLeftRight size={18} />,
      roles: ['ADMIN', 'TREASURER', 'MEMBER'],
    },
    {
      to: '/users',
      label: 'User Accounts',
      icon: <ShieldCheck size={18} />,
      roles: ['ADMIN'],
    },
    {
      to: '/notifications',
      label: 'Notifications',
      icon: <Bell size={18} />,
      badge: unreadNotifications > 0 ? unreadNotifications : undefined,
      roles: ['ADMIN', 'TREASURER', 'MEMBER'],
    },
    {
      to: '/settings',
      label: 'Settings',
      icon: <Settings size={18} />,
      roles: ['ADMIN', 'TREASURER', 'MEMBER'],
    },
  ];

  const filteredNavItems = navItems.filter(
    (item) => !user || item.roles.includes(user.role)
  );

  return (
    <div className="min-h-screen bg-[#F5F7FA] flex flex-col">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-15">
            {/* Left: Mobile Menu Trigger + Brand */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              >
                {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>

              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-md bg-[#0B1F3A] text-white flex items-center justify-center font-bold text-base shadow-xs">
                  K
                </div>
                <div>
                  <span className="font-bold text-base tracking-tight text-[#0B1F3A] block leading-none">
                    KootaFlow
                  </span>
                  <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider block mt-0.5">
                    VSLA Management
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Group Badge, Notification Bell & User Profile */}
            <div className="flex items-center gap-3 sm:gap-4">
              {/* Group/Cycle indicator */}
              <div className="hidden md:flex items-center gap-2 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-md text-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="font-semibold text-slate-700">Katabi Town Council VSLA</span>
                <span className="text-slate-400">•</span>
                <span className="text-slate-600">Cycle #1 Active</span>
              </div>

              {/* Notification icon */}
              <button
                onClick={() => navigate('/notifications')}
                className="relative p-1.5 rounded-md text-slate-500 hover:text-[#0B1F3A] hover:bg-slate-100 transition-colors"
                title="Notifications"
              >
                <Bell size={19} />
                {unreadNotifications > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white" />
                )}
              </button>

              <div className="h-5 w-px bg-slate-200 hidden sm:block" />

              {/* User badge */}
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[#0B1F3A] font-semibold text-xs">
                  {user?.firstName?.[0] || 'U'}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-xs font-semibold text-slate-900 leading-tight">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-[10px] text-slate-500 leading-tight mt-0.5">
                    <Badge status={user?.role} size="sm" />
                  </p>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                title="Sign out"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Layout Body */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 gap-6">
        {/* Desktop Sidebar Navigation */}
        <aside className="hidden lg:block w-56 shrink-0">
          <nav className="sticky top-22 bg-white rounded-lg border border-slate-200 p-2.5 shadow-2xs space-y-1">
            {filteredNavItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-[#0B1F3A] text-white shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`
                }
              >
                <div className="flex items-center gap-2.5">
                  <span className="shrink-0">{item.icon}</span>
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500 text-white">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>
        </aside>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-40 flex">
            <div
              className="fixed inset-0 bg-slate-900/50 backdrop-blur-2xs"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white border-r border-slate-200 p-4 shadow-xl">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-md bg-[#0B1F3A] text-white flex items-center justify-center font-bold text-sm">
                    K
                  </div>
                  <span className="font-bold text-sm text-[#0B1F3A]">KootaFlow</span>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-1 flex-1 overflow-y-auto">
                {filteredNavItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/'}
                    className={({ isActive }) =>
                      `flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                        isActive
                          ? 'bg-[#0B1F3A] text-white'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`
                    }
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="shrink-0">{item.icon}</span>
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500 text-white">
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                ))}
              </div>

              <div className="pt-3 border-t border-slate-200 mt-auto">
                <div className="flex items-center gap-2 px-2 py-1.5">
                  <UserIcon size={16} className="text-slate-400" />
                  <div className="text-xs">
                    <p className="font-medium text-slate-900">
                      {user?.firstName} {user?.lastName}
                    </p>
                    <p className="text-slate-500 capitalize">{user?.role?.toLowerCase()}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Content Area */}
        <main className="flex-1 min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
