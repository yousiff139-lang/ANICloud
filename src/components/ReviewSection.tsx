'use client';

import { useState, useEffect } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, ThumbsUp, ThumbsDown, MessageSquare, AlertTriangle, Edit2, Lock, X, Check } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';

interface Review {
  id: string;
  rating: number;
  title: string | null;
  content: string;
  helpful: number;
  unhelpful: number;
  spoiler: boolean;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
  };
  votes: Array<{
    userId: string;
    isHelpful: boolean;
  }>;
}

interface ReviewSectionProps {
  animeId: number;
}

export default function ReviewSection({ animeId }: ReviewSectionProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const { canWriteReviews, subscription } = useSubscription();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [sortBy, setSortBy] = useState<'helpful' | 'recent'>('helpful');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReviews();
  }, [animeId, sortBy]);

  const loadReviews = async () => {
    try {
      const res = await fetch(`/api/reviews/${animeId}?sortBy=${sortBy}`);
      if (res.ok) {
        const data = await res.json();
        setReviews(data);
      }
    } catch (error) {
      console.error('Error loading reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <MessageSquare className="text-neonCyan" />
          Reviews
        </h2>
        <div className="flex items-center gap-4">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'helpful' | 'recent')}
            className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm"
          >
            <option value="helpful">Most Helpful</option>
            <option value="recent">Most Recent</option>
          </select>
          {session && (
            (
              <button
                onClick={() => setShowForm(!showForm)}
                className="group flex items-center gap-2 px-6 py-2.5 glass text-white hover:bg-white hover:text-black rounded-xl font-black text-xs uppercase tracking-widest transition-all border border-white/10 hover:border-white shadow-lg active:scale-95"
              >
                <Edit2 size={14} className="text-neonCyan group-hover:text-black transition-colors" />
                Write Review
              </button>
            )
          )}
        </div>
      </div>

      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowForm(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-xl"
            />
            <ReviewForm
              animeId={animeId}
              onSuccess={() => {
                setTimeout(() => setShowForm(false), 2000); // Wait for success animation
                loadReviews();
              }}
              onCancel={() => setShowForm(false)}
            />
          </div>
        )}
      </AnimatePresence>

      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-8 text-white/40">Loading reviews...</div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-12 glass rounded-xl border border-white/5">
            <MessageSquare className="mx-auto mb-4 text-white/20" size={48} />
            <p className="text-white/40">No reviews yet. Be the first to review!</p>
          </div>
        ) : (
          reviews.map((review) => (
            <ReviewCard key={review.id} review={review} onVote={loadReviews} />
          ))
        )}
      </div>
    </div>
  );
}

