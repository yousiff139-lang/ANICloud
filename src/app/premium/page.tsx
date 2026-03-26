'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  Crown, Check, Zap, Shield, Download, 
  Users, Star, TrendingUp, X 
} from 'lucide-react';

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    period: 'forever',
    description: 'Watch anime and have fun!',
    features: [
      'Watch unlimited anime',
      'Standard quality (720p)',
      'Basic anime discovery',
      'Save to library',
      'Track watch history',
      'Community reviews (read only)'
    ],
    limitations: [
      'Limited to 720p quality',
      'Ads before episodes',
      'No downloads',
      'No watch parties',
      'No AI recommendations',
      'Cannot write reviews'
    ],
    color: 'from-gray-500 to-gray-600'
  },
  {
    id: 'basic',
    name: 'Basic',
    price: 4.99,
    period: 'month',
    description: 'Enhanced viewing experience',
    popular: true,
    features: [
      'Everything in Free',
      'Ad-free experience',
      'Full HD quality (1080p)',
      'Download for offline viewing (5 per month)',
      'Write and vote on reviews',
      'Basic AI recommendations',
      'Priority support',
      'Custom profile themes'
    ],
    color: 'from-blue-500 to-cyan-500'
  },
  {
    id: 'ultimate',
    name: 'Ultimate',
    price: 9.99,
    period: 'month',
    description: 'Complete social anime experience',
    features: [
      'Everything in Basic',
      '4K Ultra HD quality',
      'Unlimited downloads',
      'Watch parties with friends',
      'Live chat during watch parties',
      'Advanced AI recommendations',
      'Analytics dashboard',
      'Seasonal calendar',
      'Advanced discovery filters',
      'Early access to new features',
      'Custom badges & achievements',
      '24/7 premium support',
      'No ads ever'
    ],
    color: 'from-yellow-500 to-orange-500'
  }
];

