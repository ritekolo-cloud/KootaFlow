import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import { Plus, Ban, KeyRound, CheckCircle } from "lucide-react";
import api from "../../services/api";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
}

export function UserManagementScreen() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("MEMBER");

  const [newPassword, setNewPassword] = useState("");

  const fetchUsers = async () => {
    try {
      const res = await api.get("/users");
      if (res.data.success) {
        setUsers(res.data.data);
      }
    } catch (error) {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post("/users", { name, email, password, role });
      if (res.data.success) {
        if (res.data.data.warning) {
          toast.warning(res.data.data.warning, { duration: 5000 });
        } else {
          toast.success("User created successfully");
        }
        setIsAddUserOpen(false);
        fetchUsers();
        setName("");
        setEmail("");
        setPassword("");
        setRole("MEMBER");
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to create user");
    }
  };

  const handleToggleStatus = async (user: User) => {
    const newStatus = user.status === "ACTIVE" ? "DISABLED" : "ACTIVE";
    if (!window.confirm(`Are you sure you want to ${newStatus.toLowerCase()} this user?`)) return;
    
    try {
      const res = await api.put(`/users/${user.id}`, {
        name: user.name,
        email: user.email,
        role: user.role,
        status: newStatus
      });
      if (res.data.success) {
        toast.success(`User ${newStatus.toLowerCase()} successfully`);
        fetchUsers();
      }
    } catch (error) {
      toast.error("Failed to update user status");
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) return;

    try {
      const res = await api.patch(`/users/${selectedUserId}/reset-password`, { newPassword });
      if (res.data.success) {
        if (res.data.data.warning) {
          toast.warning(res.data.data.warning, { duration: 5000 });
        } else {
          toast.success("Password reset successfully");
        }
        setIsResetPasswordOpen(false);
        setNewPassword("");
      }
    } catch (error) {
      toast.error("Failed to reset password");
    }
  };

  const openResetPassword = (id: string) => {
    setSelectedUserId(id);
    setIsResetPasswordOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-medium text-foreground">User Management</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage system access and roles</p>
        </div>
        <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-md h-10 px-4">
              <Plus className="w-4 h-4 mr-2" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md rounded-md">
            <DialogHeader>
              <DialogTitle className="text-xl">Create New User</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddUser} className="space-y-4 py-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Full Name</label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 rounded-md border border-input focus:ring-1 focus:ring-ring outline-none bg-background text-foreground"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Email</label>
                <input
                  type="email"
                  required
                  className="w-full px-3 py-2 rounded-md border border-input focus:ring-1 focus:ring-ring outline-none bg-background text-foreground"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Password</label>
                <input
                  type="password"
                  required
                  className="w-full px-3 py-2 rounded-md border border-input focus:ring-1 focus:ring-ring outline-none bg-background text-foreground"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Role</label>
                <select
                  className="w-full px-3 py-2 rounded-md border border-input focus:ring-1 focus:ring-ring outline-none bg-background text-foreground"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                >
                  <option value="MEMBER">MEMBER (View Only)</option>
                  <option value="TREASURER">TREASURER (Manage Operations)</option>
                  <option value="ADMIN">ADMIN (Full Access)</option>
                </select>
              </div>
              <div className="flex gap-3 justify-end mt-6">
                <Button type="button" variant="outline" onClick={() => setIsAddUserOpen(false)} className="rounded-md">
                  Cancel
                </Button>
                <Button type="submit">
                  Create User
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border bg-muted/10">
          <h2 className="text-lg font-medium text-foreground">System Users</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/30 border-b border-border">
              <tr>
                <th className="px-6 py-3 font-medium text-muted-foreground">Name</th>
                <th className="px-6 py-3 font-medium text-muted-foreground">Email</th>
                <th className="px-6 py-3 font-medium text-muted-foreground">Role</th>
                <th className="px-6 py-3 font-medium text-muted-foreground">Status</th>
                <th className="px-6 py-3 font-medium text-muted-foreground text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                    Loading users...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                    No users found.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-foreground">{user.name}</td>
                    <td className="px-6 py-4 text-muted-foreground">{user.email}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' :
                        user.role === 'TREASURER' ? 'bg-blue-100 text-blue-700' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`flex items-center gap-1.5 text-xs font-medium ${
                        user.status === 'ACTIVE' ? 'text-primary' : 'text-destructive'
                      }`}>
                        {user.status === 'ACTIVE' ? <CheckCircle className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
                        {user.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openResetPassword(user.id)}
                          title="Reset Password"
                          className="text-[#D4A017] hover:bg-[#FEF3E2] hover:text-[#B38510] h-8 w-8"
                        >
                          <KeyRound className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleToggleStatus(user)}
                          title={user.status === 'ACTIVE' ? "Disable User" : "Enable User"}
                          className={`h-8 w-8 ${user.status === 'ACTIVE' ? 'text-destructive hover:bg-destructive/10' : 'text-primary hover:bg-primary/10'}`}
                        >
                          <Ban className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={isResetPasswordOpen} onOpenChange={setIsResetPasswordOpen}>
        <DialogContent className="sm:max-w-sm rounded-md">
          <DialogHeader>
            <DialogTitle className="text-lg">Reset Password</DialogTitle>
          </DialogHeader>
            <form onSubmit={handleResetPassword} className="space-y-4 py-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">New Password</label>
                <input
                  type="password"
                  required
                  className="w-full px-3 py-2 rounded-md border border-input focus:ring-1 focus:ring-ring outline-none bg-background text-foreground"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <div className="flex gap-3 justify-end mt-4">
                <Button type="button" variant="outline" onClick={() => setIsResetPasswordOpen(false)} className="rounded-md">
                  Cancel
                </Button>
                <Button type="submit" className="bg-secondary hover:bg-secondary/90 text-secondary-foreground rounded-md">
                  Reset Password
                </Button>
              </div>
            </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
