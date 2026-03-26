'use client';

import { useEffect, useState } from 'react';

interface Subscription {
  plan: 'free' | 'basic' | 'ultimate';
  status: string;
}

export function useSubscription() {
  const [subscription, setSubscription] = useState<Subscription>({
    plan: 'free',
    status: 'active'
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSubscription();
  }, []);

  const fetchSubscription = async () => {
    try {
      const res = await fetch('/api/subscription/status');
      const data = await res.json();
      setSubscription(data);
    } catch (error) {
      console.error('Error fetching subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  // All features are now accessible to everyone logged in
  // guest plan is 'free', logged-in plan is 'ultimate' (via status API)
  const hasFeature = (feature: string): boolean => {
    return subscription.plan === 'ultimate' || [
      'watch', 'library', 'history', 'read_reviews'
    ].includes(feature);
  };

  const canAccessWatchParties = () => true; // accessible to all
  const canWriteReviews = () => true;      // accessible to all
  const canAccessAnalytics = () => true;   // accessible to all
  const canDownload = () => true;          // accessible to all
  const hasNoAds = () => false;            // NO ONE has 'no_ads' anymore, ads are for everyone!
  const canAccess4K = () => true;          // accessible to all

  return {
    subscription,
    loading,
    hasFeature,
    canAccessWatchParties,
    canWriteReviews,
    canAccessAnalytics,
    canDownload,
    hasNoAds, // This will be false for everyone now
    canAccess4K,
    isPremium: true,
    isUltimate: true,
    isBasic: false
  };
}
