import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Wallet, CreditCard, Users, AlertCircle, BarChart3 } from "lucide-react";
import api from "../../services/api";

interface Transaction {
  id: string;
  type: "SAVING" | "LOAN" | "REPAYMENT";
  description: string;
  amount?: number;
  date: string;
}

interface DashboardStats {
  totalMembers: number;
  totalSavings: number;
  activeLoansCount: number;
  pendingRepaymentsAmount: number;
  recentActivities: Transaction[];
}

export function DashboardScreen({ onNavigate }: { onNavigate: (screen: string) => void }) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const userStr = localStorage.getItem("user");
  const currentUser = userStr ? JSON.parse(userStr) : null;
  const roleStr = currentUser?.role ? currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1).toLowerCase() : "User";

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/dashboard/stats');
        if (res.data.success) {
          setStats(res.data.data);
        }
      } catch (error) {
        console.error("Failed to load dashboard stats", error);
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-medium text-foreground tracking-tight">Good Morning, {currentUser?.name || "User"}</h1>
        <p className="text-sm text-muted-foreground mt-1">VSLA Overview - {roleStr} Access</p>
      </div>

      {/* KPI Cards Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        <Card className="shadow-sm hover:shadow-md transition-shadow duration-200 border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total Savings</CardTitle>
            <Wallet className="w-5 h-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-foreground">UGX {stats?.totalSavings.toLocaleString() || 0}</div>
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow-md transition-shadow duration-200 border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Active Loans</CardTitle>
            <CreditCard className="w-5 h-5 text-[#D4A017]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-foreground">{stats?.activeLoansCount || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Currently outstanding</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow-md transition-shadow duration-200 border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Members</CardTitle>
            <Users className="w-5 h-5 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-foreground">{stats?.totalMembers || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Active group members</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow-md transition-shadow duration-200 border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Pending Payments</CardTitle>
            <AlertCircle className="w-5 h-5 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-foreground">UGX {stats?.pendingRepaymentsAmount.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Awaiting collection</p>
          </CardContent>
        </Card>
      </div>

      {/* Savings Growth Chart */}
      <Card className="shadow-sm border-border">
        <CardHeader className="border-b border-border bg-muted/20">
          <CardTitle className="text-lg font-medium text-foreground">Savings Growth Chart</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="p-8 h-64 flex flex-col items-center justify-center bg-muted/10 text-center">
            <BarChart3 className="w-8 h-8 text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground text-sm">Chart visualization goes here (e.g. Recharts or Chart.js)</p>
          </div>
        </CardContent>
      </Card>

      {/* Recent Transactions Table */}
      <Card className="shadow-sm border-border overflow-hidden">
        <CardHeader className="border-b border-border bg-muted/20 flex flex-row justify-between items-center py-4">
          <CardTitle className="text-lg font-medium text-foreground">Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/30 border-b border-border">
              <tr>
                <th className="px-6 py-3 font-medium text-muted-foreground">Date</th>
                <th className="px-6 py-3 font-medium text-muted-foreground">Description</th>
                <th className="px-6 py-3 font-medium text-muted-foreground">Type</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {stats?.recentActivities && stats.recentActivities.length > 0 ? (
                stats.recentActivities.map((tx) => (
                  <tr key={tx.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-muted-foreground">
                      {new Date(tx.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-foreground font-medium">
                      {tx.description}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        tx.type === 'SAVING' ? 'bg-primary/10 text-primary' : 
                        tx.type === 'LOAN' ? 'bg-[#FEF3E2] text-[#D4A017]' : 
                        'bg-muted text-muted-foreground'
                      }`}>
                        {tx.type}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-muted-foreground flex flex-col items-center justify-center">
                    <AlertCircle className="w-8 h-8 text-muted-foreground/40 mb-2" />
                    <p>No recent transactions found.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        </CardContent>
      </Card>
    </div>
  );
}
