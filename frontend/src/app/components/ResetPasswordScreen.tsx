import { useState } from "react";
import { Button } from "./ui/button";
import { Wallet, ArrowRight, ArrowLeft } from "lucide-react";
import api from "../../services/api";

export function ResetPasswordScreen({ token, onResetSuccess }: { token: string; onResetSuccess: () => void }) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    setLoading(true);

    try {
      const res = await api.post("/auth/reset-password", { token, newPassword });
      if (res.data.success) {
        setSuccessMessage(res.data.data.message || "Your password has been reset successfully.");
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to reset password. The link may have expired.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex w-full bg-background">
      {/* Left side - Brand panel */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-primary p-12 text-white relative overflow-hidden">
        <div className="z-10">
          <div className="flex items-center gap-3 mb-16">
            <Wallet className="w-10 h-10 text-[#D4A017]" />
            <span className="text-2xl font-bold tracking-tight text-white">KootaFlow</span>
          </div>
          <h1 className="text-5xl font-semibold leading-tight mb-6 text-white">
            Secure Access.<br />Protected Identity.
          </h1>
          <p className="text-lg text-[#E5F8F0] opacity-90 max-w-md font-light">
            Set your new secure password to restore access to your VSLA portal.
          </p>
        </div>
        
        <div className="z-10 text-sm text-[#E5F8F0] opacity-70">
          &copy; {new Date().getFullYear()} KootaFlow. All rights reserved.
        </div>
        
        {/* Subtle decorative background elements */}
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-[#156B46] rounded-full mix-blend-multiply filter blur-2xl opacity-50"></div>
        <div className="absolute top-1/4 -right-24 w-80 h-80 bg-[#0A3D24] rounded-full mix-blend-multiply filter blur-2xl opacity-50"></div>
      </div>

      {/* Right side - Reset password form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md space-y-8">
          
          <div className="lg:hidden flex items-center gap-3 justify-center mb-8">
            <Wallet className="w-10 h-10 text-primary" />
            <span className="text-2xl font-bold text-primary">KootaFlow</span>
          </div>

          <div>
            <h2 className="text-3xl font-semibold text-foreground tracking-tight">Reset Password</h2>
            <p className="mt-2 text-sm text-muted-foreground">Enter a new secure password for your account</p>
          </div>

          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-md text-sm">
              {error}
            </div>
          )}

          {successMessage ? (
            <div className="space-y-4">
              <div className="p-3 bg-primary/10 border border-primary/20 text-primary rounded-md text-sm">
                {successMessage}
              </div>
              <Button
                onClick={onResetSuccess}
                className="w-full h-11 rounded-md text-base font-medium flex items-center justify-center gap-2 mt-4"
              >
                Go to Sign in
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">New Password</label>
                <input
                  type="password"
                  required
                  className="w-full px-4 py-2.5 rounded-md border border-input bg-background text-foreground focus:ring-1 focus:ring-ring outline-none transition-colors"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Confirm New Password</label>
                <input
                  type="password"
                  required
                  className="w-full px-4 py-2.5 rounded-md border border-input bg-background text-foreground focus:ring-1 focus:ring-ring outline-none transition-colors"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 rounded-md text-base font-medium flex items-center justify-center gap-2 mt-4 transition-all"
              >
                {loading ? "Resetting..." : "Reset Password"}
                {!loading && <ArrowRight className="w-4 h-4" />}
              </Button>

              <div className="text-center mt-4">
                <button
                  type="button"
                  className="text-sm font-medium text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition-colors"
                  onClick={onResetSuccess}
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Sign in
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}
