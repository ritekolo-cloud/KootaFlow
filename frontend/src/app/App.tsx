import { useState, useEffect } from "react";
import { ThemeProvider } from "next-themes";
import { WelcomeScreen } from "./components/WelcomeScreen";
import { DashboardScreen } from "./components/DashboardScreen";
import { MembersScreen } from "./components/MembersScreen";
import { SavingsScreen } from "./components/SavingsScreen";
import { LoansScreen } from "./components/LoansScreen";
import { RepaymentsScreen } from "./components/RepaymentsScreen";
import { ShareOutScreen } from "./components/ShareOutScreen";
import { ReportsScreen } from "./components/ReportsScreen";
import { OfflineBanner } from "./components/OfflineBanner";
import { LoginScreen } from "./components/LoginScreen";
import { ResetPasswordScreen } from "./components/ResetPasswordScreen";
import { UserManagementScreen } from "./components/UserManagementScreen";
import { SettingsScreen } from "./components/SettingsScreen";
import { Toaster } from "./components/ui/sonner";
import {
  LayoutDashboard,
  Users,
  Wallet,
  CreditCard,
  DollarSign,
  TrendingUp,
  BarChart3,
  Menu,
  X,
  Settings,
  Shield,
  LogOut
} from "lucide-react";
import { Button } from "./components/ui/button";

type Screen =
  | "welcome"
  | "login"
  | "register"
  | "dashboard"
  | "members"
  | "savings"
  | "loans"
  | "repayments"
  | "shareout"
  | "reports"
  | "users"
  | "settings";

interface NavItem {
  id: Screen;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavGroup {
  group: string;
  items: NavItem[];
}

const ALL_NAV_GROUPS: NavGroup[] = [
  {
    group: "Overview",
    items: [
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    ]
  },
  {
    group: "Operations",
    items: [
      { id: "members", label: "Members", icon: Users },
      { id: "savings", label: "Savings", icon: Wallet },
      { id: "loans", label: "Loans", icon: CreditCard },
      { id: "repayments", label: "Repayments", icon: DollarSign },
      { id: "shareout", label: "Share-Out", icon: TrendingUp },
    ]
  },
  {
    group: "Analytics",
    items: [
      { id: "reports", label: "Reports", icon: BarChart3 },
    ]
  },
  {
    group: "Administration",
    items: [
      { id: "users", label: "User Management", icon: Shield },
      { id: "settings", label: "Settings", icon: Settings },
    ]
  }
];

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <AppContent />
    </ThemeProvider>
  );
}

function AppContent() {
  const [currentScreen, setCurrentScreen] = useState<Screen>("login");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [resetToken, setResetToken] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) {
      setResetToken(token);
      setCurrentScreen("reset-password" as any);
    }
  }, []);

  const userStr = localStorage.getItem("user");
  const currentUser = userStr ? JSON.parse(userStr) : null;
  const role = currentUser?.role || "MEMBER";

  // Filter groups based on role
  const navGroups = ALL_NAV_GROUPS.map(group => {
    return {
      ...group,
      items: group.items.filter(item => {
        if (role === "ADMIN") {
          return ["dashboard", "users", "reports", "settings"].includes(item.id);
        } else if (role === "TREASURER") {
          return ["dashboard", "members", "savings", "loans", "repayments", "shareout", "reports", "settings"].includes(item.id);
        } else {
          return ["dashboard", "savings", "loans", "repayments", "shareout"].includes(item.id);
        }
      })
    };
  }).filter(group => group.items.length > 0);

  const handleNavigate = (screen: Screen) => {
    setCurrentScreen(screen);
    setMobileMenuOpen(false);
  };

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    setCurrentScreen("login");
  };

  if (currentScreen === "welcome") {
    return (
      <>
        <WelcomeScreen onNavigate={setCurrentScreen} />
        <Toaster />
      </>
    );
  }

  if (currentScreen === "login") {
    return (
      <>
        <LoginScreen onLogin={() => setCurrentScreen("dashboard")} />
        <Toaster />
      </>
    );
  }

  if (currentScreen === ("reset-password" as any)) {
    return (
      <>
        <ResetPasswordScreen 
          token={resetToken || ""} 
          onResetSuccess={() => {
            window.history.replaceState({}, document.title, window.location.pathname);
            setResetToken(null);
            setCurrentScreen("login");
          }} 
        />
        <Toaster />
      </>
    );
  }

  if (currentScreen === "register") {
    setCurrentScreen("login");
    return null;
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-sidebar border-r border-sidebar-border">
      <div className="p-6 flex items-center gap-3 border-b border-sidebar-border">
        <Wallet className="w-8 h-8 text-sidebar-primary" />
        <div>
          <h1 className="text-xl font-bold text-sidebar-primary tracking-tight">KootaFlow</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-4">
        {navGroups.map((group, idx) => (
          <div key={idx} className="mb-6 px-4">
            <h3 className="text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider mb-3 px-3">
              {group.group}
            </h3>
            <div className="space-y-1">
              {group.items.map(item => {
                const Icon = item.icon;
                const isActive = currentScreen === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavigate(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-sidebar-primary/10 text-sidebar-primary border-l-4 border-sidebar-primary"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground border-l-4 border-transparent"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3 px-3 py-3 mb-2 rounded-md bg-sidebar-accent">
          <div className="w-8 h-8 rounded-full bg-sidebar-primary/20 flex items-center justify-center text-sidebar-primary font-medium">
            {currentUser?.name?.charAt(0) || "U"}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-medium text-sidebar-foreground truncate">{currentUser?.name}</p>
            <p className="text-xs text-sidebar-foreground/60 truncate">{role}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>
    </div>
  );

  return (
    <div className="h-screen flex bg-background">
      <OfflineBanner />

      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 h-full shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile Header & Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <header className="lg:hidden bg-card border-b border-border px-4 py-4 flex items-center justify-between z-20">
          <div className="flex items-center gap-2">
            <Wallet className="w-6 h-6 text-primary" />
            <span className="font-bold text-primary">KootaFlow</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(true)}
            className="text-foreground/70"
          >
            <Menu className="w-6 h-6" />
          </Button>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-auto p-4 md:p-8">
          <div className="max-w-6xl mx-auto">
            {currentScreen === "dashboard" && <DashboardScreen onNavigate={handleNavigate} />}
            {currentScreen === "members" && <MembersScreen />}
            {currentScreen === "savings" && <SavingsScreen />}
            {currentScreen === "loans" && <LoansScreen />}
            {currentScreen === "repayments" && <RepaymentsScreen />}
            {currentScreen === "shareout" && <ShareOutScreen />}
            {currentScreen === "reports" && <ReportsScreen />}
            {currentScreen === "users" && <UserManagementScreen />}
            {currentScreen === "settings" && <SettingsScreen />}
          </div>
        </main>
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileMenuOpen(false)} />
          <div className="absolute top-0 left-0 bottom-0 w-64 bg-white shadow-xl flex flex-col">
            <div className="flex justify-end p-2">
              <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <SidebarContent />
            </div>
          </div>
        </div>
      )}

      <Toaster />
    </div>
  );
}