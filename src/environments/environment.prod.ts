  /**
 * Production environment — swapped in for `environment.ts` at build time via
 * angular.json's `fileReplacements` (production configuration). This is the
 * ONLY file that needs editing before a production deploy — no service or
 * component should ever need to change.
 *
 * ACTION REQUIRED before deploying: replace SERVER_BASE below with the real
 * production API host (e.g. 'https://api.your-domain.com'), and update the
 * Reverb block to match the production REVERB_* values in the backend's .env.
 */
const SERVER_BASE = 'https://goldenperfumes.net/api';
const API_BASE = `${SERVER_BASE}/api`;

export const environment = {
  production: true,

  apiBaseUrl: API_BASE,
  assetBaseUrl: SERVER_BASE,
  storageBaseUrl: `${SERVER_BASE}/storage`,

  apiUrl: {
    auth:               `${API_BASE}/auth`,
    users:              `${API_BASE}/users`,
    categories:         `${API_BASE}/categories`,
    products:           `${API_BASE}/products`,
    orders:             `${API_BASE}/orders`,
    safe:               `${API_BASE}/safe`,
    currencies:         `${API_BASE}/currencies`,
    safeTypes:          `${API_BASE}/safe-types`,
    transactionReasons: `${API_BASE}/transaction-reasons`,
    safeManagement:     `${API_BASE}/safe-management`,
    paymentMethods:     `${API_BASE}/payment-methods`,
    conventions:        `${API_BASE}/conventions`,
    notifications:      `${API_BASE}/notifications`,
    managerBase:        `${API_BASE}/manager`,
    base:               API_BASE,
  },

  // Laravel Reverb (broadcasting) — must match the production backend's REVERB_* values.
  reverb: {
    key:     'mgypsyqghmxl8wjtpcmx',
    wsHost:  'https://goldenperfumes.net/api',
    wsPort:  443,
    scheme:  'https',
  },
};
