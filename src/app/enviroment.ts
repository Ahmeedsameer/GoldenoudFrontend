

const API_URL_BASE = 'http://127.0.0.1:8000/api';


export const environment = {
  production: false,
  apiUrl: {
    auth: `${API_URL_BASE}/auth`,
    users: `${API_URL_BASE}/users`,
    categories: `${API_URL_BASE}/categories`,
    products: `${API_URL_BASE}/products`,
    orders: `${API_URL_BASE}/orders`,
    safe: `${API_URL_BASE}/safe`,
  }
};