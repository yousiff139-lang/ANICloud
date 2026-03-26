'use client';

import { useState, useEffect } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { LogIn, Mail, Lock, Loader2, ArrowLeft, Shield } from 'lucide-react';

export default function LoginPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [show2FA, setShow2FA] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');

  // Auto-redirect if already logged in
  useEffect(() => {
    if (status === 'authenticated') {
      window.location.href = '/';
    }
  }, [status]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Step 1: If 2FA prompt is not yet shown, check if it's needed
      if (!show2FA) {
        const preCheck = await fetch('/api/auth/pre-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const preData = await preCheck.json();
        
        if (preData.requires2FA) {
          setShow2FA(true);
          setLoading(false);
          return;
        }
      }

      // Step 2: Proceed with sign-in (with or without 2FA code)
      const res = await signIn('credentials', {
        email,
        password,
        twoFactorCode: show2FA ? twoFactorCode : undefined,
        redirect: false,
      });

      if (res?.error) {
        if (show2FA) {
          setError('Invalid 2FA code. Please try again.');
        } else {
          setError('Invalid email or password');
        }
        setLoading(false);
      } else if (res?.ok) {
        // Wait for session to be established
        await new Promise(resolve => setTimeout(resolve, 500));
        window.location.href = '/';
      } else {
        setError('An unexpected error occurred');
        setLoading(false);
      }
    } catch (err) {
      console.error('[Login] Exception:', err);
      setError('An error occurred during authentication');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0E14] flex items-center justify-center p-4 text-white relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-neonCyan/10 blur-[120px] rounded-full" />
        <div className="absolute top-[60%] -right-[10%] w-[40%] h-[40%] bg-pulsingViolet/10 blur-[120px] rounded-full" />
      </div>

      <button 
        onClick={() => router.push('/')}
        className="absolute top-8 left-8 p-3 rounded-full glass hover:bg-white/10 transition-all z-20 group"
      >
        <ArrowLeft size={24} className="text-white/60 group-hover:text-neonCyan transition-colors" />
      </button>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md"
      >
        <div className="glass p-8 md:p-12 rounded-3xl border border-white/10 shadow-2xl relative z-10">
          <div className="text-center mb-10">
            <h1 className="font-outfit text-4xl font-black mb-3 tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-neonCyan to-pulsingViolet">
              ANICloud
            </h1>
            <p className="text-white/50 text-sm font-medium">
              {show2FA ? 'Enter your 2FA code to continue' : 'Sign in to your personal library'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-500 text-sm text-center font-bold">
                {error}
              </div>
            )}

            <div className="space-y-4">
              {!show2FA && (
                <>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Mail size={18} className="text-white/30 group-focus-within:text-neonCyan transition-colors" />
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Email Address"
                      required
                      className="w-full bg-[#05080f]/50 border border-white/10 text-white rounded-xl pl-12 pr-4 py-4 text-sm font-medium focus:outline-none focus:border-neonCyan focus:ring-1 focus:ring-neonCyan transition-all placeholder:text-white/20"
                    />
                  </div>

                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Lock size={18} className="text-white/30 group-focus-within:text-neonCyan transition-colors" />
                    </div>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Password"
                      required
                      className="w-full bg-[#05080f]/50 border border-white/10 text-white rounded-xl pl-12 pr-4 py-4 text-sm font-medium focus:outline-none focus:border-neonCyan focus:ring-1 focus:ring-neonCyan transition-all placeholder:text-white/20"
                    />
                  </div>
                </>
              )}

              {show2FA && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-4"
                >
                  <div className="p-4 bg-neonCyan/5 border border-neonCyan/20 rounded-xl text-center">
                    <Shield size={32} className="text-neonCyan mx-auto mb-2" />
                    <p className="text-sm font-bold text-neonCyan">Two-Factor Authentication</p>
                    <p className="text-xs text-white/40 mt-1">Enter the 6-digit code from your authenticator app</p>
                  </div>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Shield size={18} className="text-neonCyan" />
                    </div>
                    <input
                      type="text"
                      maxLength={6}
                      value={twoFactorCode}
                      onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="000000"
                      autoFocus
                      required
                      className="w-full bg-neonCyan/5 border border-neonCyan/30 text-neonCyan rounded-xl pl-12 pr-4 py-4 text-center text-xl font-bold tracking-[0.5em] focus:outline-none focus:border-neonCyan focus:ring-1 focus:ring-neonCyan transition-all placeholder:text-neonCyan/20"
                    />
                  </div>
                  <button 
                    type="button"
                    onClick={() => { setShow2FA(false); setTwoFactorCode(''); setError(''); }}
                    className="text-xs text-white/40 hover:text-white transition-colors font-bold"
                  >
                    ← Back to login
                  </button>
                </motion.div>
              )}
            </div>

            <div className="space-y-4">
              {!show2FA && (
                <>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        console.log('[Login] Starting Google Sign-In...');
                        const result = await signIn('google', { callbackUrl: '/', redirect: false });
                        console.log('[Login] Google Sign-In result:', result);
                        
                        if (result?.error) {
                          console.error('[Login] Google Sign-In error:', result.error);
                          setError(`Google Login Error: ${result.error}. Check your Railway environment variables.`);
                        } else if (result?.url) {
                          window.location.href = result.url;
                        }
                      } catch (err: any) {
                        console.error('[Login] Google Sign-In Exception:', err);
                        setError(`Google Login Exception: ${err.message || 'Unknown error'}`);
                      }
                    }}
                    className="w-full bg-white/5 border border-white/10 text-white font-bold text-sm tracking-widest uppercase py-4 rounded-xl hover:bg-white/10 transition-all flex items-center justify-center gap-3 group"
                  >
                    <svg className="w-5 h-5 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                      <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    Continue with Google
                  </button>

                  <div className="relative py-4">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-white/5"></div>
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-[#0B0E14] px-2 text-white/30 font-bold tracking-widest">Or</span>
                    </div>
                  </div>
                </>
              )}

              <button
                type="submit"
                disabled={loading || (show2FA && twoFactorCode.length !== 6)}
                className="w-full bg-white text-black font-bold text-sm tracking-widest uppercase py-4 rounded-xl hover:bg-neonCyan transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_20px_rgba(0,242,255,0.1)] hover:shadow-[0_0_30px_rgba(0,242,255,0.3)] flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : 
                 show2FA ? <><Shield size={18} /> Verify & Enter</> :
                 <><LogIn size={18} /> Enter Portal</>}
              </button>
            </div>
            {!show2FA && (
              <p className="text-center text-xs text-white/30 font-medium mt-6">
                Don&apos;t have an account? Enter a new email and we&apos;ll instantly register you.
              </p>
            )}
          </form>
        </div>
      </motion.div>
    </div>
  );
}
