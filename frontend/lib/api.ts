import axios from 'axios';
import { clearSession } from './authSession';

const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8087/api/v1',
});

// Add a request interceptor to attach JWT token
api.interceptors.request.use(
    (config) => {
        if (typeof window !== 'undefined') {
            const token = localStorage.getItem('token');
            if (token) {
                config.headers['Authorization'] = `Bearer ${token}`;
            }
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor: any 401 in an admin area means the token is
// expired or invalid — clear it and send the user to login.
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (typeof window !== 'undefined' && error.response?.status === 401) {
            const onLogin     = window.location.pathname.startsWith('/login');
            const isAdminArea = window.location.pathname.startsWith('/dashboard');
            if (!onLogin && isAdminArea) {
                const hadToken = !!localStorage.getItem('token');
                clearSession();
                window.location.href = hadToken ? '/login?expired=1' : '/login';
                return new Promise(() => {});
            }
        }
        return Promise.reject(error);
    }
);

export default api;