import React, { useState } from 'react';
import { GuildState, Member, DEFAULT_JOB_CLASSES } from '../types';
import { 
  Users, 
  Plus, 
  UserPlus, 
  Trash2, 
  Coins, 
  ShieldAlert, 
  Calendar, 
  Check, 
  Key,
  Shield,
  ShieldCheck,
  RefreshCw,
  ToggleLeft,
  ToggleRight,
  Info,
  Edit2,
  Save,
  X
} from 'lucide-react';

interface MembersProps {
  state: GuildState;
  currentUser: Member | null;
  isAdmin: boolean;
  onUpdateState: (newState: GuildState) => void;
  showAlert?: (title: string, message: string) => void;
  showConfirm?: (title: string, message: string, onConfirm: () => void) => void;
}

export default function Members({ state, currentUser, isAdmin, onUpdateState, showAlert, showConfirm }: MembersProps) {
  const jobClasses = state.jobClasses && state.jobClasses.length > 0 ? state.jobClasses : DEFAULT_JOB_CLASSES;
  const [showAddForm, setShowAddForm] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<'admin' | 'member'>('member');
  const [newMemberJob, setNewMemberJob] = useState(jobClasses[0] || 'Lord Knight');
  const [tempPIN, setTempPIN] = useState(state.systemPIN);
  const [tempAdminPIN, setTempAdminPIN] = useState(state.adminPIN || 'ro-admin-5678');
  const [showPINSuccess, setShowPINSuccess] = useState(false);
  const [showAdminPINSuccess, setShowAdminPINSuccess] = useState(false);

  // Fallback safe triggers for sandboxed iframe
  const triggerAlert = (title: string, message: string) => {
    if (showAlert) {
      showAlert(title, message);
    } else {
      alert(`${title}: ${message}`);
    }
  };

  const triggerConfirm = (title: string, message: string, onConfirm: () => void) => {
    if (showConfirm) {
      showConfirm(title, message, onConfirm);
    } else {
      if (confirm(`${title}\n\n${message}`)) {
        onConfirm();
      }
    }
  };

  // Editing state for members
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState<'admin' | 'member'>('member');
  const [editJobClass, setEditJobClass] = useState(jobClasses[0] || 'Lord Knight');
  const [editWarsCount, setEditWarsCount] = useState(0);
  const [editHasReceived, setEditHasReceived] = useState(false);
  const [editJoinedAt, setEditJoinedAt] = useState('');

  // Helper to start editing a member
  const startEditing = (member: Member) => {
    setEditingMemberId(member.id);
    setEditName(member.name);
    setEditRole(member.role);
    setEditJobClass(member.jobClass || 'Lord Knight');
    setEditWarsCount(member.participatedWarsCount);
    setEditHasReceived(member.hasReceivedInCycle);
    setEditJoinedAt(member.joinedAt);
  };

  // Helper to save member edit
  const handleSaveEdit = (id: string) => {
    if (!editName.trim()) {
      triggerAlert('ผิดพลาด', 'ชื่อตัวละครไม่สามารถเป็นค่าว่างได้');
      return;
    }

    // Check duplicate name
    const exists = state.members.some(m => m.id !== id && m.name.toLowerCase() === editName.trim().toLowerCase());
    if (exists) {
      triggerAlert('ผิดพลาด', 'มีชื่อสมาชิกนี้อยู่ในกิลด์แล้ว');
      return;
    }

    const updatedMembers = state.members.map(m => {
      if (m.id === id) {
        return {
          ...m,
          name: editName.trim(),
          role: editRole,
          jobClass: editJobClass,
          participatedWarsCount: editWarsCount,
          hasReceivedInCycle: editHasReceived,
          joinedAt: editJoinedAt
        };
      }
      return m;
    });

    onUpdateState({
      ...state,
      members: updatedMembers
    });

    setEditingMemberId(null);
  };

  // 1. Add new guild member
  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim()) return;

    // Check if name already exists
    const exists = state.members.some(m => m.name.toLowerCase() === newMemberName.trim().toLowerCase());
    if (exists) {
      triggerAlert('ผิดพลาด', 'มีชื่อสมาชิกนี้อยู่ในกิลด์แล้ว');
      return;
    }

    const createdMember: Member = {
      id: `mem-${Date.now()}`,
      name: newMemberName.trim(),
      role: newMemberRole,
      participatedWarsCount: 0,
      hasReceivedInCycle: false,
      joinedAt: new Date().toISOString().split('T')[0],
      jobClass: newMemberJob
    };

    onUpdateState({
      ...state,
      members: [...state.members, createdMember]
    });

    setNewMemberName('');
    setShowAddForm(false);
  };

  // 2. Delete member
  const handleDeleteMember = (id: string) => {
    if (id === currentUser?.id) {
      triggerAlert('ปฏิเสธการเข้าถึง', 'คุณไม่สามารถลบตัวเองออกจากระบบได้ขณะล็อกอินอยู่');
      return;
    }

    triggerConfirm(
      'ยืนยันการนำสมาชิกออก',
      'คุณแน่ใจหรือไม่ว่าต้องการนำสมาชิกท่านนี้ออกจากระบบกิลด์? สถิติเดิมทั้งหมดจะสูญหาย',
      () => {
        onUpdateState({
          ...state,
          members: state.members.filter(m => m.id !== id)
        });
      }
    );
  };

  // 3. Toggle received item status
  const handleToggleReceivedStatus = (memberId: string) => {
    if (!isAdmin) return;
    const updatedMembers = state.members.map(m => {
      if (m.id === memberId) {
        return { ...m, hasReceivedInCycle: !m.hasReceivedInCycle };
      }
      return m;
    });

    onUpdateState({
      ...state,
      members: updatedMembers
    });
  };

  // 4. Reset entire rotation cycle
  const handleResetCycle = () => {
    if (!isAdmin) return;
    triggerConfirm(
      'ยืนยันการรีเซ็ตสิทธิ์',
      'คุณแน่ใจหรือไม่ว่าต้องการรีเซ็ตสิทธิ์การรับไอเทมของสมาชิกทุกคนกลับมา "ยังมีสิทธิ์" ทั้งหมด เพื่อเริ่มต้นรอบใหม่?',
      () => {
        onUpdateState({
          ...state,
          currentCycle: (state.currentCycle || 1) + 1,
          members: state.members.map(m => ({
            ...m,
            hasReceivedInCycle: false
          }))
        });
      }
    );
  };

  // 5. Update Guild security PIN
  const handleUpdatePIN = () => {
    if (!tempPIN.trim()) {
      triggerAlert('ผิดพลาด', 'รหัสผ่าน PIN ไม่สามารถเป็นค่าว่างได้');
      return;
    }

    onUpdateState({
      ...state,
      systemPIN: tempPIN.trim()
    });

    setShowPINSuccess(true);
    setTimeout(() => setShowPINSuccess(false), 3000);
  };

  // Update Guild admin security PIN
  const handleUpdateAdminPIN = () => {
    if (!tempAdminPIN.trim()) {
      triggerAlert('ผิดพลาด', 'รหัสผ่าน Admin PIN ไม่สามารถเป็นค่าว่างได้');
      return;
    }

    onUpdateState({
      ...state,
      adminPIN: tempAdminPIN.trim()
    });

    setShowAdminPINSuccess(true);
    setTimeout(() => setShowAdminPINSuccess(false), 3000);
  };

  return (
    <div className="space-y-6" id="members-tab">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-100 flex items-center gap-2">
            <Users className="text-blue-400 w-6 h-6" />
            ทำเนียบและคิวรับไอเทมกิลด์ (Ragnarok Classic Guild Registry)
          </h2>
          <p className="text-xs text-slate-400">
            รายชื่อสมาชิก และลำดับสิทธิ์ในการประมูลไอเทมดรอปจากกิจกรรมกิลด์วอร์แบบแชร์เท่าเทียม
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {isAdmin && (
            <>
              <button
                onClick={handleResetCycle}
                className="flex items-center gap-1.5 bg-red-950/40 hover:bg-red-900/30 text-red-400 border border-red-500/20 px-3 py-2 rounded-xl transition-all font-bold text-xs"
                id="reset-cycle-btn"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                รีเซ็ตวัฏจักรเริ่มรอบใหม่
              </button>
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl transition-all font-bold text-xs shadow-[0_0_15px_rgba(59,130,246,0.3)]"
                id="toggle-add-member-btn"
              >
                <UserPlus className="w-3.5 h-3.5" />
                {showAddForm ? 'ซ่อนฟอร์ม' : 'เพิ่มรายชื่อสมาชิกกิลด์'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Info Warning */}
      <div className="bg-blue-950/20 border border-blue-500/20 rounded-2xl p-4 flex gap-3 text-xs leading-relaxed text-blue-300">
        <Info className="w-5 h-5 shrink-0 text-blue-400" />
        <div>
          <p className="font-bold">💡 คำแนะนำเกี่ยวกับกฎความโปร่งใส (Fair Play Rules):</p>
          <p className="mt-0.5">ในรอบกิจกรรมเมื่อจัดสรรไอเทมให้สมาชิกแล้ว สมาชิกคนดังกล่าวจะถูกตั้งสถานะว่า <span className="text-yellow-400 font-bold">"ได้รับไอเทมแล้ว (หมดสิทธิ์ประมูล)"</span> ทันที เพื่อเก็บสิทธิ์ที่เหลือไว้ให้ผู้เล่นคนอื่นที่ยังไม่ได้ของ เมื่อทุกคนในกิลด์ได้รับครบ 1 รอบแล้ว หัวหน้ากิลด์จึงค่อยกด <span className="text-blue-400 font-bold">"รีเซ็ตวัฏจักรเริ่มรอบใหม่"</span> เพื่อเปิดให้ประมูลได้ทุกคนอีกครั้ง</p>
        </div>
      </div>

      {/* Admin Quick PIN Settings */}
      {isAdmin && (
        <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-4 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div className="space-y-1">
              <h3 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Key className="w-4 h-4 text-blue-400" />
                รหัสผ่านสำหรับ Member ปกติ (Member Access PIN)
              </h3>
              <p className="text-[10px] text-slate-500">
                สมาชิกใหม่จำเป็นต้องกรอกรหัสผ่านนี้เพื่อยืนยันการลงทะเบียนหรือล็อกอินเพื่อดูข้อมูลทั่วไป
              </p>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <input
                type="text"
                value={tempPIN}
                onChange={e => setTempPIN(e.target.value)}
                className="bg-slate-950 text-slate-200 px-3 py-2 rounded-xl border border-slate-800 focus:outline-none focus:border-blue-500 font-mono text-xs w-full sm:w-44 text-center font-bold"
              />
              <button
                onClick={handleUpdatePIN}
                className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1 shrink-0 transition-all active:scale-95 animate-pulse-once"
                id="update-pin-btn"
              >
                {showPINSuccess ? <Check className="w-3.5 h-3.5" /> : 'บันทึก Member PIN'}
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-amber-500" />
                รหัสผ่านสำหรับผู้ดูแลระบบ (Admin Access PIN)
              </h3>
              <p className="text-[10px] text-slate-500">
                แอดมินจำเป็นต้องกรอกรหัสผ่านนี้เพื่อเข้าสู่ระบบในฐานะ Admin และจัดการกิจกรรมประมูลกิลด์
              </p>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <input
                type="text"
                value={tempAdminPIN}
                onChange={e => setTempAdminPIN(e.target.value)}
                className="bg-slate-950 text-slate-200 px-3 py-2 rounded-xl border border-slate-800 focus:outline-none focus:border-amber-500 font-mono text-xs w-full sm:w-44 text-center font-bold"
              />
              <button
                onClick={handleUpdateAdminPIN}
                className="bg-amber-600 hover:bg-amber-500 text-slate-950 px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1 shrink-0 transition-all active:scale-95"
                id="update-admin-pin-btn"
              >
                {showAdminPINSuccess ? <Check className="w-3.5 h-3.5" /> : 'บันทึก Admin PIN'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Member Form */}
      {showAddForm && (
        <form onSubmit={handleAddMember} className="bg-slate-900 border border-blue-500/20 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-12 gap-4 animate-fade-in">
          <div className="sm:col-span-5">
            <label className="text-xs font-bold text-slate-400 block mb-1">ชื่อตัวละครในกิลด์ (ตรงตามในเกม)</label>
            <input
              type="text"
              required
              placeholder="เช่น เทพซ่า999"
              value={newMemberName}
              onChange={e => setNewMemberName(e.target.value)}
              className="w-full bg-slate-950 text-slate-200 px-3 py-2 rounded-xl border border-slate-800 focus:outline-none focus:border-blue-500 text-xs"
            />
          </div>
          <div className="sm:col-span-3">
            <label className="text-xs font-bold text-slate-400 block mb-1">อาชีพ (Class)</label>
            <select
              value={newMemberJob}
              onChange={e => setNewMemberJob(e.target.value)}
              className="w-full bg-slate-950 text-slate-200 px-3 py-2 rounded-xl border border-slate-800 focus:outline-none focus:border-blue-500 text-xs font-semibold"
            >
              {jobClasses.map(jc => (
                <option key={jc} value={jc}>{jc}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-bold text-slate-400 block mb-1">สิทธิ์ระบบจัดการ</label>
            <select
              value={newMemberRole}
              onChange={e => setNewMemberRole(e.target.value as any)}
              className="w-full bg-slate-950 text-slate-200 px-3 py-2 rounded-xl border border-slate-800 focus:outline-none focus:border-blue-500 text-xs"
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="sm:col-span-2 flex items-end">
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-extrabold py-2 rounded-xl text-xs transition-colors"
            >
              ยืนยันการเพิ่ม
            </button>
          </div>
        </form>
      )}

      {/* Members Registry Table */}
      <div className="bg-slate-900 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950 text-slate-400 text-xs font-bold border-b border-slate-850">
                <th className="p-4">ชื่อตัวละครในกิลด์</th>
                <th className="p-4">อาชีพ (Class)</th>
                <th className="p-4">ตำแหน่ง / สิทธิ์จัดการ</th>
                <th className="p-4">จำนวนครั้งที่เข้าวอร์</th>
                <th className="p-4">สถานะสิทธิ์การประมูลรอบนี้</th>
                <th className="p-4">วันที่เข้าร่วมกิลด์</th>
                {isAdmin && <th className="p-4 text-center">การจัดการ</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850 text-xs sm:text-sm">
              {state.members.map(member => {
                const isEditing = editingMemberId === member.id;

                return (
                  <tr key={member.id} className="hover:bg-slate-850/20 transition-colors">
                    {/* Character Name */}
                    <td className="p-4">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          className="bg-slate-950 text-slate-200 px-2.5 py-1.5 rounded border border-slate-800 text-xs font-bold w-full max-w-[150px] focus:outline-none focus:border-blue-500"
                        />
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center font-bold text-blue-400">
                            {member.name.charAt(0)}
                          </div>
                          <div>
                            <span className="font-bold text-slate-200">{member.name}</span>
                            {member.id === currentUser?.id && (
                              <span className="ml-1.5 bg-blue-500/10 text-blue-400 text-[9px] font-bold px-1.5 py-0.2 border border-blue-500/20 rounded">
                                ตัวคุณ
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </td>

                    {/* Job Class */}
                    <td className="p-4 font-semibold text-slate-300">
                      {isEditing ? (
                        <select
                          value={editJobClass}
                          onChange={e => setEditJobClass(e.target.value)}
                          className="bg-slate-950 text-slate-200 px-2 py-1.5 rounded border border-slate-800 text-xs font-bold focus:outline-none focus:border-blue-500"
                        >
                          {jobClasses.map(jc => (
                            <option key={jc} value={jc}>{jc}</option>
                          ))}
                        </select>
                      ) : (
                        member.jobClass || 'Lord Knight'
                      )}
                    </td>

                    {/* Role */}
                    <td className="p-4">
                      {isEditing ? (
                        <select
                          value={editRole}
                          onChange={e => setEditRole(e.target.value as any)}
                          className="bg-slate-950 text-slate-200 px-2 py-1.5 rounded border border-slate-800 text-xs font-bold focus:outline-none focus:border-blue-500"
                        >
                          <option value="member">Member</option>
                          <option value="admin">Admin</option>
                        </select>
                      ) : (
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold inline-flex items-center gap-1 ${
                          member.role === 'admin' ? 'bg-blue-950 text-blue-400 border border-blue-500/20' : 'bg-slate-950 text-slate-400 border border-slate-800'
                        }`}>
                          {member.role === 'admin' ? (
                            <>
                              <ShieldCheck className="w-3 h-3 text-blue-400" />
                              <span>Admin</span>
                            </>
                          ) : (
                            <span>Member</span>
                          )}
                        </span>
                      )}
                    </td>

                    {/* Wars Count */}
                    <td className="p-4 font-mono font-bold text-slate-300">
                      {isEditing ? (
                        <input
                          type="number"
                          min="0"
                          value={editWarsCount}
                          onChange={e => setEditWarsCount(parseInt(e.target.value) || 0)}
                          className="bg-slate-950 text-slate-200 px-2 py-1 rounded border border-slate-800 text-xs font-bold w-16 text-center focus:outline-none focus:border-blue-500 font-mono"
                        />
                      ) : (
                        `${member.participatedWarsCount} ครั้ง`
                      )}
                    </td>

                    {/* Received item status */}
                    <td className="p-4">
                      {isEditing ? (
                        <select
                          value={editHasReceived ? 'true' : 'false'}
                          onChange={e => setEditHasReceived(e.target.value === 'true')}
                          className="bg-slate-950 text-slate-200 px-2 py-1.5 rounded border border-slate-800 text-xs font-bold focus:outline-none focus:border-blue-500"
                        >
                          <option value="false">🟢 ยังมีสิทธิ์ประมูล</option>
                          <option value="true">🔴 ได้รับไอเทมแล้ว</option>
                        </select>
                      ) : isAdmin ? (
                        <button
                          onClick={() => handleToggleReceivedStatus(member.id)}
                          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border font-bold text-xs transition-all ${
                            member.hasReceivedInCycle 
                              ? 'bg-red-950/40 text-red-400 border-red-500/20 hover:bg-red-900/10'
                              : 'bg-emerald-950/40 text-emerald-400 border-emerald-500/20 hover:bg-emerald-900/10'
                          }`}
                          title="คลิกเพื่อสลับสิทธิ์การรับไอเทมด้วยตนเอง"
                        >
                          <span className={`w-2 h-2 rounded-full ${member.hasReceivedInCycle ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`}></span>
                          <span>{member.hasReceivedInCycle ? '🔴 ได้รับไอเทมแล้ว' : '🟢 ยังมีสิทธิ์ประมูล'}</span>
                        </button>
                      ) : (
                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold ${
                          member.hasReceivedInCycle 
                            ? 'bg-red-950/20 text-red-400 border border-red-900/20' 
                            : 'bg-emerald-950/20 text-emerald-400 border border-emerald-900/20'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${member.hasReceivedInCycle ? 'bg-red-500' : 'bg-emerald-500'}`}></span>
                          <span>{member.hasReceivedInCycle ? 'ได้รับไอเทมแล้ว' : 'ยังมีสิทธิ์ประมูล'}</span>
                        </div>
                      )}
                    </td>

                    {/* Joined date */}
                    <td className="p-4 text-slate-400 text-xs">
                      {isEditing ? (
                        <input
                          type="date"
                          value={editJoinedAt}
                          onChange={e => setEditJoinedAt(e.target.value)}
                          className="bg-slate-950 text-slate-200 px-2 py-1 rounded border border-slate-800 text-xs font-bold focus:outline-none focus:border-blue-500 font-mono text-center"
                        />
                      ) : (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-500" />
                          <span>{member.joinedAt}</span>
                        </div>
                      )}
                    </td>

                    {/* Admin Actions column */}
                    {isAdmin && (
                      <td className="p-4 text-center">
                        {isEditing ? (
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleSaveEdit(member.id)}
                              className="p-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors shadow-md"
                              title="บันทึก"
                            >
                              <Save className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingMemberId(null)}
                              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
                              title="ยกเลิก"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => startEditing(member)}
                              className="p-1.5 bg-blue-950/40 hover:bg-blue-900/30 text-blue-400 rounded-lg border border-blue-500/10 transition-all hover:scale-105"
                              title="แก้ไขข้อมูลสมาชิก"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteMember(member.id)}
                              className="p-1.5 bg-red-950/40 hover:bg-red-900/30 text-red-400 rounded-lg border border-red-500/10 transition-all hover:scale-105"
                              title="ลบสมาชิกกิลด์"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
