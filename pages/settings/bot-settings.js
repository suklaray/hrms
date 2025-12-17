import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import SideBar from '@/Components/SideBar';
import axios from 'axios';

export default function BotSettings() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const router = useRouter();
  

useEffect(() => {
  axios.get('/api/auth/settings/user-profile')
    .then((res) => {
      setUser(res.data);
      
      // Check if user is superadmin
      if (res.data.role !== 'superadmin') {
        setAccessDenied(true);
        setLoading(false);
        return;
      }
      
      setLoading(false);
    })
    .catch(() => {
      setLoading(false);
      router.push('/dashboard');
    });
}, [router]);

  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [inputMode, setInputMode] = useState('upload');
  const [textContent, setTextContent] = useState('');
  const [fileName, setFileName] = useState('');

  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    try {
      const res = await fetch('/api/bot/files');
      const data = await res.json();
      if (res.ok) {
        setFiles(data.files || []);
      }
    } catch (error) {
      console.error('Error fetching files:', error);
    }
  };

  const handleFileUpload = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    setUploading(true);
    setMessage('');

    try {
      const res = await fetch('/api/bot/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      
      if (res.ok) {
        setMessage('File uploaded successfully!');
        fetchFiles();
        e.target.reset();
      } else {
        setMessage(data.error || 'Upload failed');
      }
    } catch (error) {
      setMessage('Upload error: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleTextSubmit = async (e) => {
    e.preventDefault();
    
    setUploading(true);
    setMessage('');

    try {
      const res = await fetch('/api/bot/text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          filename: fileName,
          content: textContent 
        }),
      });

      const data = await res.json();
      
      if (res.ok) {
        setMessage('Content saved successfully!');
        fetchFiles();
        setFileName('');
        setTextContent('');
      } else {
        setMessage(data.error || 'Save failed');
      }
    } catch (error) {
      setMessage('Save error: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const deleteFile = async (filename) => {
    if (!confirm(`Delete ${filename}?`)) return;

    try {
      const res = await fetch('/api/bot/files', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename }),
      });

      if (res.ok) {
        setMessage('File deleted successfully!');
        fetchFiles();
      } else {
        const data = await res.json();
        setMessage(data.error || 'Delete failed');
      }
    } catch (error) {
      setMessage('Delete error: ' + error.message);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (accessDenied) {
    return (
      <>
        <Head>
          <title>Access Denied - HRMS</title>
        </Head>
        <div className="flex min-h-screen">
          <SideBar />
          <div className="flex-1 bg-gradient-to-b from-white to-gray-100 p-10">
            <div className="max-w-4xl mx-auto text-center">
              <div className="bg-red-50 border border-red-200 rounded-lg p-8">
                <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
                <p className="text-red-700 mb-4">You don&apos;t have permission to access this page.</p>
                {/* <p className="text-gray-600">Only Super Administrators can access Bot Settings.</p> */}
                <button
                  onClick={() => router.push('/dashboard')}
                  className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
                >
                  Go to Dashboard
                </button>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }
  return (
    <>
      <Head>
        <title>HR Assistant Data - HRMS</title>
      </Head>
      <div className="flex min-h-screen">
        <SideBar />
        <div className="flex-1 bg-gradient-to-b from-white to-gray-100 p-10">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold mb-6">HR Assistant Data Management</h1>

            {/* Input Mode Selection */}
            <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
              <h2 className="text-lg font-semibold mb-4">Add HR Assistant Data</h2>
              
              <div className="flex space-x-4 mb-6">
                <button
                  onClick={() => setInputMode('upload')}
                  className={`px-4 py-2 rounded-md font-medium ${
                    inputMode === 'upload'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Upload File
                </button>
                <button
                  onClick={() => setInputMode('text')}
                  className={`px-4 py-2 rounded-md font-medium ${
                    inputMode === 'text'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Write Content
                </button>
              </div>

              {inputMode === 'upload' ? (
                <form onSubmit={handleFileUpload} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select File
                    </label>
                    <input
                      type="file"
                      name="file"
                      accept=".txt,.md,.json,.csv"
                      required
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      File Description (Optional)
                    </label>
                    <input
                      type="text"
                      name="description"
                      placeholder="Brief description of the file content"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={uploading}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md"
                  >
                    {uploading ? 'Uploading...' : 'Upload File'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleTextSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      File Name
                    </label>
                    <input
                      type="text"
                      value={fileName}
                      onChange={(e) => setFileName(e.target.value)}
                      placeholder="Enter filename (e.g., policy.txt)"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Content
                    </label>
                    <textarea
                      value={textContent}
                      onChange={(e) => setTextContent(e.target.value)}
                      placeholder="Enter the content for HR assistant..."
                      required
                      rows={10}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={uploading}
                    className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md"
                  >
                    {uploading ? 'Saving...' : 'Save Content'}
                  </button>
                </form>
              )}

              {message && (
                <div className={`mt-4 p-3 rounded-md ${message.includes('success') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {message}
                </div>
              )}
            </div>

            {/* Files List */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold mb-4">Uploaded Files</h2>
              
              {files.length === 0 ? (
                <p className="text-gray-500">No files uploaded yet.</p>
              ) : (
                <div className="space-y-3">
                  {files.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                      <div>
                        <h3 className="font-medium">{file.name}</h3>
                        {file.description && (
                          <p className="text-sm text-gray-600">{file.description}</p>
                        )}
                        <p className="text-xs text-gray-500">
                          Uploaded: {new Date(file.uploadedAt).toLocaleString()}
                        </p>
                      </div>
                      <button
                        onClick={() => deleteFile(file.name)}
                        className="text-red-600 hover:text-red-800 text-sm font-medium"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}