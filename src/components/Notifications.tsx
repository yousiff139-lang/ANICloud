'use client';

import { useState, useEffect, useCallback } from 'react';
import { Bell, X, Info, Settings, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

export default function NotificationsDropdown({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async (force = false) => {
    const isEnabled = localStorage.getItem('anicloud_notifications_enabled') !== 'false';
    setEnabled(isEnabled);
    
    if (!isEnabled) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      // If force refresh, skip cache check
      if (!force) {
        const cached = localStorage.getItem('anicloud_notifs_cache_v3');
        if (cached) {
          const { data, timestamp } = JSON.parse(cached);
          if (Date.now() - timestamp < 300000) {
            setNotifications(data);
            setLoading(false);
            return;
          }
        }
      }

      const nowUnix = Math.floor(Date.now() / 1000);
      const yesterdayUnix = nowUnix - 86400;

      const query = `
        query {
          Page(page: 1, perPage: 25) {
            airingSchedules(airingAt_greater: ${yesterdayUnix}, airingAt_lesser: ${nowUnix}, sort: TIME_DESC) {
              episode
              media {
                idMal
                title {
                  english
                  romaji
                }
                coverImage {
                  large
                }
              }
            }
          }
        }
      `;

      const res = await fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ query })
      });
      const json = await res.json();
      
      if (json.data && json.data.Page && json.data.Page.airingSchedules) {
        const mapped = json.data.Page.airingSchedules
          .filter((item: any) => item.media && item.media.idMal)
          .map((item: any) => ({
            id: `${item.media.idMal}-${item.episode}`,
            malId: item.media.idMal,
            epId: item.episode,
            title: 'New Episode Aired',
            description: `${item.media.title.english || item.media.title.romaji} - Episode ${item.episode}`,
            image: item.media.coverImage?.large,
            time: 'Today',
            type: 'new'
          }));
        
        setNotifications(mapped);
        localStorage.setItem('anicloud_notifs_cache_v3', JSON.stringify({
          data: mapped,
          timestamp: Date.now()
        }));
      }
    } catch (e) {
      console.error("Notifs fetch failed", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, fetchNotifications]);

  useEffect(() => {
    const handleStorage = () => {
      const isEnabled = localStorage.getItem('anicloud_notifications_enabled') !== 'false';
      setEnabled(isEnabled);
      if (isEnabled && notifications.length === 0 && isOpen) {
        setLoading(true);
        fetchNotifications();
      }
    };
    
    window.addEventListener('storage', handleStorage);
    window.addEventListener('anicloud:notifs_changed', handleStorage);
    
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('anicloud:notifs_changed', handleStorage);
    };
  }, [isOpen]);

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
            className="absolute right-0 top-full mt-2 w-96 glass border border-white/5 rounded-3xl overflow-hidden z-50 shadow-2xl"
          >
          <div className="p-4 flex items-center justify-between border-b border-white/5 bg-[#0B0E14]/50">
            <h3 className="font-bold flex items-center gap-2">
              <Bell size={18} className="text-neonCyan" />
              Notifications
            </h3>
            <div className="flex items-center gap-2">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  fetchNotifications(true);
                }} 
                disabled={loading || !enabled}
                className={`p-2 hover:bg-white/10 rounded-lg transition-all ${
                  loading ? 'cursor-not-allowed' : 'cursor-pointer'
                } ${!enabled ? 'opacity-30' : ''}`}
                title="Refresh Episodes"
              >
                <RefreshCw size={16} className={`${loading ? 'animate-spin text-neonCyan' : 'text-white/60 hover:text-neonCyan'}`} />
              </button>
              <button 
                onClick={onClose} 
                className="p-2 hover:bg-white/10 rounded-lg transition-all text-white/40 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>
          </div>
          <div className="max-h-[400px] overflow-y-auto custom-scrollbar relative">
            {!enabled ? (
              <div className="p-8 text-center flex flex-col items-center">
                <Bell size={32} className="text-white/20 mb-4" />
                <p className="text-sm font-bold text-white/60 mb-2">Alerts are Disabled</p>
                <p className="text-xs text-white/40 mb-6">You can turn on daily episode alerts from your Account settings.</p>
              </div>
            ) : loading ? (
              <div className="p-8 flex justify-center">
                <div className="w-6 h-6 border-2 border-neonCyan border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : notifications.length > 0 ? (
              notifications.map((notif) => (
                <Link key={notif.id} href={`/watch/${notif.malId}/${notif.epId}`} onClick={onClose}>
                  <div className="p-4 hover:bg-white/5 transition-all cursor-pointer border-b border-white/5 group flex gap-4 items-start">
                    {notif.image ? (
                      <img src={notif.image} alt={notif.title} className="w-12 h-16 object-cover rounded-md shadow-md bg-black" />
                    ) : (
                      <div className="w-12 h-16 rounded-md bg-white/5 flex items-center justify-center">
                        <Info size={16} className="text-neonCyan" />
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-1">
                         <h4 className="text-sm font-bold group-hover:text-neonCyan transition-colors leading-tight">{notif.title}</h4>
                         <span className="text-[10px] text-neonCyan font-black uppercase tracking-widest whitespace-nowrap bg-neonCyan/10 px-1.5 py-0.5 rounded">{notif.time}</span>
                      </div>
                      <p className="text-xs text-white/50 leading-relaxed font-semibold mt-1">{notif.description}</p>
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <div className="p-8 text-center text-white/40 text-sm">No new episodes today.</div>
            )}
          </div>
          {enabled && (
            <div className="p-4 text-center border-t border-white/5 bg-[#0B0E14]">
              <span className="text-[10px] font-black tracking-widest uppercase text-white/40">Only tracking releases within 24 hours</span>
            </div>
          )}
        </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
