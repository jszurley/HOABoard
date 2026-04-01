import { useParams } from 'react-router-dom';
import './Documents.css';

const documents = [
  {
    name: 'Pelican Pier Rules and Regulations',
    filename: 'Pelican Pier Rules and Regulations.pdf',
    type: 'PDF',
  },
];

export default function Documents() {
  const { communityId } = useParams();

  return (
    <div className="container">
      <div className="page-header">
        <h1>Documents</h1>
      </div>

      <div className="documents-list">
        {documents.map((doc, index) => (
          <div key={index} className="document-card">
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
              <span className="document-type">{doc.type}</span>
            </div>
            <a
              href={`/${doc.filename}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary btn-sm"
            >
              View
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
