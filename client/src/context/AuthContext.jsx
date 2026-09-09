import { createContext, useContext, useEffect, useRef, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { auth, mode } from '../firebase/config';
import { api } from '../services/api';
const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paymentMode, setPaymentMode] = useState(null);
  useEffect(() => {
    api
      .get('/health')
      .then(({ data }) => setPaymentMode(data.payments))
      .catch(() => {});
  }, []);
  const operation = useRef(false);
  const generation = useRef(0);
  const refreshUser = async () => {
    const { data } = await api.get('/users/me');
    setUser(data);
    return data;
  };
  const syncFirebase = async () => {
    const key = `cg-pending-profile-${auth.currentUser.uid}`;
    let profile = {};
    try {
      profile = JSON.parse(sessionStorage.getItem(key) || '{}');
    } catch {
      sessionStorage.removeItem(key);
    }
    const { data } = await api.post('/auth/sync', profile);
    sessionStorage.removeItem(key);
    return data;
  };
  useEffect(() => {
    if (mode === 'firebase' && auth)
      return onAuthStateChanged(auth, async (fbUser) => {
        if (operation.current) return;
        const version = ++generation.current;
        try {
          const profile = fbUser ? await syncFirebase() : null;
          if (version === generation.current) setUser(profile);
        } catch {
          if (version === generation.current) setUser(null);
        } finally {
          if (version === generation.current) setLoading(false);
        }
      });
    let active = true;
    if (sessionStorage.getItem('cg-demo-token'))
      api
        .get('/users/me')
        .then(({ data }) => {
          if (active) setUser(data);
        })
        .catch(() => sessionStorage.removeItem('cg-demo-token'))
        .finally(() => {
          if (active) setLoading(false);
        });
    else setLoading(false);
    return () => {
      active = false;
    };
  }, []);
  const acceptDemo = ({ data }) => {
    sessionStorage.setItem('cg-demo-token', data.token);
    setUser(data.user);
    return data.user;
  };
  const login = async (email, password) => {
    if (mode === 'demo') return acceptDemo(await api.post('/auth/login', { email, password }));
    operation.current = true;
    generation.current++;
    try {
      await signInWithEmailAndPassword(auth, email, password);
      const data = await syncFirebase();
      setUser(data);
      return data;
    } finally {
      operation.current = false;
      setLoading(false);
    }
  };
  const register = async (values) => {
    const payload = { ...values };
    if (payload.role !== 'organization') delete payload.organizationName;
    if (mode === 'demo') return acceptDemo(await api.post('/auth/register', payload));
    operation.current = true;
    generation.current++;
    try {
      const credential = await createUserWithEmailAndPassword(
        auth,
        payload.email,
        payload.password,
      );
      const profile = {
        name: payload.name,
        role: payload.role,
        ...(payload.organizationName ? { organizationName: payload.organizationName } : {}),
      };
      // Retain only profile metadata so a network interruption can recover at next login.
      sessionStorage.setItem(`cg-pending-profile-${credential.user.uid}`, JSON.stringify(profile));
      await updateProfile(credential.user, { displayName: payload.name });
      const data = await syncFirebase();
      setUser(data);
      return data;
    } finally {
      operation.current = false;
      setLoading(false);
    }
  };
  const loginDemo = async (role) => acceptDemo(await api.post('/auth/demo', { role }));
  const logout = async () => {
    generation.current++;
    if (auth) await signOut(auth);
    sessionStorage.removeItem('cg-demo-token');
    setUser(null);
  };
  return (
    <AuthContext.Provider
      value={{ user, loading, mode, paymentMode, login, register, loginDemo, logout, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}