function ReviewForm({ animeId, onSuccess, onCancel }: { animeId: number; onSuccess: () => void; onCancel: () => void }) {
  const [rating, setRating] = useState(10);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [spoiler, setSpoiler] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const getRatingLabel = (r: number) => {
    if (r === 10) return "Masterpiece";
    if (r >= 9) return "Amazing";
    if (r >= 8) return "Great";
    if (r >= 7) return "Good";
    if (r >= 6) return "Fine";
    if (r >= 5) return "Average";
    if (r >= 4) return "Bad";
    if (r >= 3) return "Very Bad";
    if (r >= 2) return "Horrible";
    return "Appalling";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/reviews/${animeId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, title: title || null, content, spoiler })
      });

      if (res.ok) {
        setSubmitted(true);
        onSuccess();
      }
    } catch (error) {
      console.error('Error submitting review:', error);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 w-full max-w-lg glass-card p-12 text-center space-y-6 rounded-[3rem] border border-neonCyan/30 shadow-[0_0_50px_rgba(0,242,255,0.1)]"
      >
        <div className="w-24 h-24 bg-neonCyan/20 rounded-full flex items-center justify-center mx-auto text-neonCyan mb-4">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", damping: 10, stiffness: 100 }}
          >
            <ThumbsUp size={48} />
          </motion.div>
        </div>
        <h3 className="text-3xl font-black">Review Submitted!</h3>
        <p className="text-white/60">Your thoughts have been contributed to the community. Returning to anime page...</p>
      </motion.div>
    );
  }

  return (
    <motion.form
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 20 }}
      onSubmit={handleSubmit}
      className="relative z-10 w-full max-w-xl glass-card p-8 lg:p-10 border border-white/10 space-y-8 rounded-[3rem] shadow-2xl overflow-hidden"
    >
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-neonCyan via-pulsingViolet to-neonCyan animate-gradient-x" />
      
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-3xl font-black tracking-tight flex items-center gap-3">
          <Edit2 className="text-neonCyan" size={24} />
          Share Your Thoughts
        </h3>
        <button type="button" onClick={onCancel} className="p-2 hover:bg-white/10 rounded-full transition-colors">
          <X size={24} className="text-white/40" />
        </button>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between text-sm font-black uppercase tracking-widest text-white/40">
           <span>Rating</span>
           <span className="text-neonCyan">{getRatingLabel(rating)}</span>
        </div>
        <div className="flex items-center justify-between gap-1 p-4 bg-black/40 rounded-[2rem] border border-white/5">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
            <button
              key={num}
              type="button"
              onMouseEnter={() => !submitting && setRating(num)}
              onClick={() => setRating(num)}
              className={`flex-1 aspect-square rounded-xl flex items-center justify-center transition-all duration-300 relative group ${
                num <= rating ? 'text-neonCyan' : 'text-white/20'
              }`}
            >
              <Star 
                size={24} 
                className={`transition-all duration-500 ${num <= rating ? 'fill-neonCyan scale-110 drop-shadow-[0_0_8px_rgba(0,242,255,0.5)]' : 'group-hover:text-white/40'}`} 
              />
              {num === rating && (
                <motion.div layoutId="rating-glow" className="absolute inset-0 bg-neonCyan/10 blur-xl rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Give it a catchy title..."
          className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 outline-none focus:border-neonCyan transition-all text-lg font-bold placeholder:text-white/20"
        />
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="What did you love? What did you hate? Write it here..."
          rows={5}
          className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 outline-none focus:border-neonCyan transition-all text-white/70 placeholder:text-white/20 resize-none"
          required
        />
      </div>

      <div className="flex items-center justify-between">
        <label className="flex items-center gap-3 cursor-pointer group">
          <div className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-all ${spoiler ? 'bg-red-500 border-red-500' : 'border-white/20 group-hover:border-white/40'}`}>
            {spoiler && <Check size={14} className="text-white" />}
          </div>
          <input
            type="checkbox"
            checked={spoiler}
            onChange={(e) => setSpoiler(e.target.checked)}
            className="hidden"
          />
          <span className="text-sm font-bold text-white/60">Contains Spoilers</span>
        </label>
        
        <div className="flex gap-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-8 py-4 glass text-white/60 hover:text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all"
          >
            Discard
          </button>
          <button
            type="submit"
            disabled={submitting || !content.trim()}
            className="px-10 py-4 bg-white text-black hover:bg-neonCyan rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl disabled:opacity-20 disabled:cursor-not-allowed active:scale-95"
          >
            {submitting ? 'Sending...' : 'Post Review'}
          </button>
        </div>
      </div>
    </motion.form>
  );
}

function ReviewCard({ review, onVote }: { review: Review; onVote: () => void }) {
  const { data: session } = useSession();
  const [showSpoiler, setShowSpoiler] = useState(false);
  const [voting, setVoting] = useState(false);

  const userVote = session?.user ? review.votes.find(v => v.userId === (session.user as any).id) : null;

  const handleVote = async (isHelpful: boolean) => {
    if (!session || voting) return;

    setVoting(true);
    try {
      const res = await fetch('/api/reviews/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewId: review.id, isHelpful })
      });

      if (res.ok) {
        onVote();
      }
    } catch (error) {
      console.error('Error voting:', error);
    } finally {
      setVoting(false);
    }
  };

  return (
    <div className="glass rounded-xl p-6 border border-white/5 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex items-center gap-1">
              {Array.from({ length: 10 }).map((_, i) => (
                <Star
                  key={i}
                  size={14}
                  className={i < review.rating ? 'fill-neonCyan text-neonCyan' : 'text-white/20'}
                />
              ))}
            </div>
            <span className="text-sm font-bold text-neonCyan">{review.rating}/10</span>
          </div>
          {review.title && <h3 className="text-lg font-bold mb-1">{review.title}</h3>}
          <p className="text-sm text-white/40">
            by {review.user.name || 'Anonymous'} • {new Date(review.createdAt).toLocaleDateString()}
          </p>
        </div>
        {review.spoiler && (
          <div className="flex items-center gap-1 text-yellow-500 text-xs">
            <AlertTriangle size={14} />
            Spoiler
          </div>
        )}
      </div>

      {review.spoiler && !showSpoiler ? (
        <button
          onClick={() => setShowSpoiler(true)}
          className="w-full py-3 glass rounded-xl hover:bg-white/10 transition-all text-sm"
        >
          Show Spoiler
        </button>
      ) : (
        <p className="text-white/70 leading-relaxed">{review.content}</p>
      )}

      <div className="flex items-center gap-4 pt-2 border-t border-white/5">
        <button
          onClick={() => handleVote(true)}
          disabled={voting || !session}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${
            userVote?.isHelpful ? 'bg-neonCyan/20 text-neonCyan' : 'hover:bg-white/5'
          }`}
        >
          <ThumbsUp size={16} />
          <span className="text-sm font-bold">{review.helpful}</span>
        </button>
        <button
          onClick={() => handleVote(false)}
          disabled={voting || !session}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${
            userVote && !userVote.isHelpful ? 'bg-red-500/20 text-red-500' : 'hover:bg-white/5'
          }`}
        >
          <ThumbsDown size={16} />
          <span className="text-sm font-bold">{review.unhelpful}</span>
        </button>
      </div>
    </div>
  );
}
