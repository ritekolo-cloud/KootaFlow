import React, { useState } from 'react';
import {
  User,
  Shield,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Building,
  Lock,
} from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';
import { authApi } from '../../api';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/FormControls';
import { Badge } from '../../components/ui/Badge';

export const SettingsPage: React.FC = () => {
  const { user } = useAuthStore();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('Please fill out all password fields.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long.');
      return;
    }

    setIsChangingPassword(true);
    try {
      await authApi.changePassword({ currentPassword, newPassword });
      setPasswordSuccess('Password updated successfully! Other active sessions were revoked.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordError(err.response?.data?.message || 'Failed to update password.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-2xs">
        <h1 className="text-xl font-bold text-[#0B1F3A]">Account & Security Settings</h1>
        <p className="text-xs text-slate-500 mt-1">
          Manage your personal profile, credentials, and VSLA system preferences
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profile Card */}
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <User size={18} className="text-[#0B1F3A]" />
            <h3 className="text-sm font-semibold text-[#0B1F3A]">Profile Details</h3>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-slate-500 block">Full Name</span>
              <p className="font-semibold text-slate-900 mt-0.5">
                {user?.firstName} {user?.lastName}
              </p>
            </div>

            <div>
              <span className="text-slate-500 block">Email Address</span>
              <p className="font-mono text-slate-700 mt-0.5">{user?.email}</p>
            </div>

            <div>
              <span className="text-slate-500 block">Phone Number</span>
              <p className="text-slate-700 mt-0.5">{user?.phone || 'Not provided'}</p>
            </div>

            <div>
              <span className="text-slate-500 block">Assigned Role</span>
              <div className="mt-1">
                <Badge status={user?.role} size="sm" />
              </div>
            </div>
          </div>
        </div>

        {/* Change Password Card */}
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Lock size={18} className="text-[#0B1F3A]" />
            <h3 className="text-sm font-semibold text-[#0B1F3A]">Change Password</h3>
          </div>

          {passwordSuccess && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-2.5 rounded text-xs flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              <span>{passwordSuccess}</span>
            </div>
          )}

          {passwordError && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-2.5 rounded text-xs flex items-center gap-2">
              <AlertCircle size={16} className="text-red-600 shrink-0" />
              <span>{passwordError}</span>
            </div>
          )}

          <form onSubmit={handlePasswordSubmit} className="space-y-3">
            <Input
              label="Current Password"
              type="password"
              placeholder="••••••••"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />

            <Input
              label="New Password"
              type="password"
              placeholder="Min 8 chars, 1 uppercase, 1 number"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />

            <Input
              label="Confirm New Password"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />

            <Button
              type="submit"
              variant="primary"
              size="sm"
              className="w-full mt-2"
              isLoading={isChangingPassword}
              leftIcon={<KeyRound size={15} />}
            >
              Update Password
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};
