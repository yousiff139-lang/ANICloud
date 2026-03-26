'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { User, LogOut, Shield, Zap, CreditCard, Bell, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AccountDropdown({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const router = useRouter();
  const { data: session } = useSession();
  const [notifsEnabled, setNotifsEnabled] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setNotifsEnabled(localStorage.getItem('anicloud_notifications_enabled') !== 'false');
    }
  }, [isOpen]);

  const toggleNotifs = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newVal = !notifsEnabled;
    setNotifsEnabled(newVal);
    localStorage.setItem('anicloud_notifications_enabled', newVal ? 'true' : 'false');
    window.dispatchEvent(new Event('anicloud:notifs_changed'));
  };

  const handleNavigation = (path: string) => {
    onClose();
    router.push(path);
  };

  const handleSignOut = async () => {
    onClose();
    await signOut({ callbackUrl: '/login' });
  };
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop to close dropdown */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={onClose}
          />
          <motion.div 
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute right-0 top-full mt-2 w-64 glass border border-white/5 rounded-3xl overflow-hidden z-50 shadow-2xl"
          >
          <div className="p-6 bg-gradient-to-br from-neonCyan/10 to-transparent">
             <div className="w-12 h-12 rounded-full bg-pulsingViolet flex items-center justify-center mb-3 overflow-hidden border border-white/10 shadow-inner">
               {session?.user?.image ? (
                 <img src={session.user.image} alt="Avatar" className="w-full h-full object-cover" />
               ) : (
                 <User size={24} className="text-white" />
               )}
             </div>
             <h3 className="font-bold text-lg">{session?.user?.name || 'User'}</h3>
             <p className="text-xs text-white/60">{session?.user?.email}</p>
          </div>

          <div className="p-2 pb-0 border-b border-white/5">
             <div className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-all group cursor-pointer mb-2" onClick={toggleNotifs}>
                <div className="flex items-center gap-3 text-white/60 group-hover:text-white transition-all">
                   <div className="text-white/20 group-hover:text-neonCyan transition-all"><Bell size={18} /></div>
                   <span className="text-sm font-medium">Alert Notifications</span>
                </div>
                {/* Visual Toggle Switch */}
                <div className={`w-10 h-5 rounded-full relative transition-colors duration-300 shadow-inner overflow-hidden ${notifsEnabled ? 'bg-neonCyan/80' : 'bg-white/10'}`}>
                   <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-md transition-all duration-300 ${notifsEnabled ? 'left-[22px]' : 'left-0.5'}`} />
                </div>
             </div>
          </div>

          <div className="p-2">
            <AccountItem icon={<User size={18} />} label="Profile" onClick={() => handleNavigation('/profile')} />
            <AccountItem icon={<Settings size={18} />} label="Settings" onClick={() => handleNavigation('/settings')} />
          </div>

          <div className="p-2 border-t border-white/5">
            <button 
              onClick={handleSignOut}
              className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-white/5 transition-all text-red-500 hover:text-red-400 group"
            >
              <LogOut size={18} />
              <span className="text-sm font-bold">Sign Out</span>
            </button>
          </div>
        </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function AccountItem({ icon, label, onClick }: { icon: any, label: string, onClick?: () => void }) {
  return (
     <button 
       onClick={onClick}
       className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-white/5 transition-all text-white/60 hover:text-white group"
     >
        <div className="text-white/20 group-hover:text-neonCyan transition-all">{icon}</div>
        <span className="text-sm font-medium">{label}</span>
     </button>
  );
}
