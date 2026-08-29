import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  UserPlus,
  Search,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  User,
  Key,
} from 'lucide-react';
import { usersApi } from '../../api';
import { User as UserType, UserRole } from '../../types';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input, Select } from '../../components/ui/FormControls';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Pagination } from '../../components/ui/Pagination';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';

export const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<UserType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);

  // Create User Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phone: '',
    role: 'MEMBER' as UserRole,
  });

  // Deactivate confirmation
  const [deactivateTarget, setDeactivateTarget] = useState<UserType | null>(null);
  const [isDeactivating, setIsDeactivating] = useState(false);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const res = await usersApi.list({
        search: search || undefined,
        page,
        limit: 10,
      });
      setUsers(res.data || []);
      if (res.meta) {
        setTotalPages(res.meta.totalPages);
        setTotalUsers(res.meta.total);
      }
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    if (!formData.email || !formData.password || !formData.firstName || !formData.lastName) {
      setModalError('Please fill out all required fields.');
      return;
    }
    if (formData.password.length < 8) {
      setModalError('Password must be at least 8 characters long.');
      return;
    }

    setIsSubmitting(true);
    try {
      await usersApi.create(formData);
      setIsModalOpen(false);
      setFormData({
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        phone: '',
        role: 'MEMBER',
      });
      setPage(1);
      await fetchUsers();
    } catch (err: any) {
      setModalError(err.response?.data?.message || 'Failed to create user account.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDeactivate = async () => {
    if (!deactivateTarget) return;
    setIsDeactivating(true);
    try {
      await usersApi.deactivate(deactivateTarget.id);
      setDeactivateTarget(null);
      await fetchUsers();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to deactivate user.');
    } finally {
      setIsDeactivating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#0B1F3A]">User Management & Roles</h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage system access accounts, assign role permissions, and provision user access
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsModalOpen(true)}
          leftIcon={<UserPlus size={16} />}
        >
          Create User Account
        </Button>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-2xs">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search user by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0B1F3A]"
            />
          </div>
          <Button type="submit" variant="secondary" size="sm">
            Search
          </Button>
        </form>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
        {isLoading ? (
          <LoadingSpinner message="Loading user accounts..." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="table-header">
                  <tr>
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Email Address</th>
                    <th className="px-4 py-3">Phone</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((u) => (
                    <tr key={u.id} className="table-row">
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {u.firstName} {u.lastName}
                      </td>
                      <td className="px-4 py-3 text-slate-600 font-mono text-[11px]">{u.email}</td>
                      <td className="px-4 py-3 text-slate-600">{u.phone || '—'}</td>
                      <td className="px-4 py-3">
                        <Badge status={u.role} size="sm" />
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          status={u.isActive ? 'ACTIVE' : 'INACTIVE'}
                          variant={u.isActive ? 'success' : 'neutral'}
                          size="sm"
                        />
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        {u.isActive && u.role !== 'SUPER_ADMIN' && (
                          <button
                            onClick={() => setDeactivateTarget(u)}
                            className="text-xs text-red-600 hover:text-red-800 font-medium hover:underline"
                          >
                            Deactivate
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Pagination
              currentPage={page}
              totalPages={totalPages}
              totalItems={totalUsers}
              itemsPerPage={10}
              onPageChange={setPage}
            />
          </>
        )}
      </div>

      {/* Create User Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create New User Account"
        subtitle="Provision a login credential with specific role privileges"
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleCreateUser}
              isLoading={isSubmitting}
            >
              Create Account
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateUser} className="space-y-3.5">
          {modalError && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-2.5 rounded text-xs flex items-center gap-2">
              <AlertCircle size={15} />
              <span>{modalError}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="First Name"
              placeholder="e.g. Amara"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              required
            />
            <Input
              label="Last Name"
              placeholder="e.g. Diallo"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              required
            />
          </div>

          <Input
            label="Email Address"
            type="email"
            placeholder="user@kootaflow.test"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
          />

          <Input
            label="Initial Password"
            type="password"
            placeholder="Minimum 8 characters"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Phone Number"
              placeholder="+250780000000"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
            <Select
              label="Assigned System Role"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
              required
            >
              <option value="MEMBER">MEMBER</option>
              <option value="CHAIRPERSON">CHAIRPERSON</option>
              <option value="TREASURER">TREASURER</option>
              <option value="SECRETARY">SECRETARY</option>
              <option value="ADMIN">ADMIN</option>
              <option value="SUPER_ADMIN">SUPER_ADMIN</option>
            </Select>
          </div>
        </form>
      </Modal>

      {/* Deactivate Confirmation */}
      {deactivateTarget && (
        <ConfirmDialog
          isOpen={!!deactivateTarget}
          onClose={() => setDeactivateTarget(null)}
          onConfirm={handleConfirmDeactivate}
          title="Deactivate User Account"
          message={`Are you sure you want to deactivate ${deactivateTarget.firstName} ${deactivateTarget.lastName} (${deactivateTarget.email})? They will immediately lose login access.`}
          confirmLabel="Deactivate User"
          variant="danger"
          isLoading={isDeactivating}
        />
      )}
    </div>
  );
};