export default function PremiumPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  // Handle dynamic plan detection from session
  const currentPlanId = (session?.user as any)?.plan || 'free';

  const handleSubscribe = async (planId: string) => {
    if (!session) {
      router.push('/login');
      return;
    }
    
    // Free tier redirects directly to home (as requested: "fruitier who will be redirected to the homepage")
    if (planId === 'free') {
      window.location.href = '/';
      return;
    }

    // Basic and Ultimate tiers go to the new premium checkout page
    router.push(`/checkout?plan=${planId}&billing=${billingCycle}`);
  };

  const getPrice = (plan: typeof PLANS[0]) => {
    if (plan.price === 0) return 'Free';
    
    const price = billingCycle === 'yearly' ? plan.price * 10 : plan.price;
    return `$${price.toFixed(2)}`;
  };

  return (
    <div className="min-h-screen bg-[#0B0E14] text-white pb-20">
      <div className="max-w-7xl mx-auto px-8 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-neonCyan/20 to-pulsingViolet/20 border border-neonCyan/30 mb-6"
          >
            <Crown className="text-neonCyan" size={20} />
            <span className="text-sm font-bold">Upgrade to Premium</span>
          </motion.div>
          
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-6xl font-bold mb-4"
          >
            Unlock the Full Experience
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl text-white/60 max-w-2xl mx-auto"
          >
            Get ad-free streaming, HD quality, offline downloads, and exclusive features
          </motion.p>
        </div>

        {/* Billing Toggle (Morphing Design) */}
        <div className="flex items-center justify-center gap-4 mb-20">
          <div className="glass p-1 rounded-2xl flex items-center relative">
            {['monthly', 'yearly'].map((period) => (
              <button
                key={period}
                onClick={() => setBillingCycle(period as 'monthly' | 'yearly')}
                className={`relative px-8 py-3.5 rounded-xl font-black text-sm uppercase tracking-widest transition-all duration-300 min-w-[140px] ${
                  billingCycle === period ? 'text-white' : 'text-white/40 hover:text-white/70'
                }`}
              >
                <span className="relative z-10 drop-shadow-[0_0_8px_rgba(0,0,0,0.5)]">
                  {period}
                </span>
                
                {billingCycle === period && (
                  <motion.div
                    layoutId="billingHighlight"
                    className="absolute inset-1 bg-neonCyan rounded-xl shadow-[0_0_20px_rgba(0,242,255,0.3)] z-0"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}

                {period === 'yearly' && (
                  <span className={`absolute -top-4 -right-4 px-2 py-1 bg-green-500 text-white text-[10px] font-black rounded-lg shadow-xl shadow-green-500/20 transition-all duration-500 z-20 ${
                    billingCycle === 'yearly' ? 'scale-110 rotate-3' : 'scale-90 opacity-60 grayscale-[0.5]'
                  }`}>
                    -20%
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Plans Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {PLANS.map((plan, idx) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className={`relative flex flex-col rounded-3xl p-8 border transition-all duration-500 ${
                plan.popular
                  ? 'border-neonCyan bg-gradient-to-br from-neonCyan/10 via-background to-pulsingViolet/10 scale-105 z-10 shadow-2xl shadow-neonCyan/20'
                  : 'border-white/10 glass hover:border-white/20'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-6 py-1.5 bg-gradient-to-r from-neonCyan via-pulsingViolet to-neonCyan bg-[length:200%_auto] animate-gradient-x rounded-full text-[10px] uppercase tracking-[0.2em] font-black shadow-xl shadow-neonCyan/20 z-20">
                  Most Popular
                </div>
              )}

              <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${plan.color} flex items-center justify-center mb-6`}>
                {plan.id === 'free' ? <Star size={32} /> :
                 plan.id === 'basic' ? <Zap size={32} /> :
                 <Crown size={32} />}
              </div>

              <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
              <p className="text-white/60 text-sm mb-6">{plan.description}</p>

              <div className="mb-6">
                <span className="text-5xl font-bold">{getPrice(plan)}</span>
                {plan.price > 0 && (
                  <span className="text-white/60">/{billingCycle === 'yearly' ? 'year' : 'month'}</span>
                )}
              </div>

              <button
                onClick={() => handleSubscribe(plan.id)}
                disabled={selectedPlan === plan.id}
                className={`w-full py-4 rounded-xl font-bold transition-all mb-6 relative group overflow-hidden ${
                  plan.popular
                    ? 'bg-neon-cyan text-black hover:scale-105 shadow-[0_0_25px_rgba(0,242,255,0.4)]'
                    : 'glass hover:bg-white/10 text-white'
                }`}
              >
                {/* Unified Highlight Line-up - Increased visibility for popular button */}
                <div className={`absolute inset-0 border-t transition-opacity pointer-events-none ${
                  plan.popular ? 'border-white/60 opacity-100' : 'border-white/20 opacity-0 group-hover:opacity-100'
                }`} />
                
                <span className="relative z-10">
                  {plan.id === currentPlanId ? 'Current Plan' : 
                   selectedPlan === plan.id ? 'Processing...' : 
                   'Subscribe Now'}
                </span>
                
                {/* Glow Overlay for Popular */}
                {plan.popular && (
                  <div className="absolute inset-0 bg-white/15 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                )}
              </button>

              <div className="space-y-4 flex-grow">
                {plan.features.map((feature, i) => (
                  <div key={i} className="flex items-start gap-3 group/feature">
                    <div className="mt-1 w-5 h-5 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0 group-hover/feature:bg-green-500/20 transition-colors">
                      <Check size={12} className="text-green-400" />
                    </div>
                    <span className="text-sm text-white/80 group-hover/feature:text-white transition-colors">{feature}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Features Comparison */}
        <div className="glass rounded-2xl p-8 border border-white/10 mb-16">
          <h2 className="text-3xl font-bold mb-8 text-center">Feature Comparison</h2>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-4 px-4">Feature</th>
                  <th className="text-center py-4 px-4">Free</th>
                  <th className="text-center py-4 px-4">Basic</th>
                  <th className="text-center py-4 px-4">Ultimate</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { feature: 'Video Quality', free: '720p', basic: '1080p', ultimate: '4K' },
                  { feature: 'No Ads', free: <X className="text-red-500/50" size={18} />, basic: <Check className="text-green-400" size={18} />, ultimate: <Check className="text-green-400" size={18} /> },
                  { feature: 'Downloads', free: <X className="text-red-500/50" size={18} />, basic: '5/month', ultimate: 'Unlimited' },
                  { feature: 'Watch Parties', free: <X className="text-red-500/50" size={18} />, basic: <X className="text-red-500/50" size={18} />, ultimate: <Check className="text-green-400" size={18} /> },
                  { feature: 'Write Reviews', free: <X className="text-red-500/50" size={18} />, basic: <Check className="text-green-400" size={18} />, ultimate: <Check className="text-green-400" size={18} /> },
                  { feature: 'AI Recommendations', free: <X className="text-red-500/50" size={18} />, basic: 'Basic', ultimate: 'Advanced' },
                  { feature: 'Analytics Dashboard', free: <X className="text-red-500/50" size={18} />, basic: <X className="text-red-500/50" size={18} />, ultimate: <Check className="text-green-400" size={18} /> },
                  { feature: 'Support', free: 'Community', basic: 'Priority', ultimate: '24/7 VIP' }
                ].map((row, idx) => (
                  <tr key={idx} className="border-b border-white/5 hover:bg-white/2 transition-colors group">
                    <td className="py-6 px-6 font-medium text-white/80 group-hover:text-white transition-colors">{row.feature}</td>
                    <td className="py-6 px-6 text-center">
                      <div className="flex justify-center items-center h-full w-full min-h-[1.5rem]">{row.free}</div>
                    </td>
                    <td className="py-6 px-6 text-center">
                      <div className="flex justify-center items-center h-full w-full min-h-[1.5rem] font-bold text-neonCyan/80">{row.basic}</div>
                    </td>
                    <td className="py-6 px-6 text-center">
                      <div className="flex justify-center items-center h-full w-full min-h-[1.5rem] font-bold text-pulsingViolet">{row.ultimate}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ */}
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold mb-8 text-center">Frequently Asked Questions</h2>
          
          <div className="space-y-4">
            {[
              {
                q: 'Can I cancel anytime?',
                a: 'Yes! You can cancel your subscription at any time. Your premium features will remain active until the end of your billing period.'
              },
              {
                q: 'What payment methods do you accept?',
                a: 'We accept all major credit cards, PayPal, and various local payment methods depending on your region.'
              },
              {
                q: 'Can I switch plans?',
                a: 'Absolutely! You can upgrade or downgrade your plan at any time. Changes take effect immediately for upgrades, or at the next billing cycle for downgrades.'
              },
              {
                q: 'Is there a free trial?',
                a: 'Yes! New users get a 7-day free trial of Premium to experience all the features before committing.'
              }
            ].map((faq, idx) => (
              <div key={idx} className="glass rounded-xl p-6 border border-white/10">
                <h3 className="font-bold mb-2">{faq.q}</h3>
                <p className="text-white/60 text-sm">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
