import { useCallback, useEffect, useRef, useState } from 'react';
import { collection, doc, onSnapshot, query, where } from 'firebase/firestore';
import { db, mode } from '../firebase/config';
import { api, errorMessage } from '../services/api';
import { useAuth } from '../context/AuthContext';

// Only lightweight invalidations are streamed; data always comes from a role-scoped API.
export function useLiveData(path, collections = []) {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const version = useRef(0);
  const refresh = useCallback(async () => {
    const current = ++version.current;
    try {
      const result = await api.get(path);
      if (current === version.current) {
        setData(result.data);
        setError(null);
      }
    } catch (err) {
      if (current === version.current) setError(errorMessage(err));
    } finally {
      if (current === version.current) setLoading(false);
    }
  }, [path, user?.id]);
  const key = [...new Set(collections)].sort().join(',');
  useEffect(() => {
    setData(null);
    setLoading(true);
    refresh();
    let timer;
    const invalidate = () => {
      clearTimeout(timer);
      timer = setTimeout(refresh, 100);
    };
    const cleanup = [];
    if (mode === 'demo') {
      const events = new EventSource(`${api.defaults.baseURL}/events`);
      events.addEventListener('change', invalidate);
      events.onopen = invalidate;
      cleanup.push(() => events.close());
    } else if (db) {
      for (const name of key.split(',').filter(Boolean)) {
        let ref = collection(db, name);
        if (name === 'users') {
          if (!user) continue;
          if (user.role !== 'admin') ref = doc(db, 'users', user.id);
        } else if (['donations', 'applications'].includes(name)) {
          if (!user) continue;
          if (user.role !== 'admin' || path.includes('view=personal'))
            ref = query(
              ref,
              where(
                user.role === 'organization' && !path.includes('view=personal')
                  ? 'organizationId'
                  : 'userId',
                '==',
                user.id,
              ),
            );
        }
        cleanup.push(
          onSnapshot(ref, invalidate, (err) =>
            setError(`Live updates unavailable: ${errorMessage(err)}`),
          ),
        );
      }
    }
    window.addEventListener('focus', invalidate);
    return () => {
      version.current++;
      cleanup.forEach((fn) => fn());
      clearTimeout(timer);
      window.removeEventListener('focus', invalidate);
    };
  }, [refresh, key, user?.role]);
  return { data, loading, error, refresh };
}
