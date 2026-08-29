import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Search,
  Plus,
  Filter,
  Eye,
  CheckCircle2,
  AlertCircle,
  Phone,
  CreditCard,
  Building,
} from 'lucide-react';
import { membersApi, groupsApi } from '../../api';
import { Member, MemberStatus, VslaGroup } from '../../types';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input, Select } from '../../components/ui/FormControls';
import { Modal } from '../../components/ui/Modal';
import { Pagination } from '../../components/ui/Pagination';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState';

export const MembersPage: React.FC = () => {
  const navigate = useNavigate();

  const [members, setMembers] = useState<Member[]>([]);
  const [groups, setGroups] = useState<VslaGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<MemberStatus | ''>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalMembers, setTotalMembers] = useState(0);

  // Add Member Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    groupId: 1,
    memberNumber: '',
    firstName: '',
    lastName: '',
    phone: '',
    nationalId: '',
  });

  const fetchMembers = async () => {
    setIsLoading(true);
    try {
      const res = await membersApi.list({
        search: search || undefined,
        status: (statusFilter as MemberStatus) || undefined,
        page,
        limit: 10,
      });
      setMembers(res.data || []);
      if (res.meta) {
        setTotalPages(res.meta.totalPages);
        setTotalMembers(res.meta.total);
      }
    } catch (err) {
      console.error('Failed to fetch members:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [page, statusFilter]);

  // Load groups for the modal dropdown
  useEffect(() => {
    groupsApi.list({ limit: 50 }).then((res) => {
      if (res.data && res.data.length > 0) {
        setGroups(res.data);
        setFormData((prev) => ({ ...prev, groupId: res.data[0].id }));
      }
    }).catch(() => {});
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchMembers();
  };

  const handleCreateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    if (!formData.memberNumber || !formData.firstName || !formData.lastName) {
      setModalError('Please fill out all required fields.');
      return;
    }

    setIsSubmitting(true);
    try {
      await membersApi.create(formData);
      setIsAddModalOpen(false);
      setFormData({
        groupId: groups[0]?.id || 1,
        memberNumber: '',
        firstName: '',
        lastName: '',
        phone: '',
        nationalId: '',
      });
      setPage(1);
      fetchMembers();
    } catch (err: any) {
      setModalError(
        err.response?.data?.message || 'Failed to create member. Member number may already exist.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#0B1F3A]">Members Directory</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage Village Savings & Loan Association registered members and profiles
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsAddModalOpen(true)}
          leftIcon={<Plus size={16} />}
        >
          Add New Member
        </Button>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-2xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="flex-1 w-full flex gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, member number, or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0B1F3A]"
            />
          </div>
          <Button type="submit" variant="secondary" size="sm">
            Search
          </Button>
        </form>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <label className="text-xs font-semibold text-slate-600 whitespace-nowrap">Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as MemberStatus | '');
              setPage(1);
            }}
            className="text-xs bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0B1F3A]"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="EXITED">Exited</option>
          </select>
        </div>
      </div>

      {/* Members Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
        {isLoading ? (
          <LoadingSpinner message="Loading members directory..." />
        ) : members.length === 0 ? (
          <EmptyState
            title="No members found"
            description={
              search
                ? `No members matching "${search}". Try adjusting your filters.`
                : 'No members registered in this group yet.'
            }
            actionLabel="Add Member"
            onAction={() => setIsAddModalOpen(true)}
            icon={<Users size={24} />}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="table-header">
                  <tr>
                    <th className="px-4 py-3">Member #</th>
                    <th className="px-4 py-3">Full Name</th>
                    <th className="px-4 py-3">Phone</th>
                    <th className="px-4 py-3">Group</th>
                    <th className="px-4 py-3 text-center">Shares</th>
                    <th className="px-4 py-3 text-center">Loans</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {members.map((member) => (
                    <tr key={member.id} className="table-row">
                      <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">
                        {member.memberNumber}
                      </td>
                      <td className="px-4 py-3 font-medium text-[#0B1F3A]">
                        {member.firstName} {member.lastName}
                        {member.nationalId && (
                          <span className="text-[10px] text-slate-500 block font-normal">
                            ID: {member.nationalId}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                        {member.phone || '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                        {member.group?.code || 'Group #1'}
                      </td>
                      <td className="px-4 py-3 text-center text-slate-700 font-semibold">
                        {member._count?.shares || 0}
                      </td>
                      <td className="px-4 py-3 text-center text-slate-700 font-semibold">
                        {member._count?.loans || 0}
                      </td>
                      <td className="px-4 py-3">
                        <Badge status={member.status} size="sm" />
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/members/${member.id}`)}
                          leftIcon={<Eye size={14} />}
                        >
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Pagination
              currentPage={page}
              totalPages={totalPages}
              totalItems={totalMembers}
              itemsPerPage={10}
              onPageChange={setPage}
            />
          </>
        )}
      </div>

      {/* Add Member Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Register New VSLA Member"
        subtitle="Add a new member to the savings and loan association"
        maxWidth="md"
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAddModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleCreateMember}
              isLoading={isSubmitting}
            >
              Save Member
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateMember} className="space-y-3.5">
          {modalError && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-2.5 rounded text-xs flex items-center gap-2">
              <AlertCircle size={15} />
              <span>{modalError}</span>
            </div>
          )}

          {groups.length > 0 && (
            <Select
              label="VSLA Group"
              value={formData.groupId}
              onChange={(e) => setFormData({ ...formData, groupId: parseInt(e.target.value, 10) })}
              required
            >
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} ({g.code})
                </option>
              ))}
            </Select>
          )}

          <Input
            label="Member Number / ID Code"
            placeholder="e.g. MEM-009"
            value={formData.memberNumber}
            onChange={(e) => setFormData({ ...formData, memberNumber: e.target.value.toUpperCase() })}
            required
            helperText="Unique identifier within this savings group"
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="First Name"
              placeholder="Amara"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              required
            />
            <Input
              label="Last Name"
              placeholder="Diallo"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Phone Number"
              placeholder="+250780000000"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
            <Input
              label="National ID / Document"
              placeholder="ID-00000"
              value={formData.nationalId}
              onChange={(e) => setFormData({ ...formData, nationalId: e.target.value })}
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};
