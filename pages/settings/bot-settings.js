import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Sidebar from '@/Components/SideBar';

export default function BotSettings() {
  const router = useRouter();
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [credentials, setCredentials] = useState({
    preferredLLM: 'GROQ',
    awsRegion: 'us-east-1',
    awsAccessKey: '',
    awsSecretKey: '',
    groqApiKey: '',
    githubToken: ''
  });

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user?.role?.toLowerCase() === 'superadmin') {
      fetchConfig();
    }
  }, [user]);

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        
        if (data.authenticated && data.user) {
          setUser(data.user);
          
          // Redirect if not super admin
          if (data.user.role?.toLowerCase() !== 'superadmin') {
            router.push('/dashboard');
            return;
          }
        } else {
          router.push('/login');
        }
      } else {
        router.push('/login');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      router.push('/login');
    }
  };

  const fetchConfig = async () => {
    try {
      const response = await fetch('/api/assistant/config', {
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setConfig(data);
        setCredentials(prev => ({
          ...prev,
          preferredLLM: data.preferredLLM || 'GROQ',
          awsRegion: data.awsRegion || 'us-east-1'
        }));
      } else if (response.status === 403) {
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Failed to fetch config:', error);
    }
  };

  const switchMode = async (newMode) => {
    setLoading(true);
    try {
      const response = await fetch('/api/assistant/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'updateMode', mode: newMode }),
      });

      if (response.ok) {
        await fetchConfig();
        alert(`✅ Assistant switched to ${newMode} mode`);
      } else {
        const error = await response.json();
        alert(`❌ Failed to switch mode: ${error.error}`);
      }
    } catch (error) {
      alert('❌ Error switching mode');
    } finally {
      setLoading(false);
    }
  };

  const updateCredentials = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch('/api/assistant/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'updateCredentials', ...credentials }),
      });

      if (response.ok) {
        alert('✅ Credentials updated successfully');
        await fetchConfig();
        // Clear sensitive fields
        setCredentials(prev => ({
          ...prev,
          awsAccessKey: '',
          awsSecretKey: '',
          groqApiKey: '',
          githubToken: ''
        }));
      } else {
        const error = await response.json();
        alert(`❌ Failed to update credentials: ${error.error}`);
      }
    } catch (error) {
      alert('❌ Error updating credentials');
    } finally {
      setLoading(false);
    }
  };

  if (!user || user.role?.toLowerCase() !== 'superadmin') {
    return <div className="p-6">Access Denied. Super Admin only.</div>;
  }

  if (!config) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 p-6">
        <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">🤖 Bot Assistant Settings</h1>
          <p className="text-gray-600 mb-6">Configure the AI assistant behavior and credentials</p>
          
          {/* Current Status */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-blue-900">Current Mode</h3>
                <p className="text-blue-700">
                  {config.mode === 'LLM' ? '🤖 AI-Powered (LLM)' : '📋 Rule-Based'}
                </p>
              </div>
              <div className="text-sm text-blue-600">
                Last updated: {config.lastUpdated ? new Date(config.lastUpdated).toLocaleString() : 'Never'}
              </div>
            </div>
          </div>

          {/* Mode Selection */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-4">Assistant Mode</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => switchMode('RULE_BASED')}
                disabled={loading}
                className={`p-4 border-2 rounded-lg text-left transition ${
                  config.mode === 'RULE_BASED'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                } disabled:opacity-50`}
              >
                <div className="flex items-center mb-2">
                  <span className="text-2xl mr-2">📋</span>
                  <h3 className="font-semibold">Rule-Based</h3>
                </div>
                <p className="text-sm text-gray-600">
                  Fast, deterministic responses using predefined rules and database queries
                </p>
              </button>

              <button
                onClick={() => switchMode('LLM')}
                disabled={loading}
                className={`p-4 border-2 rounded-lg text-left transition ${
                  config.mode === 'LLM'
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 hover:border-gray-300'
                } disabled:opacity-50`}
              >
                <div className="flex items-center mb-2">
                  <span className="text-2xl mr-2">🤖</span>
                  <h3 className="font-semibold">AI-Powered (LLM)</h3>
                </div>
                <p className="text-sm text-gray-600">
                  Intelligent responses using AI models with contextual understanding
                </p>
              </button>
            </div>
          </div>

          {/* LLM Configuration */}
          {config.mode === 'LLM' && (
            <div className="border-t pt-6">
              <h2 className="text-lg font-semibold mb-4">LLM Configuration</h2>
              
              {/* Status Indicators */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-sm text-gray-600">AWS Credentials</div>
                  <div className={`font-semibold ${config.hasAwsCredentials ? 'text-green-600' : 'text-red-600'}`}>
                    {config.hasAwsCredentials ? '✅ Configured' : '❌ Missing'}
                  </div>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-sm text-gray-600">Groq API Key</div>
                  <div className={`font-semibold ${config.hasGroqApiKey ? 'text-green-600' : 'text-red-600'}`}>
                    {config.hasGroqApiKey ? '✅ Configured' : '❌ Missing'}
                  </div>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-sm text-gray-600">GitHub Token</div>
                  <div className={`font-semibold ${config.hasGithubToken ? 'text-green-600' : 'text-red-600'}`}>
                    {config.hasGithubToken ? '✅ Configured' : '❌ Missing'}
                  </div>
                </div>
              </div>

              {/* Credentials Form */}
              <form onSubmit={updateCredentials} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Preferred LLM Provider</label>
                  <select
                    value={credentials.preferredLLM}
                    onChange={(e) => setCredentials({...credentials, preferredLLM: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="GROQ">Groq (Free - Recommended)</option>
                    <option value="BEDROCK">Amazon Bedrock (Premium)</option>
                  </select>
                </div>

                {credentials.preferredLLM === 'BEDROCK' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium mb-1">AWS Region</label>
                      <input
                        type="text"
                        value={credentials.awsRegion}
                        onChange={(e) => setCredentials({...credentials, awsRegion: e.target.value})}
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="us-east-1"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">AWS Access Key</label>
                      <input
                        type="password"
                        value={credentials.awsAccessKey}
                        onChange={(e) => setCredentials({...credentials, awsAccessKey: e.target.value})}
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter AWS Access Key"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">AWS Secret Key</label>
                      <input
                        type="password"
                        value={credentials.awsSecretKey}
                        onChange={(e) => setCredentials({...credentials, awsSecretKey: e.target.value})}
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter AWS Secret Key"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-sm font-medium mb-1">Groq API Key</label>
                  <input
                    type="password"
                    value={credentials.groqApiKey}
                    onChange={(e) => setCredentials({...credentials, groqApiKey: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter Groq API Key (free at groq.com)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">GitHub Token (Optional)</label>
                  <input
                    type="password"
                    value={credentials.githubToken}
                    onChange={(e) => setCredentials({...credentials, githubToken: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter GitHub Token for HR docs access"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
                >
                  {loading ? 'Updating...' : 'Update Credentials'}
                </button>
              </form>
            </div>
          )}

          {loading && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-lg">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-center">Processing...</p>
              </div>
            </div>
          )}
        </div>
        </div>
      </div>
    </div>
  );
}