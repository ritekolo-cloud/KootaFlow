import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { toast } from "sonner";
import api from "../../services/api";

interface SavingRecord {
  id: string;
  memberId: string;
  Member?: { fullName: string };
  amount: number;
  savingDate: string;
  sharesBought?: number;
}

interface Member {
  id: string;
  fullName: string;
}

export function SavingsScreen() {
  const [selectedMember, setSelectedMember] = useState("");
  const [shares, setShares] = useState("");
  const [amount, setAmount] = useState("");
  const [saved, setSaved] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [savingsHistory, setSavingsHistory] = useState<SavingRecord[]>([]);

  const fetchInitialData = async () => {
    try {
      const membersRes = await api.get('/members');
      if (membersRes.data.success) {
        setMembers(membersRes.data.data);
      }
      const savingsRes = await api.get('/savings');
      if (savingsRes.data.success) {
        setSavingsHistory(savingsRes.data.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const shareValue = 10000; // UGX per share

  const handleSharesChange = (value: string) => {
    setShares(value);
    if (value) {
      setAmount((parseInt(value) * shareValue).toString());
    } else {
      setAmount("");
    }
  };

  const handleSubmit = async () => {
    if (!selectedMember || !amount) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      setSaved(true);
      await api.post('/savings', {
        memberId: selectedMember,
        amount: parseFloat(amount)
      });
      toast.success("Savings recorded successfully");
      fetchInitialData();
      
      setTimeout(() => {
        setSelectedMember("");
        setShares("");
        setAmount("");
        setSaved(false);
      }, 2000);
    } catch (err) {
      toast.error("Failed to record savings");
      setSaved(false);
    }
  };

  const userString = localStorage.getItem("user");
  const userRole = userString ? JSON.parse(userString).role : "";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-medium text-foreground">Savings</h1>
        <p className="text-sm text-muted-foreground mt-1">Record member contributions and view savings history</p>
      </div>

      <div className={`grid grid-cols-1 ${userRole !== "MEMBER" ? "lg:grid-cols-3 gap-6" : ""}`}>
        {/* Form */}
        {userRole !== "MEMBER" && (
          <div className="lg:col-span-1 bg-card border border-border rounded-xl shadow-sm p-6 sm:p-8 self-start">
            <h2 className="text-lg font-medium text-foreground mb-6">Record Contribution</h2>
          
          <div className="space-y-5">
            <div>
              <Label className="text-sm font-medium text-foreground">Member</Label>
              <select
                className="w-full mt-1.5 px-3 py-2 rounded-md border border-input focus:ring-1 focus:ring-ring outline-none text-sm bg-background text-foreground"
                value={selectedMember}
                onChange={(e) => setSelectedMember(e.target.value)}
              >
                <option value="">Select a member...</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>{m.fullName}</option>
                ))}
              </select>
            </div>
            
            <div>
              <Label className="text-sm font-medium text-foreground">Amount (UGX)</Label>
              <Input
                type="number"
                placeholder="0"
                className="mt-1.5"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            
            <Button 
              className="w-full mt-6"
              onClick={handleSubmit}
              disabled={saved || !selectedMember || !amount}
            >
              {saved ? "Recording..." : "Record Saving"}
            </Button>
          </div>
        </div>
        )}

        {/* List */}
        <div className={userRole !== "MEMBER" ? "lg:col-span-2" : "col-span-1"}>
          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-border bg-muted/10">
              <h2 className="text-lg font-medium text-foreground">Recent Contributions</h2>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/30 border-b border-border">
                  <tr>
                    <th className="px-6 py-3 font-medium text-muted-foreground">Date</th>
                    <th className="px-6 py-3 font-medium text-muted-foreground">Member</th>
                    <th className="px-6 py-3 font-medium text-muted-foreground">Amount</th>
                    <th className="px-6 py-3 font-medium text-muted-foreground">Shares Added</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {savingsHistory.length > 0 ? (
                    savingsHistory.map((record) => (
                      <tr key={record.id} className="hover:bg-muted/50 transition-colors">
                        <td className="px-6 py-4 text-muted-foreground">
                          {new Date(record.savingDate).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-foreground font-medium">
                          {record.Member?.fullName || "Unknown"}
                        </td>
                        <td className="px-6 py-4 text-primary font-medium">
                          UGX {record.amount.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-muted-foreground">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-secondary/10 text-secondary-foreground/80 border border-secondary/20">
                            +{record.sharesBought} shares
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">
                        No recent contributions found.
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
