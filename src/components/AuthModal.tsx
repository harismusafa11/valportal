import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { X, LogIn, UserPlus, AlertTriangle } from 'lucide-react';

import { syncLocalStorageToSupabase } from '../lib/profileSync';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (tab === 'login') {
        let loginEmail = emailOrUsername.trim();
        
        // If username was entered (no @), look up email
        if (!loginEmail.includes('@')) {
          const { data, error } = await supabase
            .from('profiles')
            .select('email')
            .eq('username', loginEmail)
            .single();

          if (error || !data?.email) {
            throw new Error('Username not found. Please register or use email.');
          }
          loginEmail = data.email;
        }

        const { data: signInData, error } = await supabase.auth.signInWithPassword({
          email: loginEmail,
          password
        });
        if (error) throw error;
        
        // Secure HTTP-Only session cookie setup on Express backend
        if (signInData?.session?.access_token) {
          try {
            await fetch('/api/auth/session', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ access_token: signInData.session.access_token })
            });
          } catch (cookieErr) {
            console.error('Failed to set secure session cookie on backend:', cookieErr);
          }
        }

        try {
          await syncLocalStorageToSupabase();
        } catch (syncErr) {
          console.warn('Sync failed on login:', syncErr);
        }

        onClose();
      } else {
        if (!username.trim()) {
          throw new Error('Username is required.');
        }
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match.');
        }

        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              username: username.trim()
            }
          }
        });
        
        if (signUpError) throw signUpError;

        if (signUpData?.user) {
          // Store mapping in public profiles table for lookup
          const { error: profileError } = await supabase.from('profiles').insert([
            {
              id: signUpData.user.id,
              username: username.trim(),
              email: email.trim()
            }
          ]);
          if (profileError) {
            console.warn('Profile record insert failed:', profileError.message);
          }

          // Secure HTTP-Only session cookie setup on Express backend
          if (signUpData?.session?.access_token) {
            try {
              await fetch('/api/auth/session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ access_token: signUpData.session.access_token })
              });
            } catch (cookieErr) {
              console.error('Failed to set secure session cookie on backend:', cookieErr);
            }
          }
        }

        setSuccessMsg('Registration successful! Please check your email for confirmation link.');
        setTimeout(() => {
          setTab('login');
          setSuccessMsg(null);
        }, 4000);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) throw error;
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to authenticate with Google.');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm bg-[#0F1215] border border-zinc-800 p-6 shadow-2xl relative">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-white transition cursor-pointer"
        >
          <X size={16} />
        </button>

        {/* Logo/Header */}
        <div className="text-center mb-6">
          <img src="/logo.webp" alt="ValPortal Logo" className="w-10 h-10 object-contain mx-auto mb-2 select-none" />
          <h3 className="font-rajdhani font-bold text-lg uppercase tracking-widest text-white">
            VALPORTAL AUTH
          </h3>
          <p className="text-[9px] font-mono text-gray-500 tracking-widest uppercase mt-0.5">
            Access synchronized tactical crosshair profiles
          </p>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-white/5 mb-6">
          <button
            onClick={() => { setTab('login'); setErrorMsg(null); }}
            className={`flex-1 py-2 text-[10px] font-mono font-bold tracking-widest uppercase transition cursor-pointer ${
              tab === 'login' 
                ? 'text-[#FF4655] border-b-2 border-[#FF4655]' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            SIGN IN
          </button>
          <button
            onClick={() => { setTab('register'); setErrorMsg(null); }}
            className={`flex-1 py-2 text-[10px] font-mono font-bold tracking-widest uppercase transition cursor-pointer ${
              tab === 'register' 
                ? 'text-[#FF4655] border-b-2 border-[#FF4655]' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            REGISTER
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleEmailAuth} className="space-y-4">
          {errorMsg && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-3 py-2 text-[10px] font-mono flex items-start space-x-2">
              <AlertTriangle size={12} className="shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="bg-[#00FF00]/10 border border-[#00FF00]/20 text-[#00FF00] px-3 py-2 text-[10px] font-mono">
              {successMsg}
            </div>
          )}

          {tab === 'login' ? (
            <div className="space-y-1">
              <label className="text-[9px] font-mono font-bold text-gray-400 uppercase tracking-widest block">
                Email or Username
              </label>
              <input
                type="text"
                required
                placeholder="YOUR EMAIL OR USERNAME"
                value={emailOrUsername}
                onChange={(e) => setEmailOrUsername(e.target.value)}
                className="w-full bg-[#161A1E] text-white border border-white/5 focus:border-[#FF4655] focus:outline-none px-3 py-2 text-xs font-mono rounded-none"
              />
            </div>
          ) : (
            <>
              <div className="space-y-1">
                <label className="text-[9px] font-mono font-bold text-gray-400 uppercase tracking-widest block">
                  Username
                </label>
                <input
                  type="text"
                  required
                  placeholder="CHOOSE A USERNAME"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-[#161A1E] text-white border border-white/5 focus:border-[#FF4655] focus:outline-none px-3 py-2 text-xs font-mono rounded-none uppercase"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-mono font-bold text-gray-400 uppercase tracking-widest block">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="YOUR.EMAIL@DOMAIN.COM"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#161A1E] text-white border border-white/5 focus:border-[#FF4655] focus:outline-none px-3 py-2 text-xs font-mono rounded-none"
                />
              </div>
            </>
          )}

          <div className="space-y-1">
            <label className="text-[9px] font-mono font-bold text-gray-400 uppercase tracking-widest block">
              Password
            </label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#161A1E] text-white border border-white/5 focus:border-[#FF4655] focus:outline-none px-3 py-2 text-xs font-mono rounded-none"
            />
          </div>

          {tab === 'register' && (
            <div className="space-y-1">
              <label className="text-[9px] font-mono font-bold text-gray-400 uppercase tracking-widest block">
                Confirm Password
              </label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-[#161A1E] text-white border border-white/5 focus:border-[#FF4655] focus:outline-none px-3 py-2 text-xs font-mono rounded-none"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-[#FF4655] hover:bg-[#FF4655]/95 text-black font-bold text-[10px] font-mono tracking-widest uppercase transition duration-150 rounded-none flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
          >
            {tab === 'login' ? <LogIn size={12} /> : <UserPlus size={12} />}
            <span>{loading ? 'PROCESSING...' : tab === 'login' ? 'SIGN IN' : 'CREATE ACCOUNT'}</span>
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-5 text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/5"></div>
          </div>
          <span className="relative bg-[#0F1215] px-3 font-mono text-[8px] text-gray-500 uppercase tracking-widest">
            Or auth with
          </span>
        </div>

        {/* Google Authentication */}
        <button
          onClick={handleGoogleAuth}
          disabled={loading}
          className="w-full py-2 border border-white/10 hover:border-white/20 text-white font-mono text-[9px] tracking-widest uppercase transition duration-150 rounded-none flex items-center justify-center space-x-2 bg-[#161A1E] cursor-pointer"
        >
          {/* Google Icon logo */}
          <svg className="w-3.5 h-3.5 mr-1" viewBox="0 0 24 24" fill="currentColor">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.77c-.98.66-2.23 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
          </svg>
          <span>CONTINUE WITH GOOGLE</span>
        </button>

        {/* Corner Brackets */}
        <div className="absolute top-2 right-2 w-1.5 h-1.5 border-t border-r border-white/10" />
        <div className="absolute bottom-2 left-2 w-1.5 h-1.5 border-b border-l border-white/10" />
      </div>
    </div>
  );
}
