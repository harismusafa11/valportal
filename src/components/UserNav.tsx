import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/useAuth';
import AuthModal from './AuthModal';
import { User, LogOut, ShieldAlert } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

export default function UserNav() {
  const { user, logout } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      return;
    }
    async function checkRole() {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        
        if (error) throw error;
        
        const role = data?.role || (user.email?.includes('admin') ? 'ADMIN' : 'USER');
        setIsAdmin(role === 'ADMIN' || role === 'SUPERADMIN');
      } catch (_) {
        setIsAdmin(user.email?.includes('admin') || false);
      }
    }
    checkRole();
  }, [user]);

  const activeName = user?.user_metadata?.username || user?.email?.split('@')[0] || 'User';

  const getInitials = (name: string) => {
    if (!name) return 'U';
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <div className="relative flex items-center">
      {user ? (
        <div className="relative">
          {/* User profile avatar initials pill */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsDropdownOpen((prev) => !prev);
            }}
            className="flex items-center space-x-2 bg-[#161A1E] border border-white/10 hover:border-[#FF4655] px-3 py-1.5 transition duration-150 rounded-none cursor-pointer text-gray-300 hover:text-white"
          >
            <div className="w-4.5 h-4.5 bg-gradient-to-br from-[#FF4655] to-[#8B0000] text-black font-rajdhani font-black text-[9px] flex items-center justify-center border border-white/20 select-none">
              {getInitials(activeName)}
            </div>
            <span className="text-[10px] font-mono tracking-wider max-w-[100px] truncate uppercase">
              {activeName}
            </span>
          </button>

          {/* Dropdown Menu */}
          {isDropdownOpen && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setIsDropdownOpen(false)}
              />
              <div className="absolute right-0 mt-1.5 w-48 bg-[#0F1215] border border-zinc-800 shadow-2xl z-50 p-2 rounded-none">
                <div className="px-3 py-2 border-b border-white/5 mb-1.5">
                  <div className="text-[8px] font-mono text-gray-500 uppercase tracking-widest">Logged in as</div>
                  <div className="text-[10px] font-mono text-white truncate mt-0.5">{user.email}</div>
                </div>
                {isAdmin && (
                  <button
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent('valportal_navigate', { detail: 'admin' }));
                      setIsDropdownOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-[10px] font-mono text-gray-400 hover:text-[#00F0FF] hover:bg-white/5 transition flex items-center space-x-2 cursor-pointer rounded-none uppercase tracking-wider font-bold mb-1 border-b border-white/5 pb-2"
                  >
                    <ShieldAlert size={11} className="text-[#FF4655]" />
                    <span>ADMIN PANEL</span>
                  </button>
                )}
                
                <button
                  onClick={async () => {
                    await logout();
                    setIsDropdownOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-[10px] font-mono text-gray-400 hover:text-[#FF4655] hover:bg-white/5 transition flex items-center space-x-2 cursor-pointer rounded-none"
                >
                  <LogOut size={11} />
                  <span>LOG OUT</span>
                </button>
              </div>
            </>
          )}
        </div>
      ) : (
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-1.5 border border-white/10 hover:border-[#FF4655] text-[11px] font-mono font-bold tracking-widest transition duration-150 uppercase bg-[#161A1E] text-gray-300 hover:text-white flex items-center space-x-2 cursor-pointer"
        >
          <User size={11} className="text-gray-400 group-hover:text-white" />
          <span>SIGN IN / REGISTER</span>
        </button>
      )}

      {/* Auth Modal Portal */}
      <AuthModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}
