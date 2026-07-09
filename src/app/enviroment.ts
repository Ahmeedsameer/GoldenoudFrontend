
const API_URL_BASE = 'http://127.0.0.1:8000/api';

export const environment = {
  production: false,
  apiUrl: {
    auth:               `${API_URL_BASE}/auth`,
    users:              `${API_URL_BASE}/users`,
    categories:         `${API_URL_BASE}/categories`,
    products:           `${API_URL_BASE}/products`,
    orders:             `${API_URL_BASE}/orders`,
    safe:               `${API_URL_BASE}/safe`,
    currencies:         `${API_URL_BASE}/currencies`,
    safeTypes:          `${API_URL_BASE}/safe-types`,
    transactionReasons: `${API_URL_BASE}/transaction-reasons`,
    safeManagement:     `${API_URL_BASE}/safe-management`,
    conventions:        `${API_URL_BASE}/conventions`,
    notifications:      `${API_URL_BASE}/notifications`,
    managerBase:        `${API_URL_BASE}/manager`,
    base:               API_URL_BASE,
  },

  // Laravel Reverb (broadcasting) — must match the backend REVERB_* values.
  reverb: {
    key:     'mgypsyqghmxl8wjtpcmx',
    wsHost:  '127.0.0.1',
    wsPort:  8080,
    scheme:  'http',   // 'https' in production
  },
};
