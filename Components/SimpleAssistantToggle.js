import { useState, useEffect } from 'react';
import { toast } from "react-toastify";

export default function SimpleAssistantToggle() {
  const [mode, setMode] = useState('RULE_BASED');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchMode();
  }, []);

  const fetchMode = async () => {
    try {
      const response = await fetch('/api/assistant/config');
      if (response.ok) {
        const data = await response.json();
        setMode(data.mode);
      }
    } catch (error) {
      console.error('Failed to fetch mode:', error);
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
        setMode(newMode);
        toast.success(`Assistant switched to ${newMode} mode`);
      } else {
        toast.error('Failed to switch mode');
      }
    } catch (error) {
      toast.error('Error switching mode');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow border">
      <h3 className="text-lg font-semibold mb-3">🤖 Assistant Mode</h3>
      
      <div className="flex space-x-3 mb-3">
        <button
          onClick={() => switchMode('RULE_BASED')}
          disabled={loading}
          className={`px-4 py-2 rounded text-sm font-medium ${
            mode === 'RULE_BASED' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          } disabled:opacity-50`}
        >
          📋 Rule-Based
        </button>
        
        <button
          onClick={() => switchMode('LLM')}
          disabled={loading}
          className={`px-4 py-2 rounded text-sm font-medium ${
            mode === 'LLM' 
              ? 'bg-green-600 text-white' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          } disabled:opacity-50`}
        >
          🤖 AI-Powered
        </button>
      </div>

      <div className="text-sm text-gray-600">
        <strong>Current:</strong> {mode === 'LLM' ? '🤖 AI-Powered' : '📋 Rule-Based'}
        {loading && <span className="ml-2">⏳ Switching...</span>}
      </div>
    </div>
  );
}