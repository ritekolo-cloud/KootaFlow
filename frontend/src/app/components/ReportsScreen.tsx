import { Button } from "./ui/button";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Download, FileText } from "lucide-react";
import { toast } from "sonner";

const savingsTrendData = [
  { month: "Oct", amount: 620000 },
  { month: "Nov", amount: 750000 },
  { month: "Dec", amount: 890000 },
  { month: "Jan", amount: 1200000 },
  { month: "Feb", amount: 1450000 },
  { month: "Mar", amount: 1950000 },
];

const loanDistributionData = [
  { name: "Active", value: 12, color: "#0F5132" },
  { name: "Completed", value: 25, color: "#1F2937" },
  { name: "Overdue", value: 2, color: "#EF4444" },
];

const memberActivityData = [
  { month: "Oct", savings: 15, loans: 3 },
  { month: "Nov", savings: 18, loans: 5 },
  { month: "Dec", savings: 22, loans: 4 },
  { month: "Jan", savings: 28, loans: 6 },
  { month: "Feb", savings: 32, loans: 8 },
  { month: "Mar", savings: 38, loans: 5 },
];

export function ReportsScreen() {
  const handleExport = (type: string) => {
    toast.success(`Exporting ${type} report...`, {
      description: "Download will start shortly",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-medium text-foreground">Reports & Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">View group performance insights and export data</p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={() => handleExport("PDF")}
            variant="outline"
            className="rounded-md h-10 px-4"
          >
            <FileText className="w-4 h-4 mr-2" />
            PDF Report
          </Button>
          <Button
            onClick={() => handleExport("Excel")}
            className="rounded-md h-10 px-4"
          >
            <Download className="w-4 h-4 mr-2" />
            Export Data
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-card border border-border p-6 rounded-xl shadow-sm">
          <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2">Growth Rate</div>
          <div className="text-2xl font-semibold text-primary">+34%</div>
          <div className="text-xs text-muted-foreground mt-1">Month over month</div>
        </div>
        <div className="bg-card border border-border p-6 rounded-xl shadow-sm">
          <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2">Avg. Attendance</div>
          <div className="text-2xl font-semibold text-foreground">86%</div>
          <div className="text-xs text-muted-foreground mt-1">Last 6 meetings</div>
        </div>
        <div className="bg-card border border-border p-6 rounded-xl shadow-sm">
          <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2">Loan Recovery</div>
          <div className="text-2xl font-semibold text-primary">95%</div>
          <div className="text-xs text-muted-foreground mt-1">Of total disbursed</div>
        </div>
        <div className="bg-card border border-border p-6 rounded-xl shadow-sm">
          <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2">Active Participation</div>
          <div className="text-2xl font-semibold text-[#D4A017]">84%</div>
          <div className="text-xs text-muted-foreground mt-1">Members with savings</div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Savings Trend */}
        <div className="bg-card border border-border rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-medium text-foreground mb-6">Savings Trend (6 Months)</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={savingsTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                <XAxis dataKey="month" stroke="#9CA3AF" axisLine={false} tickLine={false} />
                <YAxis stroke="#9CA3AF" axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #E5E7EB", borderRadius: "4px" }}
                  formatter={(value: number) => `UGX ${value.toLocaleString()}`}
                />
                <Line
                  type="monotone"
                  dataKey="amount"
                  stroke="#0F5132"
                  strokeWidth={3}
                  dot={{ fill: "#0F5132", r: 4, strokeWidth: 0 }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Loan Distribution */}
        <div className="bg-card border border-border rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-medium text-foreground mb-6">Loan Status Distribution</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={loanDistributionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {loanDistributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #E5E7EB", borderRadius: "4px" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 mt-4">
            {loanDistributionData.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: item.color }} />
                <span className="text-sm font-medium text-[#4B5563]">{item.name}</span>
                <span className="text-sm text-[#9CA3AF]">({item.value})</span>
              </div>
            ))}
          </div>
        </div>

        {/* Member Activity */}
        <div className="bg-card border border-border rounded-xl shadow-sm p-6 lg:col-span-2">
          <h2 className="text-lg font-medium text-foreground mb-6">Member Activity Overview</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={memberActivityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                <XAxis dataKey="month" stroke="#9CA3AF" axisLine={false} tickLine={false} />
                <YAxis stroke="#9CA3AF" axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #E5E7EB", borderRadius: "4px" }}
                  cursor={{ fill: "#F3F4F6" }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: "20px" }} />
                <Bar dataKey="savings" fill="#0F5132" name="Savings Contributions" radius={[2, 2, 0, 0]} barSize={24} />
                <Bar dataKey="loans" fill="#D4A017" name="Loans Issued" radius={[2, 2, 0, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
