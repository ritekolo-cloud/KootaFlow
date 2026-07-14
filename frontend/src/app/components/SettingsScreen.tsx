import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { User, Lock, Settings } from "lucide-react";
import api from "../../services/api";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
export function SettingsScreen() {
  const [user, setUser] = useState<{name: string, email: string, role: string} | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  const handleTwoFactorClick = () => {
    toast.info("Two-Factor Authentication is coming soon!");
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Please fill in all fields");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await api.post("/auth/change-password", {
        currentPassword,
        newPassword
      });
      if (res.data.success) {
        if (res.data.data.warning) {
          toast.warning(res.data.data.warning, { duration: 5000 });
        } else {
          toast.success("Password updated successfully");
        }
        setIsPasswordModalOpen(false);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to change password");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-medium text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your profile and system preferences</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profile Details */}
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-border bg-muted/10 flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-medium text-foreground">Profile Details</h2>
          </div>
          <div className="p-6 space-y-5">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Full Name</label>
              <div className="text-foreground font-medium">{user?.name}</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Email Address</label>
              <div className="text-foreground font-medium">{user?.email}</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">System Role</label>
              <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground capitalize">
                {user?.role.toLowerCase()}
              </div>
            </div>
          </div>
        </div>

        {/* Security */}
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-border bg-muted/10 flex items-center gap-2">
            <Lock className="w-5 h-5 text-secondary" />
            <h2 className="text-lg font-medium text-foreground">Security</h2>
          </div>
          <div className="p-6 space-y-4">
            <Dialog open={isPasswordModalOpen} onOpenChange={setIsPasswordModalOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left text-[#374151] border-[#D1D5DB] rounded-md h-10">
                  Change Password
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Change Password</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="current">Current Password</Label>
                    <Input 
                      id="current" 
                      type="password" 
                      value={currentPassword} 
                      onChange={e => setCurrentPassword(e.target.value)} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new">New Password</Label>
                    <Input 
                      id="new" 
                      type="password" 
                      value={newPassword} 
                      onChange={e => setNewPassword(e.target.value)} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm">Confirm New Password</Label>
                    <Input 
                      id="confirm" 
                      type="password" 
                      value={confirmPassword} 
                      onChange={e => setConfirmPassword(e.target.value)} 
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsPasswordModalOpen(false)} disabled={isSubmitting}>Cancel</Button>
                  <Button onClick={handleChangePassword} disabled={isSubmitting} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                    {isSubmitting ? "Updating..." : "Update Password"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Button 
              variant="outline" 
              className="w-full justify-start text-left text-[#374151] border-[#D1D5DB] rounded-md h-10"
              onClick={handleTwoFactorClick}
            >
              Two-Factor Authentication
            </Button>
          </div>
        </div>

        {/* System Settings */}
        <div className="bg-card border border-border rounded-xl shadow-sm md:col-span-2 overflow-hidden">
          <div className="px-6 py-4 border-b border-border bg-muted/10 flex items-center gap-2">
            <Settings className="w-5 h-5 text-muted-foreground" />
            <h2 className="text-lg font-medium text-foreground">System Settings</h2>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between p-4 border border-border rounded-md bg-muted/20">
              <div>
                <div className="font-medium text-foreground">Email Notifications</div>
                <div className="text-sm text-muted-foreground">Receive alerts for new loans and savings</div>
              </div>
              <input type="checkbox" defaultChecked className="w-5 h-5 accent-primary rounded border-input" />
            </div>
            <div className="flex items-center justify-between p-4 border border-border rounded-md bg-muted/20">
              <div>
                <div className="font-medium text-foreground">SMS Alerts</div>
                <div className="text-sm text-muted-foreground">Get text messages for important updates</div>
              </div>
              <input type="checkbox" className="w-5 h-5 accent-primary rounded border-input" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
