import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Shield, Lock, Mail, ArrowRight, Eye, EyeOff, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/FormControls';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isLoading, error, clearError } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const from = (location.state as any)?.from?.pathname || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    if (!email || !password) {
      setLocalError('Please enter both email and password.');
      return;
    }

    try {
      await login({ email, password });
      navigate(from, { replace: true });
    } catch (err: any) {
      // error is handled in store
    }
  };

  const handleDemoFill = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('Admin@123456');
    setLocalError(null);
    clearError();
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Brand Logo & Wordmark */}
        <div className="flex justify-center items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#0B1F3A] text-white flex items-center justify-center font-bold text-xl shadow-md">
            K
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#0B1F3A] leading-none">
              KootaFlow
            </h1>
            <p className="text-xs text-slate-500 font-medium tracking-wide uppercase mt-1">
              VSLA Management System
            </p>
          </div>
        </div>

        <h2 className="mt-6 text-center text-lg font-semibold text-slate-900">
          Sign in to your account
        </h2>
        <p className="text-center text-xs text-slate-500 mt-1">
          Village Savings & Loan Association Management Platform
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm rounded-lg border border-slate-200 sm:px-10">
          {(error || localError) && (
            <div className="mb-5 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-xs flex items-start gap-2.5">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{error || localError}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <Input
              label="Email Address"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              leftAddon={<Mail size={16} />}
            />

            <div>
              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                leftAddon={<Lock size={16} />}
                rightAddon={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-slate-400 hover:text-slate-600 focus:outline-none"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                }
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full mt-2"
              isLoading={isLoading}
              rightIcon={<ArrowRight size={16} />}
            >
              Sign In
            </Button>
          </form>

          {/* Demo Accounts Quick Picker */}
          <div className="mt-6 pt-5 border-t border-slate-200">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-center mb-3">
              Quick Demo Accounts
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleDemoFill('admin@kootaflow.com')}
                className="p-2 rounded border border-slate-200 bg-slate-50 hover:bg-slate-100 text-left transition-colors"
              >
                <div className="font-semibold text-[#0B1F3A]">Super Admin</div>
                <div className="text-[10px] text-slate-500 truncate">admin@kootaflow.com</div>
              </button>
              <button
                type="button"
                onClick={() => handleDemoFill('chairperson@kootaflow.test')}
                className="p-2 rounded border border-slate-200 bg-slate-50 hover:bg-slate-100 text-left transition-colors"
              >
                <div className="font-semibold text-[#0B1F3A]">Chairperson</div>
                <div className="text-[10px] text-slate-500 truncate">Amara Diallo</div>
              </button>
              <button
                type="button"
                onClick={() => handleDemoFill('treasurer@kootaflow.test')}
                className="p-2 rounded border border-slate-200 bg-slate-50 hover:bg-slate-100 text-left transition-colors"
              >
                <div className="font-semibold text-[#0B1F3A]">Treasurer</div>
                <div className="text-[10px] text-slate-500 truncate">Kofi Mensah</div>
              </button>
              <button
                type="button"
                onClick={() => handleDemoFill('jabari.test@kootaflow.test')}
                className="p-2 rounded border border-slate-200 bg-slate-50 hover:bg-slate-100 text-left transition-colors"
              >
                <div className="font-semibold text-[#0B1F3A]">Member</div>
                <div className="text-[10px] text-slate-500 truncate">Jabari Okafor</div>
              </button>
            </div>
            <p className="text-[10px] text-slate-400 text-center mt-2.5">
              Default password: <span className="font-mono text-slate-600">Admin@123456</span>
            </p>
          </div>
        </div>

        <div className="text-center mt-6 text-xs text-slate-400">
          KootaFlow VSLA System &copy; {new Date().getFullYear()}
        </div>
      </div>
    </div>
  );
};
