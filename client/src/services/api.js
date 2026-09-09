import axios from 'axios';
import { auth, mode } from '../firebase/config';
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  timeout: 20000,
});
api.interceptors.request.use(async (config) => {
  const token =
    mode === 'firebase'
      ? await auth?.currentUser?.getIdToken()
      : sessionStorage.getItem('cg-demo-token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
export function errorMessage(error) {
  if (error.response?.data?.message) return error.response.data.message;
  if (error.code === 'ERR_NETWORK')
    return 'We can’t reach the server. Make sure the backend is running on port 5000.';
  const authErrors = {
    'auth/invalid-credential': 'Your email or password is incorrect.',
    'auth/email-already-in-use': 'An account with this email already exists.',
    'auth/weak-password': 'Choose a stronger password (at least 8 characters).',
    'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
  };
  return authErrors[error.code] || error.message || 'Something went wrong. Please try again.';
}
