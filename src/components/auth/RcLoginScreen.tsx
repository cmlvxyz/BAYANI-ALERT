import React, { useState } from 'react';
import { ShieldAlert, Lock, User, LogIn, Eye, EyeOff } from 'lucide-react';
import bayaniLogo from '../../assets/images/logo (2).png';

interface Props {
  onLogin: (username: string, password: string) => Promise<void>;
}

export default function RcLoginScreen({ onLogin }: Props) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      await onLogin(username.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-sky-100 via-blue-50 to-blue-200 text-slate-800 antialiased font-sans flex">
      {/* ===== LEFT — blue pane (logo + branding), curved on the right ===== */}
      <div
        className="hidden lg:flex w-[42%] min-w-[380px] shrink-0 bg-gradient-to-b from-sky-400 to-blue-600 relative overflow-hidden flex-col items-center justify-center text-center p-10"
        style={{ borderRadius: '0 3rem 3rem 0' }}
      >
        {/* faint decorative glow */}
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-28 -left-20 w-80 h-80 rounded-full bg-blue-900/20 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center">
          <img src={bayaniLogo} alt="Bayani Alert logo" className="w-32 h-32 object-contain drop-shadow-2xl" />
          <h1 className="font-black text-white text-3xl tracking-wider uppercase mt-5">
            Bayani-Alert
          </h1>
          <p className="text-sm text-blue-100 font-medium mt-1">
            Response Center • Safety in Every Step
          </p>

          <span className="mt-8 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/15 border border-white/25 text-white text-[11px] font-black uppercase tracking-widest">
            <ShieldAlert className="w-4 h-4 text-blue-200" />
            Restricted Access
          </span>
        </div>
      </div>

      {/* ===== RIGHT — login form ===== */}
      <div className="flex-1 min-w-0 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-md">
          {/* Mobile-only compact brand */}
          <div className="lg:hidden flex flex-col items-center mb-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-b from-sky-400 to-blue-600 flex items-center justify-center shadow-lg">
              <img src={bayaniLogo} alt="Bayani Alert logo" className="w-11 h-11 object-contain" />
            </div>
            <h1 className="font-black text-slate-900 text-xl tracking-wider uppercase mt-3">
              Bayani-Alert
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Response Center • Authority Sign-in
            </p>
          </div>

          <div className="bg-white/90 backdrop-blur-sm rounded-3xl border border-slate-200/80 shadow-xl p-6 sm:p-8 space-y-4">
            <div className="mb-1">
              <h2 className="font-black text-slate-900 text-xl tracking-tight">
                Authority Sign-in
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Response Center Console
              </p>
            </div>

            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="text-xs font-black text-slate-600 uppercase tracking-wider block mb-1.5">
                  Username
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Username"
                    autoComplete="username"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:outline-none text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-black text-slate-600 uppercase tracking-wider block mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    autoComplete="current-password"
                    className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:outline-none text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    aria-label={showPw ? 'Hide password' : 'Show password'}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                  >
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <p className="text-xs font-bold text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={busy}
                className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white text-xs font-extrabold flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              >
                <LogIn className="w-4 h-4" />
                {busy ? 'SIGNING IN…' : 'SIGN IN'}
              </button>
            </form>

            <p className="text-center text-[11px] text-slate-400 font-medium">
              Restricted access — authorized personnel only.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}