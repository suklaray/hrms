"use client";

import { Suspense } from "react";
import { useState, useEffect } from 'react';
import Head from "@/lib/compatHead";
import { swalConfirm, swalSuccess, swalError } from "@/utils/confirmDialog";

function BotSettings({
  canUpload,
  canDelete,
}: {
  canUpload: boolean;
  canDelete: boolean;
}) {
  const [files, setFiles] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [inputMode, setInputMode] = useState('upload');
  const [textContent, setTextContent] = useState('');
  const [fileName, setFileName] = useState('');

  const fetchFiles = async () => {
    try {
      const res = await fetch('/api/bot/files');
      const data = await res.json();
      if (res.ok) {
        setFiles(data.files || []);
      } else {
        swalError(data.error || 'Failed to load files');
      }
    } catch (error) {
      console.error('Error fetching files:', error);
      swalError('Failed to load files');
    } finally {
      setLoadingFiles(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  const handleFileUpload = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);

    setUploading(true);

    try {
      const res = await fetch('/api/bot/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        swalSuccess('File uploaded successfully!');
        fetchFiles();
        e.target.reset();
      } else {
        swalError(data.error || 'Upload failed');
      }
    } catch (error) {
      swalError('Upload error: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleTextSubmit = async (e) => {
    e.preventDefault();

    setUploading(true);

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
        swalSuccess('Content saved successfully!');
        fetchFiles();
        setFileName('');
        setTextContent('');
      } else {
        swalError(data.error || 'Save failed');
      }
    } catch (error) {
      swalError('Save error: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const deleteFile = async (filename) => {
    const confirmed = await swalConfirm(`Delete ${filename}?`, 'Yes');
    if (!confirmed) return;

    try {
      const res = await fetch('/api/bot/files', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename }),
      });

      if (res.ok) {
        swalSuccess('File deleted successfully!');
        fetchFiles();
      } else {
        const data = await res.json();
        swalError(data.error || 'Delete failed');
      }
    } catch (error) {
      swalError('Delete error: ' + error.message);
    }
  };

  return (
    <>
      <Head>
        <title>HR Assistant Data - HRMS</title>
      </Head>
      <div className="flex min-h-screen">
        <div className="flex-1 bg-gradient-to-b from-white to-gray-100 p-10">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold mb-6">HR Assistant Data Management</h1>

            {canUpload && <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
              <h2 className="text-lg font-semibold mb-4">Add HR Assistant Data</h2>

              <div className="flex space-x-4 mb-6">
                <button
                  onClick={() => setInputMode('upload')}
                  className={`px-4 py-2 rounded-md font-medium ${inputMode === 'upload'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                >
                  Upload File
                </button>
                <button
                  onClick={() => setInputMode('text')}
                  className={`px-4 py-2 rounded-md font-medium ${inputMode === 'text'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                >
                  Write Content
                </button>
              </div>

              {inputMode === 'upload' ? (
                <form key="upload" onSubmit={handleFileUpload} className="space-y-4">
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
                <form key="text" onSubmit={handleTextSubmit} className="space-y-4">
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
            </div>}

            {/* Files List */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold mb-4">Uploaded Files</h2>

              {loadingFiles ? (
                <p className="text-gray-500">Loading files...</p>
              ) : files.length === 0 ? (
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
                      {canDelete && <button
                        onClick={() => deleteFile(file.name)}
                        className="text-red-600 hover:text-red-800 text-sm font-medium"
                      >
                        Delete
                      </button>}
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

export default function ClientPageWrapper(props: {
  canUpload: boolean;
  canDelete: boolean;
}) {
  return (
    <Suspense fallback={null}>
      <BotSettings {...props} />
    </Suspense>
  );
}