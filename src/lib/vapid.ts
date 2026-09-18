import webpush from 'web-push';

const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
const privateKey = process.env.VAPID_PRIVATE_KEY || '';

if (publicKey && privateKey) {
  try {
    webpush.setVapidDetails(
      'mailto:support@callngo.app',
      publicKey,
      privateKey
    );
  } catch (err) {
    console.warn('Web Push VAPID details initialization warning:', err);
  }
}

export { webpush };
