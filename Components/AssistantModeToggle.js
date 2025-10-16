import { useState, useEffect } from 'react';
import { Switch } from '@headlessui/react';
import { toast } from "react-toastify";

export default function AssistantModeToggle() {
  const [currentMode, setCurrentMode] = useState('RULE_BASED');
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState(null);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const response = await fetch('/api/assistant/config');
      if (response.ok) {
        const data = await response.json();
        setCurrentMode(data.mode);
        setConfig(data);
      }
    } catch (error) {
      console.error('Failed to fetch config:', error);
    }
  };

  const toggleMode = async () => {
    setLoading(true);
    try {
      const newMode = currentMode === 'RULE_BASED' ? 'LLM' : 'RULE_BASED';
      
      const response = await fetch('/api/assistant/mode', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mode: newMode }),
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentMode(data.currentMode);
        
        // Show success notification
        toast.success(`Assistant mode switched to ${data.currentMode}`);
      } else {
        const error = await response.json();
        toast.error(`Failed to switch mode: ${error.error}`);
      }
    } catch (error) {
      console.error('Mode switch error:', error);
      toast.error('Failed to switch mode');
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/assistant/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'testConnection' }),
      });

      const result = await response.json();
      
      if (result.success) {
        toast.success(`${result.message}`);
      } else {
        toast.error(`${result.message}`);
      }
    } catch (error) {
      toast.error('Connection test failed');
    } finally {
      setLoading(false);
    }
  };

  if (!config) {
    return <div className="animate-pulse bg-gray-200 h-20 rounded-lg"></div>;
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Assistant Mode
          </h3>
          <p className="text-sm text-gray-600">
            Switch between rule-based and AI-powered responses
          </p>
        </div>
        
        <Switch
          checked={currentMode === 'LLM'}
          onChange={toggleMode}
          disabled={loading}
          className={`${
            currentMode === 'LLM' ? 'bg-blue-600' : 'bg-gray-200'
          } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50`}
        >
          <span
            className={`${
              currentMode === 'LLM' ? 'translate-x-6' : 'translate-x-1'
            } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
          />
        </Switch>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Current Mode:</span>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            currentMode === 'LLM' 
              ? 'bg-blue-100 text-blue-800' 
              : 'bg-gray-100 text-gray-800'
          }`}>
            {currentMode === 'LLM' ? '🤖 AI-Powered' : '📋 Rule-Based'}
          </span>
        </div>

        {currentMode === 'LLM' && (
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">LLM Provider:</span>
              <span className="font-medium">{config.preferredLLM}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-gray-600">AWS Credentials:</span>
              <span className={config.hasAwsCredentials ? 'text-green-600' : 'text-red-600'}>
                {config.hasAwsCredentials ? '✅ Configured' : '❌ Missing'}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Groq API Key:</span>
              <span className={config.hasGroqApiKey ? 'text-green-600' : 'text-red-600'}>
                {config.hasGroqApiKey ? '✅ Configured' : '❌ Missing'}
              </span>
            </div>

            <button
              onClick={testConnection}
              disabled={loading}
              className="w-full mt-3 px-3 py-2 text-sm bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Testing...' : 'Test LLM Connection'}
            </button>
          </div>
        )}

        {config.lastUpdated && (
          <div className="text-xs text-gray-500 pt-2 border-t">
            Last updated: {new Date(config.lastUpdated).toLocaleString()}
            {config.updatedBy && ` by ${config.updatedBy}`}
          </div>
        )}
      </div>
    </div>
  );
}