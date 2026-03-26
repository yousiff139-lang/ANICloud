'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Bell, Shield, Monitor, Keyboard, ChevronRight, LogOut, Check, Save, Loader2, Camera, ShieldCheck } from 'lucide-react';

export default function SettingsPage() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [activeTab, setActiveTab] = useState('Account');
  const [quality, setQuality] = useState('Auto');
  const [notifications, setNotifications] = useState(true);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [avatar, setAvatar] = useState<string | null>(null);
  
  const [isConfiguring2FA, setIsConfiguring2FA] = useState(false);
  const [twoFactorStep, setTwoFactorStep] = useState(1);
  const [verifyCode, setVerifyCode] = useState('');
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [twoFactorSecret, setTwoFactorSecret] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [showRecoveryCodes, setShowRecoveryCodes] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');
  
  // Profile form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [website, setWebsite] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (session?.user) {
      setName(session.user.name || '');
      setEmail(session.user.email || '');
      loadProfile();
    }
  }, [session]);

  const loadProfile = async () => {
    try {
      const res = await fetch('/api/profile');
      if (res.ok) {
        const data = await res.json();
        setBio(data.profile?.bio || '');
        setLocation(data.profile?.location || '');
        setWebsite(data.profile?.website || '');
        setAvatar(data.profile?.avatar || null);
        setIs2FAEnabled(data.user?.twoFactorEnabled || false);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          bio,
          location,
          website,
          avatar
        })
      });

      if (res.ok) {
        await update(); // This will trigger the JWT re-fetch with new avatar URL
        alert('Profile updated successfully!');
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/login' });
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const start2FASetup = async () => {
    setIsConfiguring2FA(true);
    setTwoFactorStep(1);
    try {
      const res = await fetch('/api/auth/2fa/setup');
      if (res.ok) {
        const data = await res.json();
        setTwoFactorSecret(data.secret);
        setQrCodeUrl(data.qrCodeUrl);
      }
    } catch (error) {
      console.error('Error starting 2FA setup:', error);
    }
  };

  const verifyAndEnable2FA = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: verifyCode })
      });

      const data = await res.json();
      if (res.ok) {
        setIs2FAEnabled(true);
        setIsConfiguring2FA(false);
        setVerifyCode('');
        if (data.recoveryCodes) {
          setRecoveryCodes(data.recoveryCodes);
          setShowRecoveryCodes(true);
        }
      } else {
        alert(data.error || 'Invalid verification code');
      }
    } catch (error) {
      console.error('Error verifying 2FA:', error);
      alert('Failed to verify 2FA code');
    } finally {
      setLoading(false);
    }
  };

  const disable2FA = async () => {
    const password = prompt('Enter your password to disable 2FA:');
    if (!password) return;
    
    setLoading(true);
    try {
      const res = await fetch('/api/auth/2fa/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      const data = await res.json();
      if (res.ok) {
        setIs2FAEnabled(false);
        alert('2FA has been disabled.');
      } else {
        alert(data.error || 'Failed to disable 2FA');
      }
    } catch (error) {
      console.error('Error disabling 2FA:', error);
    } finally {
      setLoading(false);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handlePasswordChange = async () => {
    if (!currentPassword || !newPassword) {
      setPasswordMsg({ type: 'error', text: 'Both fields are required' });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordMsg({ type: 'error', text: 'New password must be at least 6 characters' });
      return;
    }
    setPasswordLoading(true);
    setPasswordMsg(null);
    try {
      const res = await fetch('/api/auth/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const data = await res.json();
      if (res.ok) {
        setPasswordMsg({ type: 'success', text: 'Password updated successfully!' });
        setCurrentPassword('');
        setNewPassword('');
      } else {
        setPasswordMsg({ type: 'error', text: data.error || 'Failed to update password' });
      }
    } catch (error) {
      setPasswordMsg({ type: 'error', text: 'An error occurred' });
    } finally {
      setPasswordLoading(false);
    }
  };

  const tabs = [
    { name: 'Account', icon: <User size={18} /> },
    { name: 'Preferences', icon: <Monitor size={18} /> },
    { name: 'Security', icon: <Shield size={18} /> },
    { name: 'Notifications', icon: <Bell size={18} /> },
  ];

  return (
    <div className="flex bg-[#0B0E14] text-white selection:bg-neonCyan/30 pt-10">
      <div className="max-w-6xl w-full mx-auto p-12 flex gap-16">
        
        {/* Settings Sidebar */}
        <div className="w-64 shrink-0">
          <h1 className="text-3xl font-outfit font-black mb-8 tracking-tight">Settings</h1>
          <nav className="space-y-2">
            {tabs.map((tab) => (
              <button
                key={tab.name}
                onClick={() => setActiveTab(tab.name)}
                className={`w-full flex items-center justify-between p-4 rounded-xl transition-all font-bold tracking-tight text-sm ${activeTab === tab.name ? 'bg-neonCyan/10 text-neonCyan border border-neonCyan/20' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}
              >
                <div className="flex items-center gap-3">
                  {tab.icon}
                  {tab.name}
                </div>
                {activeTab === tab.name && <ChevronRight size={16} />}
              </button>
            ))}
            
            <div className="pt-8 mt-8 border-t border-white/10">
              <button 
                onClick={handleSignOut}
                className="w-full flex items-center gap-3 p-4 rounded-xl transition-all font-bold tracking-tight text-sm text-red-400 hover:bg-red-400/20"
              >
                <LogOut size={18} />
                Sign Out
              </button>
            </div>
          </nav>
        </div>

        {/* Main Settings Area */}
        <div className="flex-1">
          <AnimatePresence mode="wait">
            {activeTab === 'Account' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-12"
              >
                <div>
                  <h2 className="text-2xl font-bold mb-6">Profile Details</h2>
                  <div className="glass border border-white/5 rounded-2xl p-8">
                    <div className="flex items-start gap-8 mb-8">
                       <div className="relative group cursor-pointer" onClick={triggerFileInput}>
                        <div className="w-24 h-24 rounded-2xl bg-gradient-to-tr from-neonCyan to-pulsingViolet flex items-center justify-center shadow-[0_0_30px_rgba(0,242,255,0.2)] overflow-hidden">
                          {avatar ? (
                            <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
                          ) : (
                            <User size={40} className="text-white" />
                          )}
                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Camera size={24} className="text-white" />
                          </div>
                        </div>
                        <input 
                          type="file" 
                          ref={fileInputRef as any} 
                          className="hidden" 
                          accept="image/*"
                          onChange={handleAvatarChange}
                        />
                      </div>
                      <div className="flex-1">
                        <p className="text-white/60 text-sm mb-4 leading-relaxed">
                          Click on the avatar to upload a new profile picture. 
                          Changes to your display name will appear globally across ANICloud.
                        </p>
                        <button 
                          onClick={() => router.push('/profile')}
                          className="px-4 py-2 glass text-white text-xs font-bold rounded-lg hover:bg-white hover:text-black transition-all border border-white/10 hover:border-white"
                        >
                          View Public Profile
                        </button>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <label className="text-xs font-bold text-white/40 uppercase tracking-widest block mb-2">Display Name</label>
                          <input 
                            type="text" 
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Your name"
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-neonCyan focus:outline-none transition-all" 
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-white/40 uppercase tracking-widest block mb-2">Email Address</label>
                          <input 
                            type="email" 
                            value={email}
                            disabled
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white/50 cursor-not-allowed" 
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-white/40 uppercase tracking-widest block mb-2">Bio</label>
                        <textarea 
                          value={bio}
                          onChange={(e) => setBio(e.target.value)}
                          placeholder="Tell us about yourself..."
                          rows={3}
                          className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-neonCyan focus:outline-none transition-all resize-none"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <label className="text-xs font-bold text-white/40 uppercase tracking-widest block mb-2">Location</label>
                          <input 
                            type="text" 
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            placeholder="City, Country"
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-neonCyan focus:outline-none transition-all" 
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-white/40 uppercase tracking-widest block mb-2">Website</label>
                          <input 
                            type="url" 
                            value={website}
                            onChange={(e) => setWebsite(e.target.value)}
                            placeholder="https://yoursite.com"
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-neonCyan focus:outline-none transition-all" 
                          />
                        </div>
                      </div>

                      <div className="flex justify-end pt-4">
                        <button 
                          onClick={saveProfile}
                          disabled={saving}
                          className="flex items-center gap-2 px-8 py-3 glass text-white hover:bg-white hover:text-black rounded-xl font-bold transition-all disabled:opacity-50 border border-white/5 hover:border-white shadow-lg"
                        >
                          {saving ? (
                            <>
                              <Loader2 size={18} className="animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Save size={18} />
                              Save Changes
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'Preferences' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-12"
              >
                <div>
                  <h2 className="text-2xl font-bold mb-6">Playback Quality</h2>
                  <div className="glass border border-white/5 rounded-2xl p-8 space-y-4">
                    <p className="text-white/50 text-sm mb-6">Set your default video streaming quality. Auto will adjust based on your connection speed.</p>
                    <div className="grid grid-cols-4 gap-4">
                      {['Auto', '1080p', '720p', '480p'].map(q => (
                        <button
                          key={q}
                          onClick={() => setQuality(q)}
                          className={`flex items-center justify-center p-4 rounded-xl border transition-all ${quality === q ? 'border-neonCyan bg-neonCyan/10 text-neonCyan font-bold' : 'border-white/10 hover:bg-white hover:text-black hover:border-white text-white/60'}`}
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'Security' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-12"
              >
                <div>
                  <h2 className="text-2xl font-bold mb-6">Security Settings</h2>
                  <div className="glass border border-white/5 rounded-2xl p-8 space-y-8">
                    <div className="space-y-6">
                      <h4 className="font-bold text-white/80">Change Password</h4>
                      {passwordMsg && (
                        <div className={`p-3 rounded-xl text-sm font-bold text-center ${passwordMsg.type === 'success' ? 'bg-green-500/10 border border-green-500/30 text-green-400' : 'bg-red-500/10 border border-red-500/30 text-red-400'}`}>
                          {passwordMsg.text}
                        </div>
                      )}
                      <div className="grid gap-4">
                        <input 
                          type="password" 
                          placeholder="Current Password"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-neonCyan focus:outline-none transition-all" 
                        />
                        <input 
                          type="password" 
                          placeholder="New Password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-neonCyan focus:outline-none transition-all" 
                        />
                      </div>
                      <button 
                        onClick={handlePasswordChange}
                        disabled={passwordLoading}
                        className="px-6 py-3 glass text-white hover:bg-white hover:text-black rounded-xl font-bold transition-all border border-white/10 hover:border-white shadow-lg disabled:opacity-50"
                      >
                        {passwordLoading ? 'Updating...' : 'Update Password'}
                      </button>
                    </div>

                    <div className="pt-8 border-t border-white/5 space-y-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="font-bold mb-1">Two-Factor Authentication</h4>
                          <p className="text-sm text-white/50 mb-4">Add an extra layer of security to your account.</p>
                          
                          {isConfiguring2FA ? (
                            <motion.div 
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              className="glass-card p-6 bg-white/5 border border-neonCyan/20 rounded-2xl space-y-6 overflow-hidden mb-6 max-w-md"
                            >
                              {twoFactorStep === 1 ? (
                                <>
                                  <div className="flex items-center gap-4 mb-4">
                                     <div className="w-10 h-10 rounded-full bg-neonCyan/20 flex items-center justify-center text-neonCyan font-bold">1</div>
                                     <h5 className="font-bold">Scan QR Code</h5>
                                  </div>
                                   <div className="bg-white p-4 rounded-xl w-48 h-48 mx-auto mb-4 flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.1)]">
                                    {qrCodeUrl ? (
                                      <img src={qrCodeUrl} alt="QR Code" className="w-full h-full" />
                                    ) : (
                                      <Loader2 className="animate-spin text-black" size={32} />
                                    )}
                                  </div>
                                  <div className="text-center space-y-2">
                                    <p className="text-xs text-white/40 uppercase tracking-widest font-bold">Secret Key</p>
                                    <code className="text-neonCyan font-mono bg-black/40 px-3 py-1 rounded-lg border border-white/5 select-all cursor-pointer">{twoFactorSecret || 'Generating...'}</code>
                                  </div>
                                  <button 
                                    onClick={() => setTwoFactorStep(2)}
                                    className="w-full py-3 glass text-white hover:bg-white hover:text-black rounded-xl font-bold transition-all border border-white/10 hover:border-white shadow-lg"
                                  >
                                    Next Step
                                  </button>
                                </>
                              ) : (
                                <>
                                  <div className="flex items-center gap-4 mb-4">
                                     <div className="w-10 h-10 rounded-full bg-neonCyan/20 flex items-center justify-center text-neonCyan font-bold">2</div>
                                     <h5 className="font-bold">Verify Device</h5>
                                  </div>
                                  <p className="text-xs text-white/60 mb-4">Enter the 6-digit code from your authenticator app.</p>
                                  <input 
                                    type="text" 
                                    maxLength={6}
                                    placeholder="000000"
                                    value={verifyCode}
                                    onChange={(e) => setVerifyCode(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-4 text-center text-2xl font-mono tracking-[1em] focus:border-neonCyan focus:outline-none transition-all mb-4" 
                                  />
                                  <div className="flex gap-3">
                                    <button 
                                      onClick={() => setTwoFactorStep(1)}
                                      className="flex-1 py-3 glass text-white hover:bg-white hover:text-black rounded-xl font-bold transition-all border border-white/10 hover:border-white"
                                    >
                                      Back
                                    </button>
                                    <button 
                                      disabled={verifyCode.length !== 6 || loading}
                                      onClick={verifyAndEnable2FA}
                                      className="flex-[2] py-3 glass text-white hover:bg-white hover:text-black rounded-xl font-bold transition-all border border-white/10 hover:border-white shadow-lg disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-white"
                                    >
                                      {loading ? 'Verifying...' : 'Verify & Enable'}
                                    </button>
                                  </div>
                                </>
                              )}
                            </motion.div>
                          ) : is2FAEnabled ? (
                            <div className="flex items-center gap-4 p-4 rounded-2xl bg-neonCyan/5 border border-neonCyan/20 max-w-md mb-6">
                              <div className="w-12 h-12 rounded-xl bg-neonCyan/20 flex items-center justify-center text-neonCyan">
                                <Check size={24} />
                              </div>
                              <div className="flex-1">
                                <h5 className="font-bold text-sm">2FA is Protected</h5>
                                <p className="text-xs text-white/40">Authenticator App enabled</p>
                              </div>
                              <button 
                                onClick={disable2FA}
                                disabled={loading}
                                className="text-xs font-bold text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
                              >
                                {loading ? '...' : 'Disable'}
                              </button>
                            </div>
                          ) : (
                            <div className="grid gap-3 max-w-md">
                              <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 group hover:border-neonCyan/30 transition-all cursor-pointer">
                                <div className="flex items-center gap-3 text-sm">
                                  <div className="p-2 rounded-lg bg-neonCyan/10 text-neonCyan"><Monitor size={16} /></div>
                                  <span>Authenticator App</span>
                                </div>
                                <div className="w-10 h-5 rounded-full bg-white/10 relative">
                                  <div className="absolute top-1 left-1 w-3 h-3 rounded-full bg-white/20" />
                                </div>
                              </div>
                              <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 group hover:border-neonCyan/30 transition-all cursor-pointer">
                                <div className="flex items-center gap-3 text-sm">
                                  <div className="p-2 rounded-lg bg-pulsingViolet/10 text-pulsingViolet"><Bell size={16} /></div>
                                  <span>Email Verification</span>
                                </div>
                                <div className="w-10 h-5 rounded-full bg-neonCyan/20 relative">
                                  <div className="absolute top-1 left-1 w-3 h-3 rounded-full bg-white/20" />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                        {!is2FAEnabled && !isConfiguring2FA && (
                          <button 
                            onClick={start2FASetup}
                            className="px-6 py-2 glass text-white hover:bg-white hover:text-black rounded-xl font-bold transition-all border border-white/10 hover:border-white whitespace-nowrap self-start"
                          >
                            Configure
                          </button>
                        )}
                        {isConfiguring2FA && (
                          <button 
                            onClick={() => setIsConfiguring2FA(false)}
                            className="text-white/40 hover:text-white transition-colors text-sm font-bold self-start mt-2"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'Notifications' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-12"
              >
                <div>
                  <h2 className="text-2xl font-bold mb-6">Email Preferences</h2>
                  <div className="glass border border-white/5 rounded-2xl p-8 space-y-6">
                    <label className="flex items-center justify-between cursor-pointer group">
                      <div>
                        <h4 className="font-bold mb-1">New Episode Alerts</h4>
                        <p className="text-sm text-white/50">Get notified when an anime on your watchlist airs a new episode.</p>
                      </div>
                      <div className={`w-12 h-6 rounded-full transition-colors relative ${notifications ? 'bg-neonCyan' : 'bg-white/20'}`} onClick={() => setNotifications(!notifications)}>
                        <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${notifications ? 'translate-x-6' : 'translate-x-0'}`} />
                      </div>
                    </label>
                  </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

