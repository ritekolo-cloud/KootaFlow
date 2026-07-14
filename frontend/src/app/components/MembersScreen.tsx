import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Label } from "./ui/label";
import { Search, Plus } from "lucide-react";
import api from "../../services/api";

interface Member {
  id: string;
  fullName: string;
  phoneNumber: string;
  email: string | null;
  gender: string;
  totalSavings?: number;
  activeLoans?: number;
  membershipStatus: string;
}

export function MembersScreen() {
  const [searchTerm, setSearchTerm] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [newMember, setNewMember] = useState({ fullName: '', phoneNumber: '', email: '', gender: 'Other' });
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const fetchMembers = async () => {
    try {
      const res = await api.get('/members');
      if (res.data.success) {
        setMembers(res.data.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const handleAddMember = async () => {
    setLoading(true);
    try {
      await api.post('/members', newMember);
      fetchMembers();
      setNewMember({ fullName: '', phoneNumber: '', email: '', gender: 'Other' });
      setIsDialogOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredMembers = members.filter(member =>
    member.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.phoneNumber.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-medium text-foreground">Members</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage all VSLA group members</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-md h-10 px-4">
              <Plus className="w-4 h-4 mr-2" />
              Add Member
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md rounded-md">
            <DialogHeader>
              <DialogTitle className="text-xl">Add New Member</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="name" className="text-sm font-medium text-foreground">Full Name</Label>
                <Input 
                  id="name" 
                  placeholder="Enter full name" 
                  className="mt-1.5" 
                  value={newMember.fullName} 
                  onChange={e => setNewMember({...newMember, fullName: e.target.value})} 
                />
              </div>
              <div>
                <Label htmlFor="phone" className="text-sm font-medium text-foreground">Phone Number</Label>
                <Input 
                  id="phone" 
                  placeholder="+256 700 000 000" 
                  className="mt-1.5" 
                  value={newMember.phoneNumber} 
                  onChange={e => setNewMember({...newMember, phoneNumber: e.target.value})} 
                />
              </div>
              <div>
                <Label htmlFor="email" className="text-sm font-medium text-foreground">Email (Optional)</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="email@example.com" 
                  className="mt-1.5" 
                  value={newMember.email} 
                  onChange={e => setNewMember({...newMember, email: e.target.value})} 
                />
              </div>
              <div>
                <Label htmlFor="gender" className="text-sm font-medium text-foreground">Gender</Label>
                <select 
                  id="gender"
                  className="w-full mt-1.5 px-3 py-2 rounded-md border border-input focus:ring-1 focus:ring-ring outline-none text-sm bg-background text-foreground"
                  value={newMember.gender} 
                  onChange={e => setNewMember({...newMember, gender: e.target.value})}
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <Button 
                onClick={handleAddMember} 
                disabled={loading} 
                className="w-full mt-6"
              >
                {loading ? "Adding..." : "Save Member"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border flex items-center bg-muted/10">
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search members by name or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-10 bg-background"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/30 border-b border-border">
              <tr>
                <th className="px-6 py-3 font-medium text-muted-foreground">Name</th>
                <th className="px-6 py-3 font-medium text-muted-foreground">Phone</th>
                <th className="px-6 py-3 font-medium text-muted-foreground">Gender</th>
                <th className="px-6 py-3 font-medium text-muted-foreground">Total Savings</th>
                <th className="px-6 py-3 font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredMembers.length > 0 ? (
                filteredMembers.map((member) => (
                  <tr key={member.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-4 text-foreground font-medium">
                      {member.fullName}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {member.phoneNumber}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {member.gender}
                    </td>
                    <td className="px-6 py-4 text-primary font-medium">
                      UGX {(member.totalSavings || 0).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        member.membershipStatus === 'ACTIVE' 
                          ? 'bg-primary/10 text-primary' 
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        {member.membershipStatus}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                    {members.length === 0 ? "No members found. Start by adding your first VSLA member." : "No matching members found."}
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
