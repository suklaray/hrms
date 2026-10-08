// src/lib/useAuth.ts
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AuthUser } from '@/types';
import { useAppDispatch } from '@/store/hooks';
import { logoutUser } from '@/store/slices/authSlice';

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const router = useRouter();
  const dispatch = useAppDispatch();

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/employee/me', {
        credentials: 'include',
      });
      
      if (!res.ok) {
        router.replace('/login');
        return;
      }
      
      const data = await res.json();
      setUser(data.user);
      localStorage.setItem('employee_user', JSON.stringify(data.user));
    } catch (err) {
      console.error('Auth error:', err);
      router.replace('/login');
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
      } catch {
        localStorage.removeItem('employee_user');
      }
    }

    // If no cache, fetch from API
    fetchUser();
  }, [fetchUser]);

  const logout = async () => {
    await dispatch(logoutUser());
    setUser(null);
  };

  return { user, loading, logout, setUser };
}

export default useAuth;
