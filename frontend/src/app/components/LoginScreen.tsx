import { useState } from "react";
import { Button } from "./ui/button";
import { Wallet, ArrowRight, ArrowLeft } from "lucide-react";
import api from "../../services/api";

export function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<"login" | "forgot">("login");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await api.post("/auth/login", { email, password });
      if (res.data.success) {
        localStorage.setItem("accessToken", res.data.data.accessToken);
        localStorage.setItem("refreshToken", res.data.data.refreshToken);
        localStorage.setItem("user", JSON.stringify(res.data.data.user));
        onLogin();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");
    setLoading(true);

    try {
      const res = await api.post("/auth/forgot-password", { email });
      if (res.data.success) {
        setSuccessMessage(res.data.data.message || "If an account exists for that email, a recovery link has been sent.");
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to request recovery link");
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
            Smart Savings.<br />Stronger Communities.
          </h1>
          <p className="text-lg text-[#E5F8F0] opacity-90 max-w-md font-light">
            Professional VSLA management system designed to track operations, loans, and savings with enterprise-level precision.
          </p>
        </div>
        
        <div className="z-10 text-sm text-[#E5F8F0] opacity-70">
          &copy; {new Date().getFullYear()} KootaFlow. All rights reserved.
        </div>
        
        {/* Subtle decorative background elements */}
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-[#156B46] rounded-full mix-blend-multiply filter blur-2xl opacity-50"></div>
        <div className="absolute top-1/4 -right-24 w-80 h-80 bg-[#0A3D24] rounded-full mix-blend-multiply filter blur-2xl opacity-50"></div>
      </div>

      {/* Right side - Login / Forgot Form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md space-y-8">
          
          <div className="lg:hidden flex items-center gap-3 justify-center mb-8">
            <Wallet className="w-10 h-10 text-primary" />
            <span className="text-2xl font-bold text-primary">KootaFlow</span>
          </div>

          {view === "login" ? (
            <>
              <div>
                <h2 className="text-3xl font-semibold text-foreground tracking-tight">Sign in</h2>
                <p className="mt-2 text-sm text-muted-foreground">Enter your credentials to access your account</p>
              </div>

              {error && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-md text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Email Address</label>
                  <input
                    type="email"
                    required
                    className="w-full px-4 py-2.5 rounded-md border border-input bg-background text-foreground focus:ring-1 focus:ring-ring outline-none transition-colors"
                    placeholder="admin@kootaflow.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-sm font-medium text-foreground">Password</label>
                    <button 
                      type="button" 
                      className="text-sm font-medium text-primary hover:underline"
                      onClick={() => {
                        setError("");
                        setSuccessMessage("");
                        setView("forgot");
                      }}
                    >
                      Forgot password?
                    </button>
                  </div>
                  <input
                    type="password"
                    required
                    className="w-full px-4 py-2.5 rounded-md border border-input bg-background text-foreground focus:ring-1 focus:ring-ring outline-none transition-colors"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 rounded-md text-base font-medium flex items-center justify-center gap-2 mt-4 transition-all"
                >
                  {loading ? "Signing in..." : "Sign in"}
                  {!loading && <ArrowRight className="w-4 h-4" />}
                </Button>
              </form>
            </>
          ) : (
            <>
              <div>
                <h2 className="text-3xl font-semibold text-foreground tracking-tight">Forgot Password</h2>
                <p className="mt-2 text-sm text-muted-foreground">Enter your email and we'll send you a recovery link</p>
              </div>

              {error && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-md text-sm">
                  {error}
                </div>
              )}

              {successMessage && (
                <div className="p-3 bg-primary/10 border border-primary/20 text-primary rounded-md text-sm">
                  {successMessage}
                </div>
              )}

              <form onSubmit={handleForgotPassword} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Email Address</label>
                  <input
                    type="email"
                    required
                    className="w-full px-4 py-2.5 rounded-md border border-input bg-background text-foreground focus:ring-1 focus:ring-ring outline-none transition-colors"
                    placeholder="admin@kootaflow.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading || !!successMessage}
                  className="w-full h-11 rounded-md text-base font-medium flex items-center justify-center gap-2 mt-4 transition-all"
                >
                  {loading ? "Sending..." : "Send Reset Link"}
                  {!loading && <ArrowRight className="w-4 h-4" />}
                </Button>

                <div className="text-center mt-4">
                  <button
                    type="button"
                    className="text-sm font-medium text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition-colors"
                    onClick={() => {
                      setError("");
                      setSuccessMessage("");
                      setView("login");
                    }}
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Sign in
                  </button>
                </div>
              </form>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
