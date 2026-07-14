import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { toast } from "sonner";
import api from "../../services/api";

interface Loan {
  id: string;
  memberId: string;
  Member?: { fullName: string };
  amount: number;
  interestRate: number;
  totalRepayable: number;
  amountPaid: number;
  remainingBalance: number;
  status: string;
}

interface RepaymentRecord {
  id: string;
  loanId: string;
  Loan?: Loan;
  amountPaid: number;
  paymentDate: string;
  remainingBalance: number;
}

export function RepaymentsScreen() {
  const [selectedLoan, setSelectedLoan] = useState("");
  const [amount, setAmount] = useState("");
  const [saved, setSaved] = useState(false);
  const [activeLoans, setActiveLoans] = useState<Loan[]>([]);
  const [repayments, setRepayments] = useState<RepaymentRecord[]>([]);

  const fetchInitialData = async () => {
    try {
      const loansRes = await api.get('/loans');
      if (loansRes.data.success) {
        setActiveLoans(loansRes.data.data.filter((l: Loan) => l.status === 'ACTIVE'));
      }
      const repaymentsRes = await api.get('/repayments');
      if (repaymentsRes.data.success) {
        setRepayments(repaymentsRes.data.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const currentLoan = activeLoans.find(loan => loan.id === selectedLoan);
  
  const parsedAmount = parseFloat(amount);
  const newBalance = currentLoan 
    ? (currentLoan.remainingBalance || 0) - (isNaN(parsedAmount) ? 0 : parsedAmount)
    : 0;

  const handleSubmit = async () => {
    if (!selectedLoan || !amount) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (currentLoan && parseFloat(amount) > (currentLoan.remainingBalance || 0)) {
      toast.error("Payment amount exceeds loan balance");
      return;
    }

    try {
      setSaved(true);
      await api.post('/repayments', {
        loanId: selectedLoan,
        amountPaid: parseFloat(amount)
      });
      toast.success("Repayment recorded successfully");
      fetchInitialData();
      
      setTimeout(() => {
        setSelectedLoan("");
        setAmount("");
        setSaved(false);
      }, 2000);
    } catch (err) {
      toast.error("Failed to record repayment");
      setSaved(false);
    }
  };

  const userString = localStorage.getItem("user");
  const userRole = userString ? JSON.parse(userString).role : "";

  const todayTotal = repayments
    .filter(r => new Date(r.paymentDate).toDateString() === new Date().toDateString())
    .reduce((sum, r) => sum + r.amountPaid, 0);
  
  const allTimeTotal = repayments.reduce((sum, r) => sum + r.amountPaid, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-medium text-foreground">Repayments</h1>
        <p className="text-sm text-muted-foreground mt-1">Record and track member loan repayments</p>
      </div>

      <div className={`grid grid-cols-1 ${userRole !== "MEMBER" ? "lg:grid-cols-3 gap-6" : ""}`}>
        {/* Form Column */}
        {userRole !== "MEMBER" && (
        <div className="lg:col-span-1 bg-card border border-border rounded-xl shadow-sm p-6 sm:p-8 self-start">
          <h2 className="text-lg font-medium text-foreground mb-6">Record Payment</h2>
          
          <div className="space-y-5">
            <div>
              <Label className="text-sm font-medium text-foreground">Active Loan</Label>
              <select
                className="w-full mt-1.5 px-3 py-2 rounded-md border border-input focus:ring-1 focus:ring-ring outline-none text-sm bg-background text-foreground"
                value={selectedLoan}
                onChange={(e) => setSelectedLoan(e.target.value)}
              >
                <option value="">Select a loan...</option>
                {activeLoans.map((loan) => (
                  <option key={loan.id} value={loan.id}>
                    {loan.Member?.fullName || "Unknown"} (Bal: UGX {(loan.remainingBalance || 0).toLocaleString()})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label className="text-sm font-medium text-foreground">Amount Paid (UGX)</Label>
              <Input
                type="number"
                placeholder="0"
                className="mt-1.5"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            <div className="p-4 bg-muted/20 border border-border rounded-md">
              <div className="text-sm font-medium text-muted-foreground mb-1">Preview New Balance</div>
              <div className="text-2xl font-semibold text-foreground">
                UGX {newBalance > 0 ? newBalance.toLocaleString() : "0"}
              </div>
            </div>

            <Button
              className="w-full mt-6"
              onClick={handleSubmit}
              disabled={saved || !selectedLoan || !amount}
            >
              {saved ? "Recording..." : "Record Payment"}
            </Button>
          </div>
        </div>
        )}

        {/* Table Column */}
        <div className={userRole !== "MEMBER" ? "lg:col-span-2 space-y-6" : "col-span-1 space-y-6"}>
          <div className="grid grid-cols-2 gap-6 bg-card p-6 border border-border rounded-xl shadow-sm">
            <div className="border-r border-border pr-4">
              <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2">Today's Collections</div>
              <div className="text-2xl font-semibold text-primary">UGX {todayTotal.toLocaleString()}</div>
            </div>
            <div className="pl-4">
              <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2">All Time Total</div>
              <div className="text-2xl font-semibold text-foreground">UGX {allTimeTotal.toLocaleString()}</div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-border bg-muted/10">
              <h2 className="text-lg font-medium text-foreground">Recent Payments</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/30 border-b border-border">
                  <tr>
                    <th className="px-6 py-3 font-medium text-muted-foreground">Date</th>
                    <th className="px-6 py-3 font-medium text-muted-foreground">Member</th>
                    <th className="px-6 py-3 font-medium text-muted-foreground">Amount Paid</th>
                    <th className="px-6 py-3 font-medium text-muted-foreground">Balance After</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {repayments.length > 0 ? (
                    repayments.map((record) => (
                      <tr key={record.id} className="hover:bg-muted/50 transition-colors">
                        <td className="px-6 py-4 text-muted-foreground">
                          {new Date(record.paymentDate).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-foreground font-medium">
                          {record.Loan?.Member?.fullName || "Unknown"}
                        </td>
                        <td className="px-6 py-4 text-primary font-medium">
                          UGX {record.amountPaid.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-muted-foreground">
                          UGX {record.remainingBalance.toLocaleString()}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">
                        No repayment records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
