import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/employee/me', {
        credentials: 'include',
      });
      
      if (!res.ok) {
        router.replace('/employee/login');
        return;
      }
      
      const data = await res.json();
      setUser(data.user);
      localStorage.setItem('employee_user', JSON.stringify(data.user));
    } catch (err) {
      console.error('Auth error:', err);
      router.replace('/employee/login');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    // Check if user data is cached in localStorage
    const cachedUser = localStorage.getItem('employee_user');
    if (cachedUser) {
      try {
        const userData = JSON.parse(cachedUser);
        setUser(userData);
        setLoading(false);
        return;
      } catch (e) {
        localStorage.removeItem('employee_user');
      }
    }

    // If no cache, fetch from API
    fetchUser();
  }, [fetchUser]);

  const logout = async () => {
    try {
      await fetch('/api/auth/employee/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      localStorage.removeItem('employee_user');
      router.replace('/employee/login');
    }
  };

  return { user, loading, logout, setUser };
}