'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Heart, Image as ImageIcon, Send, Film, Clock, User, Ghost, EyeOff, MessageCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Post {
  id: string;
  content: string;
  image?: string;
  animeId?: number;
  episode?: number;
  isSpoiler: boolean;
  createdAt: string;
  user: {
    id: string;
    name: string;
    profile?: { avatar?: string };
  };
  _count: {
    comments: number;
    likes: number;
  }
}

export default function CommunityPage() {
  const { data: session } = useSession();
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPost, setNewPost] = useState('');
  const [isSpoiler, setIsSpoiler] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchPosts();
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore && !loading && !loadingMore && Array.isArray(posts) && posts.length > 0) {
        fetchPosts(true);
      }
    }, { threshold: 1.0 });

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore, posts]);

  const fetchPosts = async (isLoadMore = false) => {
    if (isLoadMore) setLoadingMore(true);
    else setLoading(true);

    try {
      const cursorParam = isLoadMore && posts.length > 0 ? `?cursor=${posts[posts.length - 1].id}&limit=10` : '?limit=10';
      const res = await fetch(`/api/community${cursorParam}`);
      const data = await res.json();
      
      if (Array.isArray(data)) {
         if (data.length < 10) setHasMore(false);
         setPosts(isLoadMore ? [...posts, ...data] : data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handlePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPost.trim() || !session) return;

    try {
      const res = await fetch('/api/community', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
           content: newPost,
           isSpoiler
        })
      });

      if (res.ok) {
        const post = await res.json();
        setPosts([post, ...posts]);
        setNewPost('');
        setIsSpoiler(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0E14] text-white pt-24 pb-12 px-6">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="text-center space-y-4 mb-12">
          <h1 className="text-5xl font-outfit font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-neonCyan to-pulsingViolet">
            ANICloud Hub
          </h1>
          <p className="text-white/60 font-medium max-w-lg mx-auto">
            The global timeline for anime fans. Discuss recent episodes, share theories, and connect with the community.
          </p>
        </div>

        {/* Create Post */}
        {session ? (
          <div className="glass rounded-[2rem] p-6 border border-white/10 shadow-xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-neonCyan/5 to-transparent pointer-events-none" />
            <form onSubmit={handlePostSubmit} className="relative z-10 flex gap-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-neonCyan to-pulsingViolet flex-shrink-0 flex items-center justify-center font-bold text-lg overflow-hidden border-2 border-white/10">
                {session?.user?.image ? (
                  <img src={session.user.image} alt="User" className="w-full h-full object-cover" />
                ) : (
                  session.user?.name?.charAt(0).toUpperCase()
                )}
              </div>
              <div className="flex-1 space-y-4">
                <textarea
                  value={newPost}
                  onChange={(e) => setNewPost(e.target.value)}
                  placeholder="What's happening in the anime world?"
                  className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 text-white placeholder-white/40 focus:outline-none focus:border-neonCyan transition-all resize-none min-h-[120px] font-medium"
                />
                
                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    <button type="button" className="p-2 hover:bg-white/10 rounded-xl transition-all text-neonCyan tooltip" title="Attach Image">
                      <ImageIcon size={20} />
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setIsSpoiler(!isSpoiler)}
                      className={`p-2 rounded-xl transition-all flex items-center gap-2 text-xs font-bold uppercase tracking-wider border ${isSpoiler ? 'bg-red-500/20 text-red-400 border-red-500/40' : 'hover:bg-white/10 text-white/40 border-transparent'}`}
                    >
                      {isSpoiler ? <EyeOff size={16} /> : <Ghost size={16} />}
                      {isSpoiler ? 'Spoiler Tagged' : 'Spoiler Tag'}
                    </button>
                  </div>
                  
                  <button 
                    type="submit"
                    disabled={!newPost.trim()}
                    className="px-6 py-2.5 bg-white text-black font-black text-xs uppercase tracking-[0.2em] rounded-xl hover:bg-neonCyan transition-all disabled:opacity-50 flex items-center gap-2 transform active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_20px_rgba(0,242,255,0.4)]"
                  >
                    Post <Send size={14} />
                  </button>
                </div>
              </div>
            </form>
          </div>
        ) : (
          <div className="glass rounded-[2rem] p-8 text-center border border-white/10 border-dashed">
            <h3 className="text-xl font-bold mb-2">Join the Conversation</h3>
            <p className="text-white/40 mb-4 text-sm">Sign in to share your thoughts with the community.</p>
            <a href="/login" className="px-8 py-3 bg-neonCyan text-black font-bold uppercase tracking-widest text-xs rounded-xl hover:bg-white transition-all inline-block shadow-lg">Sign In</a>
          </div>
        )}

        {/* Feed */}
        <div className="space-y-6">
          {loading ? (
             <div className="flex justify-center p-12">
               <div className="w-8 h-8 border-4 border-neonCyan border-t-transparent rounded-full animate-spin" />
             </div>
          ) : !Array.isArray(posts) ? (
             <div className="text-center p-12 text-red-400 bg-red-500/10 rounded-2xl border border-red-500/20">
               Failed to load posts. {(posts as any)?.error || 'An unexpected error occurred.'}
             </div>
          ) : posts.length === 0 ? (
             <div className="text-center p-12 text-white/40 italic">
               No posts yet. Be the first to start the discussion!
             </div>
          ) : (
            <>
              {posts.map(post => <PostCard key={post.id} post={post} />)}
              
              {/* Infinite Scroll Trigger */}
              {hasMore && (
                <div ref={loadMoreRef} className="flex justify-center p-8">
                  {loadingMore && <div className="w-8 h-8 border-4 border-neonCyan border-t-transparent rounded-full animate-spin" />}
                </div>
              )}
              {!hasMore && posts.length > 0 && (
                <div className="text-center text-white/30 text-xs uppercase tracking-widest font-bold py-12">
                   You've reached the end of the timeline
                </div>
              )}
            </>
          )}
        </div>

      </div>
    </div>
  );
}

