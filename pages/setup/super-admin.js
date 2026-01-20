import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import prisma from '@/lib/prisma';

export default function SuperAdminSetup() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    setupToken: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    if (!formData.name) {
      newErrors.name = 'Name is required';
    }

    if (!formData.setupToken) {
      newErrors.setupToken = 'Setup token is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/setup/super-admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        setMessage('SUPER_ADMIN created successfully! You can now login.');
        setFormData({ email: '', password: '', name: '', setupToken: '' });
      } else {
        setMessage(data.message || 'Setup failed');
      }
    } catch (error) {
      setMessage('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  return (
    <>
      <Head>
        <title>Super Admin Setup - HRMS</title>
      </Head>
      
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f3f4f6',
        padding: '1rem'
      }}>
        <div style={{
          backgroundColor: 'white',
          padding: '2rem',
          borderRadius: '8px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          width: '100%',
          maxWidth: '400px'
        }}>
          <h1 style={{
            fontSize: '1.5rem',
            fontWeight: 'bold',
            textAlign: 'center',
            marginBottom: '1.5rem',
            color: '#1f2937'
          }}>
            Super Admin Setup
          </h1>

          {message && (
            <div style={{
              padding: '0.75rem',
              marginBottom: '1rem',
              borderRadius: '4px',
              backgroundColor: success ? '#d1fae5' : '#fee2e2',
              color: success ? '#065f46' : '#991b1b',
              border: `1px solid ${success ? '#a7f3d0' : '#fecaca'}`,
              fontSize: '0.875rem'
            }}>
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '0.25rem'
              }}>
                Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                disabled={success || loading}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: `1px solid ${errors.name ? '#ef4444' : '#d1d5db'}`,
                  borderRadius: '4px',
                  fontSize: '0.875rem',
                  backgroundColor: success ? '#f9fafb' : 'white'
                }}
                placeholder="Enter full name"
              />
              {errors.name && (
                <p style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                  {errors.name}
                </p>
              )}
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '0.25rem'
              }}>
                Email *
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                disabled={success || loading}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: `1px solid ${errors.email ? '#ef4444' : '#d1d5db'}`,
                  borderRadius: '4px',
                  fontSize: '0.875rem',
                  backgroundColor: success ? '#f9fafb' : 'white'
                }}
                placeholder="admin@company.com"
              />
              {errors.email && (
                <p style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                  {errors.email}
                </p>
              )}
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '0.25rem'
              }}>
                Password *
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                disabled={success || loading}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: `1px solid ${errors.password ? '#ef4444' : '#d1d5db'}`,
                  borderRadius: '4px',
                  fontSize: '0.875rem',
                  backgroundColor: success ? '#f9fafb' : 'white'
                }}
                placeholder="Minimum 8 characters"
              />
              {errors.password && (
                <p style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                  {errors.password}
                </p>
              )}
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '0.25rem'
              }}>
                Setup Token *
              </label>
              <input
                type="password"
                name="setupToken"
                value={formData.setupToken}
                onChange={handleChange}
                disabled={success || loading}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: `1px solid ${errors.setupToken ? '#ef4444' : '#d1d5db'}`,
                  borderRadius: '4px',
                  fontSize: '0.875rem',
                  backgroundColor: success ? '#f9fafb' : 'white'
                }}
                placeholder="Enter setup token"
              />
              {errors.setupToken && (
                <p style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                  {errors.setupToken}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={success || loading}
              style={{
                width: '100%',
                padding: '0.75rem',
                backgroundColor: success ? '#10b981' : (loading ? '#9ca3af' : '#3b82f6'),
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '0.875rem',
                fontWeight: '500',
                cursor: success || loading ? 'not-allowed' : 'pointer',
                opacity: success || loading ? 0.6 : 1
              }}
            >
              {loading ? 'Creating...' : success ? 'Setup Complete' : 'Create Super Admin'}
            </button>
          </form>

          {success && (
            <div style={{
              marginTop: '1rem',
              textAlign: 'center'
            }}>
              <Link
                href="/login"
                style={{
                  color: '#3b82f6',
                  textDecoration: 'none',
                  fontSize: '0.875rem',
                  fontWeight: '500'
                }}
              >
                Go to Login
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export async function getServerSideProps() {
  try {
    // Check if SUPER_ADMIN already exists
    const existingSuperAdmin = await prisma.users.findFirst({
      where: { role: 'superadmin' }
    });

    if (existingSuperAdmin) {
      return {
        redirect: {
          destination: '/login',
          permanent: false,
        },
      };
    }

    return {
      props: {},
    };
  } catch (error) {
    console.error('Setup page error:', error);
    return {
      redirect: {
        destination: '/login',
        permanent: false,
      },
    };
  }
}