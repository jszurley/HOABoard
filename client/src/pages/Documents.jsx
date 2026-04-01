import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getDocuments, uploadDocument, downloadDocument, deleteDocument } from '../services/api';
import './Documents.css';

export default function Documents() {
  const { communityId } = useParams();
  const { isCommunityAdmin } = useAuth();
  const isAdmin = isCommunityAdmin(communityId);

  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState(null);
  const [docName, setDocName] = useState('');

  useEffect(() => {
    loadDocuments();
  }, [communityId]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const res = await getDocuments(communityId);
      setDocuments(res.data);
    } catch (err) {
      setError('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    if (docName.trim()) {
      formData.append('name', docName.trim());
    }

    try {
      setUploading(true);
      setError('');
      await uploadDocument(communityId, formData);
      setFile(null);
      setDocName('');
      e.target.reset();
      await loadDocuments();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const handleView = async (doc) => {
    try {
      const res = await downloadDocument(communityId, doc.id);
      const url = window.URL.createObjectURL(new Blob([res.data], { type: doc.mime_type }));
      window.open(url, '_blank');
    } catch (err) {
      setError('Failed to open document');
    }
  };

  const handleDelete = async (doc) => {
    if (!window.confirm(`Delete "${doc.name}"?`)) return;
    try {
      await deleteDocument(communityId, doc.id);
      await loadDocuments();
    } catch (err) {
      setError('Failed to delete document');
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    });
  };

  if (loading) {
    return <div className="container"><div className="loading"><div className="spinner"></div></div></div>;
  }

  return (
    <div className="container">
      <div className="page-header">
        <h1>Documents</h1>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {isAdmin && (
        <form className="document-upload-form" onSubmit={handleUpload}>
          <input
            type="text"
            className="form-input"
            placeholder="Document name (optional)"
            value={docName}
            onChange={(e) => setDocName(e.target.value)}
          />
          <input
            type="file"
            className="form-input"
            accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
            onChange={(e) => setFile(e.target.files[0])}
          />
          <button type="submit" className="btn btn-primary" disabled={!file || uploading}>
            {uploading ? 'Uploading...' : 'Upload'}
          </button>
        </form>
      )}

      {documents.length === 0 ? (
        <div className="empty-state">
          <p>No documents yet.</p>
        </div>
      ) : (
        <div className="documents-list">
          {documents.map((doc) => (
            <div key={doc.id} className="document-card">
              <div className="document-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
              </div>
              <div className="document-info">
                <h3>{doc.name}</h3>
                <span className="document-meta">
                  {formatFileSize(doc.file_size)} &middot; {formatDate(doc.created_at)}
                  {doc.uploader_name && <> &middot; Uploaded by {doc.uploader_name}</>}
                </span>
              </div>
              <div className="document-actions">
                <button onClick={() => handleView(doc)} className="btn btn-primary btn-sm">View</button>
                {isAdmin && (
                  <button onClick={() => handleDelete(doc)} className="btn btn-outline btn-sm btn-danger">Delete</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
