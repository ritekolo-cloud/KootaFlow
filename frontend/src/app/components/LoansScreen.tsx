import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";
import api from "../../services/api";

interface Loan {
  id: string;
  memberId: string;
  Member?: { fullName: string };
  amount: number;
  interestRate: number;
  totalRepayable?: number;
  amountPaid?: number;
  remainingBalance?: number;
  status: "ACTIVE" | "COMPLETED" | "DEFAULTED";
  loanDate: string;
  dueDate: string;
}

interface Member {
  id: string;
  fullName: string;
}

export function LoansScreen() {
  const [filter, setFilter] = useState<"ALL" | "ACTIVE" | "COMPLETED" | "DEFAULTED">("ALL");
  const [loans, setLoans] = useState<Loan[]>([]);

  const fetchLoans = async () => {
    try {
      const res = await api.get('/loans');
      if (res.data.success) {
        setLoans(res.data.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchLoans();
  }, []);

  const filteredLoans = filter === "ALL" ? loans : loans.filter(loan => loan.status === filter);

  const userString = localStorage.getItem("user");
  const userRole = userString ? JSON.parse(userString).role : "";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-medium text-foreground">Loans</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage member loan disbursements and tracking</p>
        </div>
        {userRole !== "MEMBER" && <IssueLoanDialog onLoanIssued={fetchLoans} />}
      </div>

      {/* Summary Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card border border-border p-6 rounded-xl shadow-sm">
          <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2">Total Disbursed</div>
          <div className="text-2xl font-semibold text-foreground">UGX {loans.reduce((sum, l) => sum + l.amount, 0).toLocaleString()}</div>
        </div>
        <div className="bg-card border border-border p-6 rounded-xl shadow-sm">
          <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2">Active Loans</div>
          <div className="text-2xl font-semibold text-[#D4A017]">{loans.filter(l => l.status === 'ACTIVE').length}</div>
        </div>
        <div className="bg-card border border-border p-6 rounded-xl shadow-sm">
          <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2">Total Collected</div>
          <div className="text-2xl font-semibold text-primary">UGX {loans.reduce((sum, l) => sum + (l.amountPaid || 0), 0).toLocaleString()}</div>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between bg-muted/10">
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search loans..."
              className="pl-9 h-10 bg-background"
            />
          </div>
          <select 
            className="h-10 px-3 py-2 rounded-md border border-input text-sm bg-background text-foreground focus:ring-1 focus:ring-ring outline-none"
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="COMPLETED">Completed</option>
            <option value="DEFAULTED">Defaulted</option>
          </select>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/30 border-b border-border">
              <tr>
                <th className="px-6 py-3 font-medium text-muted-foreground">Member</th>
                <th className="px-6 py-3 font-medium text-muted-foreground">Principal</th>
                <th className="px-6 py-3 font-medium text-muted-foreground">Repayable</th>
                <th className="px-6 py-3 font-medium text-muted-foreground">Progress</th>
                <th className="px-6 py-3 font-medium text-muted-foreground">Due Date</th>
                <th className="px-6 py-3 font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredLoans.length > 0 ? (
                filteredLoans.map((loan) => {
                  let progress = loan.totalRepayable ? Math.round(((loan.amountPaid || 0) / loan.totalRepayable) * 100) : 0;
                  progress = Math.max(0, Math.min(100, progress));
                  
                  return (
                    <tr key={loan.id} className="hover:bg-muted/50 transition-colors">
                      <td className="px-6 py-4 text-foreground font-medium">
                        {loan.Member?.fullName || "Unknown"}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        UGX {loan.amount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-foreground font-medium">
                        UGX {(loan.totalRepayable || 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="w-full max-w-[120px]">
                          <div className="flex justify-between text-xs mb-1 text-muted-foreground">
                            <span>{progress}%</span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2">
                            <div 
                              className="bg-primary h-2 rounded-full" 
                              style={{ width: `${progress}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {new Date(loan.dueDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          loan.status === 'ACTIVE' ? 'bg-[#FEF3E2] text-[#D4A017]' : 
                          loan.status === 'COMPLETED' ? 'bg-primary/10 text-primary' : 
                          'bg-destructive/10 text-destructive'
                        }`}>
                          {loan.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                    No loans found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function IssueLoanDialog({ onLoanIssued }: { onLoanIssued: () => void }) {
  const [selectedMember, setSelectedMember] = useState("");
  const [amount, setAmount] = useState("");
  const [interestRate, setInterestRate] = useState("10");
  const [totalRepayable, setTotalRepayable] = useState("");
  const [saved, setSaved] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    api.get('/members').then(res => {
      if (res.data.success) setMembers(res.data.data);
    }).catch(console.error);
  }, []);

  const calculateTotal = (loanAmount: string, rate: string) => {
    if (loanAmount && rate) {
      const total = parseFloat(loanAmount) * (1 + parseFloat(rate) / 100);
      setTotalRepayable(total.toString());
    } else {
      setTotalRepayable("");
    }
  };

  const handleAmountChange = (value: string) => {
    setAmount(value);
    calculateTotal(value, interestRate);
  };

  const handleInterestChange = (value: string) => {
    setInterestRate(value);
    calculateTotal(amount, value);
  };

  const handleSubmit = async () => {
    if (!selectedMember || !amount || !interestRate) {
      toast.error("Please fill in all required fields");
      return;
    }
    try {
      setSaved(true);
      await api.post('/loans', {
        memberId: selectedMember,
        amount: parseFloat(amount),
        interestRate: parseFloat(interestRate),
        dueDate: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString()
      });
      toast.success("Loan issued successfully");
      onLoanIssued();
      setIsOpen(false);
      setSelectedMember("");
      setAmount("");
      setInterestRate("10");
      setTotalRepayable("");
    } catch (err) {
      toast.error("Failed to issue loan");
    } finally {
      setSaved(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="bg-secondary hover:bg-secondary/90 text-secondary-foreground rounded-md h-10 px-4">
          <Plus className="w-4 h-4 mr-2" />
          Issue Loan
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md rounded-md">
        <DialogHeader>
          <DialogTitle className="text-xl">Issue New Loan</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="loan-member" className="text-sm font-medium text-foreground">Select Member *</Label>
            <select 
              id="loan-member"
              className="w-full mt-1.5 px-3 py-2 rounded-md border border-input focus:ring-1 focus:ring-ring outline-none text-sm bg-background text-foreground"
              value={selectedMember} 
              onChange={(e) => setSelectedMember(e.target.value)}
            >
              <option value="">Choose a member</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>{member.fullName}</option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="loan-amount" className="text-sm font-medium text-foreground">Loan Amount *</Label>
            <Input
              id="loan-amount"
              type="number"
              placeholder="Enter amount"
              value={amount}
              onChange={(e) => handleAmountChange(e.target.value)}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="interest" className="text-sm font-medium text-foreground">Interest Rate (%) *</Label>
            <Input
              id="interest"
              type="number"
              placeholder="Enter rate"
              value={interestRate}
              onChange={(e) => handleInterestChange(e.target.value)}
              className="mt-1.5"
            />
          </div>
          <div className="p-4 bg-muted/20 border border-border rounded-md mt-2">
            <div className="text-sm text-muted-foreground mb-1">Total Repayable</div>
            <div className="text-2xl font-semibold text-foreground">
              UGX {totalRepayable ? parseFloat(totalRepayable).toLocaleString() : "0"}
            </div>
          </div>
          <Button
            onClick={handleSubmit}
            disabled={saved}
            className="w-full h-10 bg-secondary hover:bg-secondary/90 text-secondary-foreground rounded-md mt-6"
          >
            {saved ? "Issuing..." : "Issue Loan"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
