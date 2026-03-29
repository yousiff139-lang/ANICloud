'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Search, Bell, Settings, User, Compass, Library, History, Heart, Moon, Sun, LogIn, LogOut, Bookmark, Share2, MessageSquare } from 'lucide-react';
import { searchAnime, Anime } from '@/lib/api';
import NotificationsDropdown from './Notifications';
import AccountDropdown from './AccountDropdown';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [theme, setTheme] = useState('dark');
  
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);

  // Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Anime[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const { data: session, status } = useSession();

  // Search Logic
  useEffect(() => {
    const delayDebounce = setTimeout(async () => {
      if (searchQuery.length > 2) {
        const results = await searchAnime(searchQuery);
        setSearchResults(results.data || []);
        setIsSearchOpen(true);
      } else {
        setSearchResults([]);
        setIsSearchOpen(false);
      }
    }, 500);
    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  // Don't wrap login page with this layout
  if (pathname === '/login') return <>{children}</>;

  return (
    <div className={`flex min-h-screen ${theme === 'dark' ? 'text-white' : 'text-slate-900'} selection:bg-neonCyan/30 relative overflow-hidden`}>
      {/* Background Layer */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-40">
        <div className="absolute inset-0 bg-gradient-to-br from-pulsingViolet/5 via-transparent to-neonCyan/5" />
      </div>

      {/* Sidebar - Glassmorphism */}
      <motion.aside
        initial={false}
        animate={{ width: isSidebarOpen ? 260 : 80 }}
        className={`fixed left-0 top-0 h-full glass z-50 border-r ${theme === 'dark' ? 'border-white/5' : 'border-black/5'} backdrop-blur-3xl flex flex-col`}
      >
        <div className="p-6 flex items-center justify-between">
          <div 
            onClick={() => router.push('/')}
            className="flex items-center gap-3 cursor-pointer group outline-none"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-neonCyan to-pulsingViolet flex items-center justify-center shadow-lg group-hover:shadow-[0_0_15px_rgba(0,242,255,0.4)] transition-all">
              <Play className="w-5 h-5 fill-white text-white translate-x-0.5" />
            </div>
            {isSidebarOpen && (
              <span className={`font-outfit font-bold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r ${theme === 'dark' ? 'from-white to-white/60 group-hover:to-white' : 'from-black to-black/60 group-hover:to-black'} transition-all`}>
                ANICloud
              </span>
            )}
          </div>
          {isSidebarOpen && (
            <button onClick={(e) => { e.stopPropagation(); setIsSidebarOpen(false); }} className="text-white/20 hover:text-white transition-colors">
               <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            </button>
          )}
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-8">
          <SidebarItem icon={<Compass size={20} />} label="Browse" href="/browse" active={pathname.includes('/browse')} isOpen={isSidebarOpen} theme={theme} />
          <SidebarItem icon={<Bookmark size={20} />} label="Library" href="/library" active={pathname === '/library'} isOpen={isSidebarOpen} theme={theme} />
          <SidebarItem icon={<History size={20} />} label="Recent" href="/recent" active={pathname === '/recent'} isOpen={isSidebarOpen} theme={theme} />
          <SidebarItem icon={<Heart size={20} />} label="Favorites" href="/favorites" active={pathname === '/favorites'} isOpen={isSidebarOpen} theme={theme} />
          <SidebarItem icon={<MessageSquare size={20} />} label="Community" href="/community" active={pathname === '/community'} isOpen={isSidebarOpen} theme={theme} />
          <SidebarItem icon={<Share2 size={20} />} label="Social" href="/social" active={pathname === '/social'} isOpen={isSidebarOpen} theme={theme} />
        </nav>

        <div className="p-4 space-y-2 border-t border-white/5 mb-4">
          <SidebarItem icon={<Settings size={20} />} label="Settings" href="/settings" active={pathname === '/settings'} isOpen={isSidebarOpen} theme={theme} />
          <button 
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className={`flex items-center gap-4 w-full p-3 rounded-xl hover:bg-white/5 transition-all outline-none ${theme === 'dark' ? 'text-white/60' : 'text-black/60'} hover:text-neonCyan group`}
          >
            {theme === 'dark' ? <Sun size={20} className="group-hover:scale-110 transition-transform" /> : <Moon size={20} />}
            {isSidebarOpen && <span className="text-sm font-medium">Appearance</span>}
          </button>
        </div>
      </motion.aside>

      {/* Main Content Wrapper */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ${isSidebarOpen ? 'ml-[260px]' : 'ml-[80px]'}`}>
        {/* Global Header */}
        {!pathname.startsWith('/watch') && (
          <header className="sticky top-0 z-40 h-20 flex items-center justify-between px-8 bg-[#0B0E14]/80 backdrop-blur-md border-b border-white/5">
            <div className="flex items-center gap-6">
            {!isSidebarOpen && (
              <div 
                className="w-8 h-8 rounded-lg bg-gradient-to-tr from-neonCyan to-pulsingViolet flex items-center justify-center cursor-pointer shadow-lg hover:shadow-[0_0_15px_rgba(0,242,255,0.4)] transition-all"
                onClick={() => setIsSidebarOpen(true)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
              </div>
            )}
          </div>

          <div className="hidden lg:flex items-center gap-4">
            <div className="relative group w-[400px]">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-neonCyan transition-colors" size={20} />
              <input 
                type="text" 
                placeholder="Search anime..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-full py-2.5 pl-12 pr-4 w-full text-sm focus:outline-none focus:border-neonCyan focus:bg-white/10 transition-all placeholder:text-white/30 shadow-inner font-medium"
              />
              <AnimatePresence>
                {isSearchOpen && (
                  <>
                    <div className="fixed inset-0 z-40 mt-20" onClick={() => setIsSearchOpen(false)} />
                    <motion.div 
                      key="search-dropdown"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute top-full left-0 mt-3 w-full glass rounded-2xl border border-white/10 overflow-hidden shadow-2xl z-50 p-2 pointer-events-auto max-h-[70vh] overflow-y-auto custom-scrollbar"
                    >
                      {searchResults.length > 0 ? searchResults.map((anime) => (
                        <div 
                          key={anime.mal_id}
                          onClick={() => { router.push(`/anime/${anime.mal_id}`); setIsSearchOpen(false); setSearchQuery(''); }}
                          className="flex items-center gap-4 p-3 hover:bg-white/10 rounded-xl cursor-pointer group transition-all"
                        >
                          <img src={anime.images?.webp?.small_image_url || anime.images?.webp?.large_image_url} alt={anime.title} className="w-12 h-16 object-cover rounded-lg shadow-md group-hover:shadow-neonCyan/20" />
                          <div className="flex-1">
                            <h4 className="text-base font-bold group-hover:text-neonCyan transition-colors line-clamp-1">{anime.title}</h4>
                            <div className="flex gap-2 items-center mt-1">
                              <span className="text-xs text-neonCyan font-bold">{anime.score} Score</span>
                            </div>
                          </div>
                        </div>
                      )) : (
                        <div className="p-8 text-center text-white/40 text-sm">No anime found matching "{searchQuery}"</div>
                      )}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* Auth Buttons Area Moved */}
            
          </div>

          <div className="flex items-center gap-4">
            <div className="relative">
              <button 
                onClick={() => { setIsNotifOpen(!isNotifOpen); setIsAccountOpen(false); }}
                className={`p-2.5 rounded-full glass hover:bg-white/10 transition-all group relative outline-none ${isNotifOpen ? 'bg-white/10 border-neonCyan/30' : ''}`}
              >
                <Bell size={20} className={`${isNotifOpen ? 'text-neonCyan' : 'text-white/60 group-hover:text-neonCyan'}`} />
                <span className="absolute top-2 right-2 w-2 h-2 bg-neonCyan rounded-full border-2 border-[#0B0E14]" />
              </button>
              <NotificationsDropdown isOpen={isNotifOpen} onClose={() => setIsNotifOpen(false)} />
            </div>

            {session ? (
              <div className="relative border-l border-white/5 pl-4 ml-2 flex items-center gap-4">
                <Link href="/library" className="flex items-center gap-2 px-4 py-2 rounded-full glass hover:bg-white hover:text-black text-white font-bold text-sm transition-all border border-white/10 hover:border-white shadow-lg">
                  <Bookmark size={16} />
                  <span className="hidden xl:inline">My Library</span>
                </Link>
                  <div 
                  onClick={() => { setIsAccountOpen(!isAccountOpen); setIsNotifOpen(false); }}
                  className={`flex items-center gap-3 p-1.5 pr-4 rounded-full glass hover:bg-white/10 transition-all cursor-pointer border outline-none ${isAccountOpen ? 'border-neonCyan/30 bg-white/10' : 'border-white/10'}`}
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-neonCyan to-pulsingViolet flex items-center justify-center overflow-hidden border border-white/10 shadow-inner">
                    {session.user?.image ? (
                      <img src={session.user.image} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <User size={18} className="text-[#0B0E14] fill-current" />
                    )}
                  </div>
                  <span className="text-xs font-semibold text-white/80">{session.user?.name || 'Account'}</span>
                </div>
                <AccountDropdown isOpen={isAccountOpen} onClose={() => setIsAccountOpen(false)} />
              </div>
            ) : (
              <div className="flex items-center gap-3 border-l border-white/5 pl-4 ml-2">
                <Link href="/login" className="flex items-center gap-2 px-6 py-2 rounded-full glass text-white hover:bg-white hover:text-black font-black text-sm tracking-wide transition-all border border-white/10 hover:border-white shadow-lg whitespace-nowrap">
                   <LogIn size={16} />
                   Sign In
                </Link>
              </div>
            )}
          </div>
        </header>
        )}

        {/* Page Content */}
        <main className="flex-1 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}

function SidebarItem({ icon, label, href, active, isOpen, theme }: { icon: any, label: string, href: string, active: boolean, isOpen: boolean, theme: string }) {
  const router = useRouter();
  return (
    <button 
      onClick={() => router.push(href)}
      className={`flex items-center gap-4 w-full p-3 rounded-xl transition-all group outline-none ${active ? 'bg-gradient-to-r from-neonCyan/10 to-transparent text-neonCyan' : theme === 'dark' ? 'text-white/60 hover:text-white hover:bg-white/5' : 'text-black/60 hover:text-black hover:bg-black/5'}`}
    >
      <div className={`${active ? 'text-neonCyan' : 'group-hover:text-neonCyan'} transition-colors`}>
        {icon}
      </div>
      {isOpen && (
        <div className="flex-1 flex items-center justify-between">
          <span className="text-sm font-medium">{label}</span>
          {active && <div className="w-1 h-1 rounded-full bg-neonCyan shadow-[0_0_8px_#00F2FF]" />}
        </div>
      )}
    </button>
  );
}