function PostCard({ post }: { post: Post }) {
  const [revealed, setRevealed] = useState(!post.isSpoiler);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-3xl p-6 border border-white/5 hover:border-white/10 transition-colors shadow-lg group relative"
    >
      <div className="flex gap-4">
        {/* Avatar */}
        <div className="w-12 h-12 rounded-full bg-black flex-shrink-0 flex items-center justify-center font-bold overflow-hidden border border-white/10">
          {post.user.profile?.avatar ? (
             <img src={post.user.profile.avatar} alt="User" className="w-full h-full object-cover" />
          ) : (
             post.user.name.charAt(0).toUpperCase()
          )}
        </div>

        {/* Content Box */}
        <div className="flex-1 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-bold text-white hover:underline cursor-pointer">{post.user.name}</span>
              <span className="text-white/40 text-xs flex items-center gap-1"><Clock size={12} /> {formatDistanceToNow(new Date(post.createdAt))} ago</span>
            </div>
            {post.animeId && (
              <span className="px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-bold bg-pulsingViolet/20 text-pulsingViolet border border-pulsingViolet/30 hidden md:inline-flex items-center gap-1">
                 <Film size={10} /> Anime Thread
              </span>
            )}
          </div>

          {!revealed ? (
            <div 
              onClick={() => setRevealed(true)}
              className="bg-black/60 border border-white/10 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-black/80 hover:border-neonCyan transition-all group/shield backdrop-blur-md"
            >
               <EyeOff size={32} className="text-white/30 mb-2 group-hover/shield:text-neonCyan transition-colors" />
               <span className="text-sm font-bold text-white/50 group-hover/shield:text-white uppercase tracking-widest">Contains Spoilers • Click to Reveal</span>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-white/90 leading-relaxed break-words whitespace-pre-wrap">
                {post.content}
              </p>
              {post.image && (
                <div className="rounded-2xl overflow-hidden border border-white/10">
                   <img src={post.image} alt="Attached" className="w-full h-auto object-cover max-h-96" />
                </div>
              )}
            </div>
          )}

          {/* Social Actions */}
          <div className="flex items-center gap-6 pt-3 mt-4 border-t border-white/5">
             <button className="flex items-center gap-2 text-white/40 hover:text-neonCyan transition-colors text-sm font-medium group/btn">
                <div className="p-2 rounded-full group-hover/btn:bg-neonCyan/10 transition-colors">
                  <MessageCircle size={18} />
                </div>
                <span>{post._count.comments}</span>
             </button>
             <button className="flex items-center gap-2 text-white/40 hover:text-red-400 transition-colors text-sm font-medium group/btn">
                <div className="p-2 rounded-full group-hover/btn:bg-red-400/10 transition-colors">
                  <Heart size={18} />
                </div>
                <span>{post._count.likes}</span>
             </button>
             
             {post.isSpoiler && revealed && (
                <button onClick={() => setRevealed(false)} className="ml-auto text-xs text-white/20 hover:text-white/50 uppercase tracking-widest font-bold">Hide Spoiler</button>
             )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
