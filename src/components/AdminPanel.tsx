/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  ShieldAlert, 
  Users, 
  Settings, 
  Layers, 
  Check, 
  X, 
  TrendingUp, 
  UserMinus, 
  Loader2, 
  Save, 
  Plus, 
  Trash2,
  Lock,
  ExternalLink
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useLanguage } from '../lib/LanguageContext';

interface AdminPanelProps {
  onBackToHome: () => void;
}

export default function AdminPanel({ onBackToHome }: AdminPanelProps) {
  const { t } = useLanguage();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'meta' | 'lineups' | 'users'>('meta');
  
  // Notification states
  const [notification, setNotification] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  
  // ─── Data States ─────────────────────────────────────────────────────────────
  const [agentMeta, setAgentMeta] = useState<any>(null);
  const [pendingLineups, setPendingLineups] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);

  // Form states for Meta Manager (editing agents)
  const [editingAgentName, setEditingAgentName] = useState<string>('');
  const [editWinRates, setEditWinRates] = useState<{ [key: string]: number }>({});
  
  // Check authorization on mount
  useEffect(() => {
    async function checkAuth() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session || !session.user) {
          setIsAdmin(false);
          setLoading(false);
          return;
        }

        const user = session.user;
        
        // Verify from database
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        const role = profile?.role || (user.email?.includes('admin') ? 'ADMIN' : 'USER');
        if (role === 'ADMIN' || role === 'SUPERADMIN') {
          setIsAdmin(true);
          // Pre-fetch all admin data
          fetchAdminData(session.access_token);
        } else {
          setIsAdmin(false);
          setLoading(false);
        }
      } catch (err) {
        setIsAdmin(false);
        setLoading(false);
      }
    }
    checkAuth();
  }, []);

  // Enable live realtime data syncing with Supabase WebSockets
  useEffect(() => {
    if (!isAdmin) return;

    // 1. Subscribe to public profiles changes (updates users directory instantly)
    const profilesChannel = supabase
      .channel('admin-profiles-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        (payload: any) => {
          if (payload.eventType === 'INSERT') {
            const newUser = {
              id: payload.new.id,
              username: payload.new.username || 'Agent',
              email: payload.new.email || 'N/A',
              role: payload.new.role || 'USER',
              status: payload.new.status || 'ACTIVE'
            };
            setUsersList(prev => {
              if (prev.some(u => u.id === newUser.id)) return prev;
              return [...prev, newUser];
            });
          } else if (payload.eventType === 'UPDATE') {
            setUsersList(prev => prev.map(u => u.id === payload.new.id ? { 
              ...u, 
              username: payload.new.username || u.username,
              email: payload.new.email || u.email,
              role: payload.new.role || u.role,
              status: payload.new.status || u.status
            } : u));
          } else if (payload.eventType === 'DELETE') {
            setUsersList(prev => prev.filter(u => u.id === payload.old.id));
          }
        }
      )
      .subscribe();

    // 2. Subscribe to public lineups changes (updates pending lineup lists instantly)
    const lineupsChannel = supabase
      .channel('admin-lineups-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'lineups' },
        (payload: any) => {
          if (payload.eventType === 'INSERT' && payload.new.status === 'PENDING') {
            const newL = {
              id: payload.new.id,
              username: payload.new.username,
              mapName: payload.new.map_name,
              title: payload.new.title,
              mediaUrl: payload.new.media_url,
              createdAt: payload.new.created_at
            };
            setPendingLineups(prev => {
              if (prev.some(l => l.id === newL.id)) return prev;
              return [...prev, newL];
            });
          } else if (payload.eventType === 'UPDATE') {
            if (payload.new.status !== 'PENDING') {
              setPendingLineups(prev => prev.filter(l => l.id !== payload.new.id));
            } else {
              setPendingLineups(prev => prev.map(l => l.id === payload.new.id ? {
                ...l,
                username: payload.new.username || l.username,
                mapName: payload.new.map_name || l.mapName,
                title: payload.new.title || l.title,
                mediaUrl: payload.new.media_url || l.mediaUrl,
                createdAt: payload.new.created_at || l.createdAt
              } : l));
            }
          } else if (payload.eventType === 'DELETE') {
            setPendingLineups(prev => prev.filter(l => l.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(profilesChannel);
      supabase.removeChannel(lineupsChannel);
    };
  }, [isAdmin]);

  const fetchAdminData = async (token: string) => {
    setLoading(true);
    try {
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      // 1. Fetch Agent Meta
      const metaRes = await fetch('/api/admin/meta', { headers });
      if (metaRes.ok) {
        const metaJson = await metaRes.json();
        setAgentMeta(metaJson);
        if (Object.keys(metaJson.agents || {}).length > 0) {
          selectAgentForEdit(Object.keys(metaJson.agents)[0], metaJson.agents);
        }
      }

      // 2. Fetch Pending Lineups
      const lineupsRes = await fetch('/api/admin/lineups', { headers });
      if (lineupsRes.ok) {
        setPendingLineups(await lineupsRes.json());
      }

      // 3. Fetch Users
      const usersRes = await fetch('/api/admin/users', { headers });
      if (usersRes.ok) {
        setUsersList(await usersRes.json());
      }
    } catch (err) {
      console.error('Failed to load admin panel data:', err);
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (msg: string, type: 'success' | 'error' = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const selectAgentForEdit = (name: string, currentAgents = agentMeta?.agents) => {
    if (!currentAgents) return;
    setEditingAgentName(name);
    setEditWinRates(currentAgents[name]?.baseWinRates || {});
  };

  // ─── Actions: Meta Manager ──────────────────────────────────────────────────

  const handleUpdateWinRate = (map: string, val: number) => {
    setEditWinRates(prev => ({
      ...prev,
      [map]: parseFloat(Math.min(100, Math.max(0, val)).toFixed(1))
    }));
  };

  const handleSaveMeta = async () => {
    if (!agentMeta) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    // Create copies and apply updates
    const updatedAgents = { ...agentMeta.agents };
    if (updatedAgents[editingAgentName]) {
      updatedAgents[editingAgentName] = {
        ...updatedAgents[editingAgentName],
        baseWinRates: editWinRates
      };
    }

    const payload = {
      ...agentMeta,
      agents: updatedAgents
    };

    try {
      const res = await fetch('/api/admin/meta', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setAgentMeta(payload);
        showNotification('Agent win rates saved successfully!');
      } else {
        throw new Error();
      }
    } catch (_) {
      showNotification('Failed to update agent win rates.', 'error');
    }
  };

  // ─── Actions: Lineup Moderator ──────────────────────────────────────────────

  const handleApproveLineup = async (id: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    try {
      const res = await fetch(`/api/admin/lineups/${id}/approve`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      if (res.ok) {
        setPendingLineups(prev => prev.filter(l => l.id !== id));
        showNotification('Lineup submission approved!');
      } else throw new Error();
    } catch (_) {
      showNotification('Failed to approve lineup.', 'error');
    }
  };

  const handleRejectLineup = async (id: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    try {
      const res = await fetch(`/api/admin/lineups/${id}/reject`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      if (res.ok) {
        setPendingLineups(prev => prev.filter(l => l.id !== id));
        showNotification('Lineup submission rejected.');
      } else throw new Error();
    } catch (_) {
      showNotification('Failed to reject lineup.', 'error');
    }
  };

  // ─── Actions: Users Management ─────────────────────────────────────────────

  const handleChangeRole = async (userId: string, newRole: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    try {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ role: newRole })
      });
      if (res.ok) {
        setUsersList(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
        showNotification(`User role updated to ${newRole}`);
      } else throw new Error();
    } catch (_) {
      showNotification('Failed to update role.', 'error');
    }
  };

  const handleToggleBan = async (userId: string, currentStatus: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const nextStatus = currentStatus === 'BANNED' ? 'ACTIVE' : 'BANNED';

    try {
      const res = await fetch(`/api/admin/users/${userId}/ban`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: nextStatus })
      });
      if (res.ok) {
        setUsersList(prev => prev.map(u => u.id === userId ? { ...u, status: nextStatus } : u));
        showNotification(nextStatus === 'BANNED' ? 'User account has been banned!' : 'User account unbanned.');
      } else throw new Error();
    } catch (_) {
      showNotification('Failed to update ban status.', 'error');
    }
  };

  // ─── Loading Barrier ────────────────────────────────────────────────────────

  if (loading && isAdmin === null) {
    return (
      <div className="min-h-screen bg-[#0B0E11] text-white flex flex-col items-center justify-center font-mono">
        <Loader2 size={32} className="animate-spin text-[#FF4655] mb-4" />
        <span className="text-xs uppercase tracking-widest text-gray-500 font-bold">Verifying admin clearance...</span>
      </div>
    );
  }

  // ─── Access Restricted Barrier ──────────────────────────────────────────────

  if (isAdmin === false) {
    return (
      <div className="min-h-screen bg-[#0B0E11] text-white flex flex-col font-mono">
        {/* Header */}
        <header className="border-b border-white/5 bg-[#0F1215]/95 sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
          <button
            onClick={onBackToHome}
            className="flex items-center space-x-2 text-xs font-mono font-bold tracking-widest text-[#FF4655] hover:text-white transition duration-150 uppercase"
          >
            <ArrowLeft size={14} />
            <span>RETURN TO HOME</span>
          </button>
        </header>

        {/* Locked message */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto space-y-6">
          <div className="w-16 h-16 bg-[#FF4655]/10 border border-[#FF4655]/30 rounded-none flex items-center justify-center text-[#FF4655] shadow-2xl filter drop-shadow-[0_0_15px_rgba(255,70,85,0.3)] animate-pulse">
            <ShieldAlert size={28} />
          </div>
          
          <div className="space-y-2">
            <h2 className="font-rajdhani font-black text-2xl tracking-widest text-white uppercase">ADMIN Clearance Required</h2>
            <p className="text-xs text-gray-400 leading-relaxed font-mono">
              Access Denied: You do not possess the required SUPERADMIN or ADMIN role tokens to enter the control panel node.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ─── Main Admin Render Dashboard ────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#0B0E11] text-white flex flex-col font-mono pb-10">
      
      {/* Header */}
      <header className="border-b border-white/5 bg-[#0F1215]/95 sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBackToHome}
            className="p-1.5 border border-white/10 hover:border-[#FF4655] transition text-gray-400 hover:text-white cursor-pointer"
          >
            <ArrowLeft size={14} />
          </button>
          <div>
            <h1 className="font-rajdhani font-bold tracking-widest text-base sm:text-lg text-white leading-none flex items-center space-x-2">
              <ShieldAlert size={16} className="text-[#FF4655]" />
              <span>VALPORTAL MANAGEMENT SUITE</span>
            </h1>
            <p className="text-[9px] font-mono text-[#FF4655] tracking-widest uppercase">Admin clearance node // active</p>
          </div>
        </div>
      </header>

      {/* Notifications */}
      {notification && (
        <div className={`fixed bottom-4 right-4 z-50 px-4 py-2 text-xs border font-bold flex items-center space-x-2 animate-fade-in ${
          notification.type === 'success' ? 'bg-[#00FF66]/10 border-[#00FF66]/30 text-[#00FF66]' : 'bg-[#FF4655]/10 border-[#FF4655]/30 text-[#FF4655]'
        }`}>
          <Check size={12} />
          <span>{notification.msg}</span>
        </div>
      )}

      {/* Control Suite Body Grid */}
      <div className="max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 flex-1">
        
        {/* Left Aside: Suite Menu (3 cols) */}
        <aside className="lg:col-span-3 flex flex-col space-y-2">
          <div className="text-[9px] font-mono text-gray-500 uppercase tracking-widest border-b border-white/5 pb-1 mb-2">Management Nodes</div>
          
          <button
            onClick={() => setActiveTab('meta')}
            className={`w-full text-left px-4 py-3 border text-xs font-mono font-bold tracking-widest transition duration-150 uppercase flex items-center space-x-2.5 cursor-pointer ${
              activeTab === 'meta' ? 'border-[#00F0FF] bg-[#00F0FF]/5 text-white' : 'border-white/5 text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Settings size={14} className={activeTab === 'meta' ? 'text-[#00F0FF]' : 'text-gray-500'} />
            <span>META SIMULATOR</span>
          </button>

          <button
            onClick={() => setActiveTab('lineups')}
            className={`w-full text-left px-4 py-3 border text-xs font-mono font-bold tracking-widest transition duration-150 uppercase flex items-center space-x-2.5 cursor-pointer ${
              activeTab === 'lineups' ? 'border-[#FFD700] bg-[#FFD700]/5 text-white' : 'border-white/5 text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Layers size={14} className={activeTab === 'lineups' ? 'text-[#FFD700]' : 'text-gray-500'} />
            <span>LINEUPS MODERATION</span>
            {pendingLineups.length > 0 && (
              <span className="ml-auto bg-[#FF4655] text-black text-[9px] px-1.5 py-0.5 rounded-full font-bold">
                {pendingLineups.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`w-full text-left px-4 py-3 border text-xs font-mono font-bold tracking-widest transition duration-150 uppercase flex items-center space-x-2.5 cursor-pointer ${
              activeTab === 'users' ? 'border-[#00FF66] bg-[#00FF66]/5 text-white' : 'border-white/5 text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Users size={14} className={activeTab === 'users' ? 'text-[#00FF66]' : 'text-gray-500'} />
            <span>USER DIRECTORY</span>
          </button>
        </aside>

        {/* Right Section: Core Dashboard (9 cols) */}
        <main className="lg:col-span-9 bg-[#0F1215] border border-white/5 p-6 flex flex-col space-y-6 relative overflow-hidden">
          {/* Accent corners */}
          <div className="absolute top-0 left-0 w-8 h-[2px] bg-[#FF4655]" />
          <div className="absolute top-0 left-0 w-[2px] h-8 bg-[#FF4655]" />

          {/* TAB A: META SIMULATOR MANAGER */}
          {activeTab === 'meta' && agentMeta && (
            <div className="space-y-6">
              <div className="border-b border-white/5 pb-3">
                <h2 className="font-rajdhani font-black text-lg text-white tracking-widest uppercase">META SIMULATOR MANAGER</h2>
                <p className="text-[10px] text-gray-400 uppercase mt-0.5">Edit agent win rates and synergies on the fly</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                {/* Agent select list */}
                <div className="md:col-span-4 border border-white/5 max-h-96 overflow-y-auto divide-y divide-white/5">
                  {Object.keys(agentMeta.agents || {}).map((name) => (
                    <button
                      key={name}
                      onClick={() => selectAgentForEdit(name)}
                      className={`w-full text-left px-3 py-2.5 text-xs font-bold font-mono tracking-wider transition uppercase flex justify-between items-center cursor-pointer ${
                        editingAgentName === name ? 'bg-[#FF4655]/10 text-white border-l-2 border-[#FF4655]' : 'text-gray-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <span>{name}</span>
                      <span className="text-[9px] text-gray-500">{(agentMeta.agents[name] as any).role}</span>
                    </button>
                  ))}
                </div>

                {/* Edit Form */}
                {editingAgentName && (
                  <div className="md:col-span-8 bg-[#161A1E] border border-white/5 p-5 space-y-5">
                    <div className="text-xs font-bold tracking-widest uppercase text-[#FF4655] border-b border-white/5 pb-2">
                      Edit stats: {editingAgentName} ({(agentMeta.agents[editingAgentName] as any).role})
                    </div>

                    <div className="space-y-4">
                      <label className="text-[9px] font-mono text-gray-500 uppercase tracking-widest block">Base Win Rate per Map (%)</label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {Object.keys(editWinRates).map((map) => (
                          <div key={map} className="space-y-1">
                            <span className="text-[9px] text-gray-400 block uppercase tracking-wider">{map}</span>
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              max="100"
                              value={editWinRates[map]}
                              onChange={(e) => handleUpdateWinRate(map, parseFloat(e.target.value) || 0)}
                              className="w-full bg-black/40 border border-white/10 px-2.5 py-1.5 text-xs text-white focus:border-[#FF4655] focus:outline-none"
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={handleSaveMeta}
                      className="w-full py-2.5 bg-gradient-to-r from-[#FF4655]/20 to-[#FF4655]/30 hover:from-[#FF4655]/30 hover:to-[#FF4655]/40 border border-[#FF4655]/30 text-white font-mono font-bold text-xs uppercase tracking-widest transition cursor-pointer flex items-center justify-center space-x-2"
                    >
                      <Save size={13} />
                      <span>SAVE CHANGES</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB B: LINEUPS MODERATOR PANEL */}
          {activeTab === 'lineups' && (
            <div className="space-y-6">
              <div className="border-b border-white/5 pb-3">
                <h2 className="font-rajdhani font-black text-lg text-white tracking-widest uppercase">PENDING LINEUPS SUBMISSIONS</h2>
                <p className="text-[10px] text-gray-400 uppercase mt-0.5">Moderate lineup guides and strategical files</p>
              </div>

              {pendingLineups.length === 0 ? (
                <div className="py-16 text-center border border-dashed border-white/5">
                  <p className="text-xs font-mono text-gray-500 uppercase tracking-widest">No pending lineup submissions found.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono border-collapse">
                    <thead>
                      <tr className="border-b border-white/10 text-gray-400 uppercase tracking-wider">
                        <th className="py-2.5 px-3">Agent/User</th>
                        <th className="py-2.5 px-3">Map</th>
                        <th className="py-2.5 px-3">Lineup Title</th>
                        <th className="py-2.5 px-3">Media</th>
                        <th className="py-2.5 px-3 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {pendingLineups.map((lineup) => (
                        <tr key={lineup.id} className="hover:bg-white/5">
                          <td className="py-3 px-3">
                            <div className="font-bold">{lineup.username}</div>
                            <div className="text-[8px] text-gray-600">{new Date(lineup.createdAt).toLocaleDateString()}</div>
                          </td>
                          <td className="py-3 px-3 uppercase">{lineup.mapName}</td>
                          <td className="py-3 px-3 text-gray-300">{lineup.title}</td>
                          <td className="py-3 px-3">
                            <a 
                              href={lineup.mediaUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-[#00F0FF] hover:underline flex items-center space-x-1"
                            >
                              <span className="text-[10px]">Open Link</span>
                              <ExternalLink size={10} />
                            </a>
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex justify-center items-center space-x-2">
                              <button
                                onClick={() => handleApproveLineup(lineup.id)}
                                className="p-1 border border-[#00FF66]/20 bg-[#00FF66]/5 hover:bg-[#00FF66]/25 hover:border-[#00FF66]/50 text-[#00FF66] transition cursor-pointer"
                                title="Approve & Publish"
                              >
                                <Check size={13} />
                              </button>
                              <button
                                onClick={() => handleRejectLineup(lineup.id)}
                                className="p-1 border border-[#FF4655]/20 bg-[#FF4655]/5 hover:bg-[#FF4655]/25 hover:border-[#FF4655]/50 text-[#FF4655] transition cursor-pointer"
                                title="Reject & Delete"
                              >
                                <X size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB C: USER DIRECTORY & ROLE MANAGER */}
          {activeTab === 'users' && (
            <div className="space-y-6">
              <div className="border-b border-white/5 pb-3">
                <h2 className="font-rajdhani font-black text-lg text-white tracking-widest uppercase">USER DIRECTORY & ROLE MANAGER</h2>
                <p className="text-[10px] text-gray-400 uppercase mt-0.5">Control permissions and monitor user accounts</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 text-gray-400 uppercase tracking-wider">
                      <th className="py-2.5 px-3">Username</th>
                      <th className="py-2.5 px-3">Email</th>
                      <th className="py-2.5 px-3">System Role</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {usersList.map((usr) => (
                      <tr key={usr.id} className="hover:bg-white/5">
                        <td className="py-3 px-3 font-bold">{usr.username}</td>
                        <td className="py-3 px-3 text-gray-400">{usr.email}</td>
                        <td className="py-3 px-3">
                          <select
                            value={usr.role}
                            onChange={(e) => handleChangeRole(usr.id, e.target.value)}
                            className="bg-[#161A1E] border border-white/10 px-2 py-1 text-[11px] text-white focus:outline-none focus:border-[#00FF66]"
                          >
                            <option value="USER">USER</option>
                            <option value="MODERATOR">MODERATOR</option>
                            <option value="ADMIN">ADMIN</option>
                          </select>
                        </td>
                        <td className="py-3 px-3">
                          <span className={`text-[9px] px-1.5 py-0.5 border font-bold uppercase tracking-widest ${
                            usr.status === 'BANNED' ? 'bg-[#FF4655]/10 border-[#FF4655]/30 text-[#FF4655]' : 'bg-[#00FF66]/10 border-[#00FF66]/30 text-[#00FF66]'
                          }`}>
                            {usr.status}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex justify-center">
                            <button
                              onClick={() => handleToggleBan(usr.id, usr.status)}
                              className={`px-2 py-1 border text-[10px] font-bold uppercase tracking-widest transition cursor-pointer flex items-center space-x-1 ${
                                usr.status === 'BANNED' 
                                  ? 'border-[#00FF66]/20 bg-[#00FF66]/5 text-[#00FF66] hover:bg-[#00FF66]/20' 
                                  : 'border-[#FF4655]/20 bg-[#FF4655]/5 text-[#FF4655] hover:bg-[#FF4655]/20'
                              }`}
                            >
                              <UserMinus size={11} />
                              <span>{usr.status === 'BANNED' ? 'UNBAN' : 'BAN USER'}</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </main>

      </div>
    </div>
  );
}
