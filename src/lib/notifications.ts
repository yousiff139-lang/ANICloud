// Push Notification Manager for ANICloud

export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    console.log('This browser does not support notifications');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
}

export async function subscribeToNotifications(): Promise<PushSubscription | null> {
  try {
    const permission = await requestNotificationPermission();
    if (!permission) {
      return null;
    }

    const registration = await navigator.serviceWorker.ready;
    
    // Check if already subscribed
    let subscription = await registration.pushManager.getSubscription();
    
    if (!subscription) {
      // Subscribe to push notifications
      // Note: You'll need to generate VAPID keys for production
      // Use: npx web-push generate-vapid-keys
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''
        ) as BufferSource
      });
    }

    // Send subscription to server
    await fetch('/api/notifications/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subscription)
    });

    return subscription;
  } catch (error) {
    console.error('Error subscribing to notifications:', error);
    return null;
  }
}

export async function unsubscribeFromNotifications(): Promise<boolean> {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    if (subscription) {
      await subscription.unsubscribe();
      
      // Notify server
      await fetch('/api/notifications/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: subscription.endpoint })
      });
      
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error unsubscribing from notifications:', error);
    return false;
  }
}

export function showLocalNotification(title: string, options?: NotificationOptions) {
  if (Notification.permission === 'granted') {
    new Notification(title, {
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      ...options
    });
  }
}

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Notification types
export const NotificationTypes = {
  NEW_EPISODE: 'new_episode',
  WATCH_PARTY_INVITE: 'watch_party_invite',
  REVIEW_REPLY: 'review_reply',
  RECOMMENDATION: 'recommendation'
};

// Schedule notification for new episode
export async function scheduleEpisodeNotification(animeId: number, episodeNumber: number, airDate: Date) {
  try {
    await fetch('/api/notifications/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: NotificationTypes.NEW_EPISODE,
        animeId,
        episodeNumber,
        scheduledFor: airDate.toISOString()
      })
    });
  } catch (error) {
    console.error('Error scheduling notification:', error);
  }
}
