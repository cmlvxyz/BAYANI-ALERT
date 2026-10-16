import React, { useState } from 'react';
import { ShieldAlert, Lock, User, LogIn, Eye, EyeOff, Activity, Radio, Waypoints } from 'lucide-react';
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

  const features = [
    { icon: Activity, title: 'Live SOS monitoring', desc: 'Real-time incident intake streamed over the bridge.' },
    { icon: Waypoints, title: 'GNSS dispatch map', desc: 'Locate citizens and units with Street View.' },
    { icon: Radio, title: 'Responder coordination', desc: 'Assign units and track case status.' },
  ];

  return (
    <div className="min-h-screen w-full bg-canvas text-ink antialiased font-sans flex">
      {/* ===== LEFT — navy command pane ===== */}
      <div className="hidden lg:flex w-[44%] min-w-[400px] shrink-0 bg-navy-900 relative overflow-hidden flex-col justify-between p-10 text-white">
        {/* decorative glows */}
        <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-brand-600/25 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -left-24 w-96 h-96 rounded-full bg-info/10 blur-3xl pointer-events-none" />
        <div
          className="absolute inset-0 opacity-[0.06] pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,.9) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.9) 1px, transparent 1px)',
            backgroundSize: '44px 44px',
          }}
        />

        <div className="relative z-10 flex items-center gap-3">
          <img src={bayaniLogo} alt="Bayani Alert logo" className="w-10 h-10 object-contain" />
          <div>
            <h1 className="font-black text-lg tracking-wider uppercase leading-none">Bayani-Alert</h1>
            <p className="text-[10px] text-slate-400 font-mono mt-0.5">RESPONSE CENTER</p>
          </div>
        </div>

        <div className="relative z-10">
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 text-[10px] font-black uppercase tracking-[0.16em] text-brand-200">
            <ShieldAlert className="w-3.5 h-3.5" /> Restricted Access
          </span>
          <h2 className="font-black text-3xl xl:text-4xl tracking-tight mt-5 leading-tight">
            Emergency Operations<br />&amp; Dispatch Console
          </h2>
          <p className="text-sm text-slate-400 font-medium mt-3 max-w-sm">
            Command center for authorities coordinating VAWC and public-safety emergencies in real time.
          </p>

          <div className="mt-8 space-y-3.5">
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-ctl bg-white/10 border border-white/10 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-brand-300" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white leading-none">{f.title}</p>
                    <p className="text-[11px] text-slate-400 mt-1">{f.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <p className="relative z-10 text-[11px] text-slate-500 font-medium">
          Safety in Every Step · Bayani Alert Response Center
        </p>
      </div>

      {/* ===== RIGHT — login form ===== */}
      <div className="flex-1 min-w-0 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-md">
          {/* Mobile-only compact brand */}
          <div className="lg:hidden flex flex-col items-center mb-6 text-center">
            <div className="w-14 h-14 rounded-panel bg-navy-900 flex items-center justify-center shadow-lift">
              <img src={bayaniLogo} alt="Bayani Alert logo" className="w-10 h-10 object-contain" />
            </div>
            <h1 className="font-black text-ink text-xl tracking-wider uppercase mt-3">
              Bayani-Alert
            </h1>
            <p className="text-xs text-muted font-medium">
              Response Center · Authority Sign-in
            </p>
          </div>

          <div className="bg-white rounded-panel border border-line shadow-lift p-6 sm:p-8">
            <div className="mb-5">
              <h2 className="font-black text-ink text-xl tracking-tight">
                Authority Sign-in
              </h2>
              <p className="text-xs text-muted font-medium mt-1">
                Authenticate to access the Response Center console.
              </p>
            </div>

            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="text-[11px] font-black text-slate-600 uppercase tracking-wider block mb-1.5">
                  Username
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Username"
                    autoComplete="username"
                    className="rc-focus-ring w-full pl-9 pr-3 py-2.5 rounded-field border border-line bg-slate-50 focus:bg-white focus:border-brand-500 focus:outline-none text-sm transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-black text-slate-600 uppercase tracking-wider block mb-1.5">
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
                    className="rc-focus-ring w-full pl-9 pr-10 py-2.5 rounded-field border border-line bg-slate-50 focus:bg-white focus:border-brand-500 focus:outline-none text-sm transition-colors"
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
                <p role="alert" className="text-xs font-bold text-emergency bg-red-50 border border-red-200 rounded-field px-3 py-2">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={busy}
                className="rc-focus-ring w-full py-2.5 rounded-field bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors active:scale-[0.99]"
              >
                <LogIn className="w-4 h-4" />
                {busy ? 'Signing in…' : 'Sign in'}
              </button>
            </form>

            <p className="text-center text-[11px] text-slate-400 font-medium mt-5">
              Restricted access — authorized personnel only.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
