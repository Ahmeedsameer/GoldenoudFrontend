/**
 * Local/development environment — the ONLY place that should ever contain a
 * server hostname/port. Every service reads from `environment` instead of
 * hardcoding a URL. Swapped out for `environment.prod.ts` in production
 * builds via angular.json's `fileReplacements` (production configuration).
 */
const SERVER_BASE = 'http://127.0.0.1:8000';
const API_BASE = `${SERVER_BASE}/api`;

export const environment = {
  production: false,

  /** Base for every REST endpoint — services append their own sub-path. */
  apiBaseUrl: API_BASE,

  /** Base for the backend host itself (no /api suffix) — used to build
   *  non-API absolute URLs (uploads, downloads) when a full URL isn't
   *  already returned by an API response. */
  assetBaseUrl: SERVER_BASE,

  /** Laravel's public disk (`Storage::disk('public')`) — most file URLs
   *  (company logo, etc.) already come back as full URLs in API responses
   *  and don't need this, but it's here for any future direct construction. */
  storageBaseUrl: `${SERVER_BASE}/storage`,

  /** Pre-built sub-paths for every backend feature area — reused as-is by
   *  the handful of services that were already centralized before this pass. */
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

  // Laravel Reverb (broadcasting) — must match the backend REVERB_* values.
  reverb: {
    key:     'mgypsyqghmxl8wjtpcmx',
    wsHost:  '127.0.0.1',
    wsPort:  8080,
    scheme:  'http',   // 'https' in production
  },
};
