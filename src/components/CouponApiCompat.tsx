import { useEffect } from 'react';

/** Keeps the checkout compatible with the single existing coupons serverless function. */
export const CouponApiCompat = () => {
  useEffect(() => {
    const originalFetch = window.fetch.bind(window);

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

      const trackingMatch = url.match(/\/api\/orders\/([^/?]+)\/tracking(?:\?.*)?$/);
      if (trackingMatch) {
        const method = String(init?.method || 'GET').toUpperCase();
        const orderId = decodeURIComponent(trackingMatch[1]);
        let payload: any = {};
        if (method !== 'DELETE') {
          try { payload = JSON.parse(String(init?.body || '{}')); } catch {}
          payload = { ...payload, orderId };
        } else {
          payload = { orderId, remove: true };
        }
        const headers = new Headers(init?.headers || {});
        headers.set('Content-Type', 'application/json');
        return originalFetch('/api/order-status?action=tracking', { ...init, method: 'POST', headers, body: JSON.stringify(payload) });
      }

      if (url.includes('/api/coupons/validate')) {
        const target = `/api/coupons?action=validate${url.includes('?') ? `&${url.split('?')[1].replace(/^.*?&/, '')}` : ''}`;
        return originalFetch(target, init);
      }

      if (url.includes('/api/orders') && init?.method?.toUpperCase() === 'POST') {
        const promoCode = localStorage.getItem('luvia_cart_promo');
        if (promoCode) {
          try {
            const body = JSON.parse(String(init.body || '{}'));
            if (!body.couponCode) {
              body.couponCode = promoCode;
              init = { ...init, body: JSON.stringify(body) };
            }
          } catch {}
        }
      }

      return originalFetch(input, init);
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  return null;
};
