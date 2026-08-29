import React, { useState, useEffect } from 'react';
import {
  PieChart,
  PlusCircle,
  Search,
  CheckCircle2,
  AlertCircle,
  Coins,
  ShieldAlert,
} from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';
import { sharesApi, membersApi, groupsApi } from '../../api';
import { Share, Member, VslaGroup, Cycle } from '../../types';
import { StatCard } from '../../components/ui/StatCard';
import { Button } from '../../components/ui/Button';
import { Input, Select } from '../../components/ui/FormControls';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Badge } from '../../components/ui/Badge';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState';

export const SharesPage: React.FC = () => {
  const { user, isMember, isTreasurer, isStaff } = useAuthStore();

  const [isLoading, setIsLoading] = useState(true);
  const [totalShares, setTotalShares] = useState(0);
  const [totalValue, setTotalValue] = useState(0);
  const [shareRecords, setShareRecords] = useState(0);

  // Group and Member State
  const [group, setGroup] = useState<VslaGroup | null>(null);
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [searchMember, setSearchMember] = useState('');

  // Member-only State
  const [myShares, setMyShares] = useState<Share[]>([]);
  const [myTotalShares, setMyTotalShares] = useState(0);
  const [myTotalValue, setMyTotalValue] = useState(0);

  // Purchase Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<number>(0);
  const [selectedCycleId, setSelectedCycleId] = useState<number>(0);
  const [quantity, setQuantity] = useState<number>(1);
  const [modalError, setModalError] = useState<string | null>(null);

  // Confirmation State
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchSharesData = async () => {
    setIsLoading(true);
    try {
      if (isMember() && user?.memberProfile?.id) {
        const memberId = user.memberProfile.id;
        const res = await sharesApi.getByMember(memberId);
        setMyShares(res.data?.shares || []);
        setMyTotalShares(res.data?.summary?.totalShares || 0);
        setMyTotalValue(res.data?.summary?.totalValue || 0);
      } else if (isStaff()) {
        const [summaryRes, membersRes, groupsRes] = await Promise.all([
          sharesApi.getSummary(),
          membersApi.list({ limit: 100 }),
          groupsApi.list({ limit: 1 }),
        ]);
        setTotalShares(summaryRes.data?.totalShares || 0);
        setTotalValue(summaryRes.data?.totalValue || 0);
        setShareRecords(summaryRes.data?.shareRecords || 0);
        setMembers(membersRes.data || []);

        if (groupsRes.data && groupsRes.data.length > 0) {
          const currentGroup = groupsRes.data[0];
          setGroup(currentGroup);
          const cyclesRes = await groupsApi.listCycles(currentGroup.id);
          const activeCycles = (cyclesRes.data || []).filter((c) => c.status === 'ACTIVE');
          setCycles(activeCycles);
          if (activeCycles.length > 0) {
            setSelectedCycleId(activeCycles[0].id);
          }
        }

        if (membersRes.data && membersRes.data.length > 0) {
          setSelectedMemberId(membersRes.data[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load shares data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSharesData();
  }, [user]);

  const formatCurrency = (val: number | string | undefined) => {
    return `${Number(val || 0).toLocaleString()} RWF`;
  };

  const sharePrice = Number(group?.sharePrice || 2000);
  const maxSharesPerMember = group?.maxSharesPerMember || 5;

  const openPurchaseModal = (memberId?: number) => {
    setIsModalOpen(true);
    setModalError(null);
    setQuantity(1);
    if (memberId) setSelectedMemberId(memberId);
    else if (members[0]) setSelectedMemberId(members[0].id);
  };

  const handleOpenConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    if (!selectedMemberId || !selectedCycleId || quantity < 1) {
      setModalError('Please select a member, cycle, and valid quantity of shares.');
      return;
    }

    const member = members.find((m) => m.id === selectedMemberId);
    const existingShares = (member?.shares || []).reduce((sum, s) => sum + s.quantity, 0);

    if (existingShares + quantity > maxSharesPerMember) {
      setModalError(
        `Share limit exceeded. Member currently has ${existingShares} share(s). Group maximum is ${maxSharesPerMember}. You can purchase at most ${Math.max(
          0,
          maxSharesPerMember - existingShares
        )} more share(s).`
      );
      return;
    }

    setIsConfirmOpen(true);
  };

  const handleExecutePurchase = async () => {
    setIsProcessing(true);
    try {
      await sharesApi.purchase({
        memberId: selectedMemberId,
        cycleId: selectedCycleId,
        quantity,
      });
      setIsConfirmOpen(false);
      setIsModalOpen(false);
      await fetchSharesData();
    } catch (err: any) {
      setModalError(err.response?.data?.message || 'Failed to purchase shares.');
      setIsConfirmOpen(false);
    } finally {
      setIsProcessing(false);
    }
  };

  const selectedMemberObj = members.find((m) => m.id === selectedMemberId);
  const totalCost = quantity * sharePrice;

  if (isLoading) {
    return <LoadingSpinner message="Loading shares registry..." />;
  }

  // ─────────────────────────────────────────────────────────────
  // 1. MEMBER PERSONAL SHARES VIEW
  // ─────────────────────────────────────────────────────────────
  if (isMember()) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-2xs">
          <h1 className="text-xl font-bold text-[#0B1F3A]">My Share Holdings</h1>
          <p className="text-xs text-slate-500 mt-1">
            Shares purchased in the current operational cycle and dividend rights
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            title="Total Shares Owned"
            value={`${myTotalShares} shares`}
            subtitle="Current cycle holdings"
            icon={<PieChart size={22} />}
            accent="navy"
          />
          <StatCard
            title="Total Shares Valuation"
            value={formatCurrency(myTotalValue)}
            subtitle="Original purchase value"
            icon={<Coins size={22} />}
            accent="emerald"
          />
          <StatCard
            title="Share-Out Multiplier"
            value="Eligible"
            subtitle="Proportional cycle earnings payout"
            icon={<CheckCircle2 size={22} className="text-emerald-600" />}
            accent="slate"
          />
        </div>

        {/* Purchase History */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200">
            <h3 className="text-sm font-semibold text-[#0B1F3A]">Share Purchase History</h3>
            <p className="text-xs text-slate-500">Record of your share purchases in this cycle</p>
          </div>

          {myShares.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500">
              You have not purchased any shares in this cycle yet.
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="table-header">
                <tr>
                  <th className="px-4 py-2.5">Date</th>
                  <th className="px-4 py-2.5">Cycle</th>
                  <th className="px-4 py-2.5">Shares</th>
                  <th className="px-4 py-2.5">Price Per Share</th>
                  <th className="px-4 py-2.5 text-right">Total Invested</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {myShares.map((s) => (
                  <tr key={s.id} className="table-row">
                    <td className="px-4 py-2.5 text-slate-600">
                      {new Date(s.purchaseDate).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2.5 text-slate-700">
                      Cycle #{s.cycle?.cycleNumber || 1}
                    </td>
                    <td className="px-4 py-2.5 font-bold text-slate-900">{s.quantity} shares</td>
                    <td className="px-4 py-2.5 text-slate-600">{formatCurrency(s.pricePerShare)}</td>
                    <td className="px-4 py-2.5 text-right font-bold text-[#0B1F3A]">
                      {formatCurrency(s.totalAmount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 2. OFFICER / TREASURER SHARES REGISTRY
  // ─────────────────────────────────────────────────────────────
  const filteredMembers = members.filter((m) => {
    if (!searchMember) return true;
    const q = searchMember.toLowerCase();
    return (
      m.firstName.toLowerCase().includes(q) ||
      m.lastName.toLowerCase().includes(q) ||
      m.memberNumber.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#0B1F3A]">Share Capital Registry</h1>
          <p className="text-xs text-slate-500 mt-1">
            Group shareholdings registry • Fixed Price:{' '}
            <span className="font-semibold text-slate-700">{formatCurrency(sharePrice)}</span> • Max:{' '}
            <span className="font-semibold text-slate-700">{maxSharesPerMember} shares/member</span>
          </p>
        </div>
        {isTreasurer() && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => openPurchaseModal()}
            leftIcon={<PlusCircle size={16} />}
          >
            Record Share Purchase
          </Button>
        )}
      </div>

      {/* KPI Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Total Shares Issued"
          value={`${totalShares} shares`}
          subtitle={`Across ${shareRecords} purchase transactions`}
          icon={<PieChart size={22} />}
          accent="navy"
        />
        <StatCard
          title="Total Share Capital Pool"
          value={formatCurrency(totalValue)}
          subtitle={`Base capital @ ${formatCurrency(sharePrice)}/share`}
          icon={<Coins size={22} />}
          accent="emerald"
        />
        <StatCard
          title="Active Operational Cycle"
          value={cycles[0] ? `Cycle #${cycles[0].cycleNumber}` : 'Cycle #1'}
          subtitle="Currently active for share purchases"
          icon={<CheckCircle2 size={22} className="text-emerald-600" />}
          accent="slate"
        />
      </div>

      {/* Members Shareholdings Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-3">
          <div>
            <h3 className="text-sm font-semibold text-[#0B1F3A]">Member Shareholdings</h3>
            <p className="text-xs text-slate-500">
              Shares allocated to each active member in Cycle #1
            </p>
          </div>
          <div className="w-full sm:w-64">
            <input
              type="text"
              placeholder="Search member..."
              value={searchMember}
              onChange={(e) => setSearchMember(e.target.value)}
              className="w-full pl-3 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0B1F3A]"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="table-header">
              <tr>
                <th className="px-4 py-3">Member #</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3 text-center">Shares Owned</th>
                <th className="px-4 py-3 text-center">Max Cap</th>
                <th className="px-4 py-3 text-right">Total Invested</th>
                {isTreasurer() && <th className="px-4 py-3 text-right">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMembers.map((m) => {
                const memberSharesCount = (m.shares || []).reduce((sum, s) => sum + s.quantity, 0);
                const memberSharesValue = memberSharesCount * sharePrice;
                const isMaxed = memberSharesCount >= maxSharesPerMember;

                return (
                  <tr key={m.id} className="table-row">
                    <td className="px-4 py-3 font-semibold text-slate-900">{m.memberNumber}</td>
                    <td className="px-4 py-3 font-medium text-[#0B1F3A]">
                      {m.firstName} {m.lastName}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{m.phone || '—'}</td>
                    <td className="px-4 py-3 text-center font-bold text-slate-900">
                      {memberSharesCount} shares
                    </td>
                    <td className="px-4 py-3 text-center text-slate-500">
                      {isMaxed ? (
                        <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-semibold">
                          Max Reached
                        </span>
                      ) : (
                        `${memberSharesCount}/${maxSharesPerMember}`
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-[#0B1F3A]">
                      {formatCurrency(memberSharesValue)}
                    </td>
                    {isTreasurer() && (
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openPurchaseModal(m.id)}
                          disabled={isMaxed}
                        >
                          + Purchase
                        </Button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Purchase Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Record Share Purchase"
        subtitle="Purchase shares on behalf of a registered VSLA member"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleOpenConfirm}>
              Review & Confirm
            </Button>
          </>
        }
      >
        <form onSubmit={handleOpenConfirm} className="space-y-3.5">
          {modalError && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-2.5 rounded text-xs flex items-center gap-2">
              <AlertCircle size={15} />
              <span>{modalError}</span>
            </div>
          )}

          <Select
            label="Select Member"
            value={selectedMemberId}
            onChange={(e) => setSelectedMemberId(parseInt(e.target.value, 10))}
            required
          >
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.memberNumber} — {m.firstName} {m.lastName}
              </option>
            ))}
          </Select>

          {cycles.length > 0 && (
            <Select
              label="Active Cycle"
              value={selectedCycleId}
              onChange={(e) => setSelectedCycleId(parseInt(e.target.value, 10))}
              required
            >
              {cycles.map((c) => (
                <option key={c.id} value={c.id}>
                  Cycle #{c.cycleNumber} (Active since {new Date(c.startDate).toLocaleDateString()})
                </option>
              ))}
            </Select>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Input
                label="Number of Shares"
                type="number"
                min="1"
                max={maxSharesPerMember}
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 1)}
                required
                helperText={`Max ${maxSharesPerMember} shares per member`}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Fixed Share Price
              </label>
              <div className="py-2 px-3 bg-slate-50 border border-slate-200 rounded text-sm font-semibold text-slate-800">
                {formatCurrency(sharePrice)}
              </div>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-md p-3 flex justify-between items-center text-xs">
            <span className="text-slate-600 font-medium">Total Cost:</span>
            <span className="text-base font-bold text-[#0B1F3A]">{formatCurrency(totalCost)}</span>
          </div>
        </form>
      </Modal>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleExecutePurchase}
        title="Confirm Share Purchase"
        message="Are you sure you want to record this share purchase? This will issue shares and record a payment transaction in the ledger."
        confirmLabel="Confirm Purchase"
        variant="primary"
        isLoading={isProcessing}
        details={[
          {
            label: 'Member',
            value: selectedMemberObj
              ? `${selectedMemberObj.memberNumber} - ${selectedMemberObj.firstName} ${selectedMemberObj.lastName}`
              : 'Unknown',
          },
          { label: 'Quantity', value: `${quantity} share(s)` },
          { label: 'Price per Share', value: formatCurrency(sharePrice) },
          { label: 'Total Payment', value: formatCurrency(totalCost) },
        ]}
      />
    </div>
  );
};
