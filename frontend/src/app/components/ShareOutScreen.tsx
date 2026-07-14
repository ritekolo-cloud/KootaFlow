import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Calculator, Download } from "lucide-react";
import { toast } from "sonner";
import api from "../../services/api";

interface ShareOutMember {
  memberId: string;
  name: string;
  totalSavings: number;
  shares: number;
  loanInterestEarned: number;
  totalPayout: number;
}

export function ShareOutScreen() {
  const [calculated, setCalculated] = useState(false);
  const [shareOutData, setShareOutData] = useState<ShareOutMember[]>([]);
  const [groupId, setGroupId] = useState<string>("");

  useEffect(() => {
    api.get('/members').then(res => {
      if (res.data.success) {
        const membersData = res.data.data;
        if (membersData.length > 0) {
          setGroupId(membersData[0].groupId);
        }
        
        // Prepare preview data
        const preview: ShareOutMember[] = membersData.map((m: any) => {
          const savings = (m.totalSavings || 0);
          return {
            memberId: m.id,
            name: m.fullName,
            totalSavings: savings,
            shares: savings / 10000,
            loanInterestEarned: 0, // Mock for preview
            totalPayout: savings, // Without interest for now
          };
        });
        setShareOutData(preview);
      }
    }).catch(console.error);
  }, []);

  const totalPool = shareOutData.reduce((sum, member) => sum + member.totalSavings, 0);
  const totalInterest = shareOutData.reduce((sum, member) => sum + member.loanInterestEarned, 0);
  const totalPayout = shareOutData.reduce((sum, member) => sum + member.totalPayout, 0);

  const handleCalculate = async () => {
    try {
      await api.post('/shareout/calculate', {
        groupId,
        totalAvailableShareOut: totalPayout
      });
      setCalculated(true);
      toast.success("Share-out calculated successfully");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to calculate share-out");
    }
  };

  const handleExport = () => {
    toast.success("Exporting share-out report...");
  };

  const userString = localStorage.getItem("user");
  const userRole = userString ? JSON.parse(userString).role : "";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
        <h1 className="text-xl font-medium text-foreground">Share Out Projection</h1>
        <p className="text-sm text-muted-foreground mt-1">Calculate and simulate end-of-cycle distribution</p>
      </div>
        {calculated && (
          <Button
            onClick={handleExport}
            variant="outline"
            className="rounded-md h-10 px-4 border-border"
          >
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        )}
      </div>

      {/* Summary Section */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-card border border-border p-6 rounded-xl shadow-sm">
          <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2">Total Savings Pool</div>
          <div className="text-2xl font-semibold text-primary">UGX {totalPool.toLocaleString()}</div>
        </div>
        <div className="bg-card border border-border p-6 rounded-xl shadow-sm">
          <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2">Total Interest Earned</div>
          <div className="text-2xl font-semibold text-[#D4A017]">UGX {totalInterest.toLocaleString()}</div>
        </div>
        <div className="bg-card border border-border p-6 rounded-xl shadow-sm">
          <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2">Total Shares</div>
          <div className="text-2xl font-semibold text-foreground">{shareOutData.reduce((sum, m) => sum + m.shares, 0)}</div>
        </div>
        <div className="bg-card border border-border p-6 rounded-xl shadow-sm">
          <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2">New Share Value</div>
          <div className="text-2xl font-semibold text-foreground">
            UGX {shareOutData.reduce((sum, m) => sum + m.shares, 0) > 0
              ? Math.floor((totalPool + totalInterest) / shareOutData.reduce((sum, m) => sum + m.shares, 0)).toLocaleString()
              : 0}
          </div>
          <p className="text-xs text-muted-foreground mt-1">Original: UGX 10,000</p>
        </div>
      </div>

      {/* Action Area */}
      {!calculated && userRole !== "MEMBER" && (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <div className="w-16 h-16 bg-muted/30 border border-border rounded-full flex items-center justify-center mx-auto mb-4">
            <Calculator className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-2">Ready to Calculate Share-Out?</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
            This will calculate each member's exact payout based on their individual savings and their proportional share of the group's loan interest.
          </p>
          <Button
            onClick={handleCalculate}
            disabled={!groupId || totalPool === 0}
            className="h-10 px-6"
          >
            {totalPool === 0 ? "No Savings to Share" : "Run Calculation"}
          </Button>
        </div>
      )}

      {/* Results Table */}
      {(calculated || userRole === "MEMBER") && (
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-muted/10">
          <h2 className="text-lg font-medium text-foreground">Member Payout Projection</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/30 border-b border-border">
              <tr>
                <th className="px-6 py-3 font-medium text-muted-foreground">Member</th>
                <th className="px-6 py-3 font-medium text-muted-foreground">Shares Owned</th>
                <th className="px-6 py-3 font-medium text-muted-foreground">Base Savings</th>
                <th className="px-6 py-3 font-medium text-muted-foreground">Interest Earned</th>
                <th className="px-6 py-3 font-medium text-muted-foreground">Total Payout</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
                {shareOutData.length > 0 ? (
                  shareOutData.map((member, index) => (
                    <tr key={index} className="hover:bg-muted/50 transition-colors">
                      <td className="px-6 py-4 text-foreground font-medium">{member.name}</td>
                      <td className="px-6 py-4 text-muted-foreground">{member.shares}</td>
                      <td className="px-6 py-4 text-muted-foreground">UGX {member.totalSavings.toLocaleString()}</td>
                      <td className="px-6 py-4 text-[#D4A017] font-medium">+ UGX {member.loanInterestEarned.toLocaleString()}</td>
                      <td className="px-6 py-4 text-primary font-medium">UGX {member.totalPayout.toLocaleString()}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                      No member projection data available.
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot className="bg-muted/10 border-t-2 border-border">
                <tr>
                  <td className="px-6 py-4 font-semibold text-foreground">TOTAL</td>
                  <td className="px-6 py-4 font-medium text-muted-foreground">
                    {shareOutData.reduce((sum, m) => sum + m.shares, 0)}
                  </td>
                  <td className="px-6 py-4 font-semibold text-foreground">
                    UGX {totalPool.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 font-semibold text-[#D4A017]">
                    +UGX {totalInterest.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 font-bold text-primary text-base">
                    UGX {totalPayout.toLocaleString()}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Info Banner */}
      <div className="bg-muted/20 border border-border rounded-xl p-4 flex gap-3">
        <div className="text-muted-foreground">ℹ️</div>
        <div>
          <h4 className="text-sm font-medium text-foreground mb-1">Calculation Method</h4>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Payout = (Member's Total Savings) + (Total Group Interest × (Member's Shares / Total Group Shares)).
            Ensure all loans are finalized before running the final calculation.
          </p>
        </div>
      </div>
    </div>
  );
}
