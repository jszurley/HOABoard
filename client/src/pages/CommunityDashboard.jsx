import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getCommunity } from '../services/api';
import './CommunityDashboard.css';

export default function CommunityDashboard() {
  const { communityId } = useParams();
  const { isCommunityAdmin, isBoardMember } = useAuth();
  const [community, setCommunity] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCommunity();
  }, [communityId]);

  const loadCommunity = async () => {
    try {
      const { data } = await getCommunity(communityId);
      setCommunity(data.community);
    } catch (err) {
      console.error('Failed to load community:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  if (!community) {
    return <div className="container"><div className="alert alert-error">Community not found</div></div>;
  }

  const features = [
    {
      title: 'Potluck Dinners',
      description: 'Organize community potlucks and sign up to bring dishes',
      icon: '🍽️',
      path: 'potlucks',
      color: '#FF9800'
    },
    {
      title: 'Meeting Suggestions',
      description: 'Submit and vote on agenda items for board meetings',
      icon: '💡',
      path: 'suggestions',
      color: '#2196F3'
    },
    {
      title: 'Board Questions',
      description: 'Ask questions privately or publicly to the board',
      icon: '❓',
      path: 'questions',
      color: '#9C27B0'
    },
    {
      title: 'Community Calendar',
      description: 'View upcoming events, meetings, and deadlines',
      icon: '📅',
      path: 'calendar',
      color: '#4CAF50'
    },
    {
      title: 'Polls & Voting',
      description: 'Participate in community polls and see results',
      icon: '📊',
      path: 'polls',
      color: '#F44336'
    },
    {
      title: 'Members',
      description: 'View community members and their roles',
      icon: '👥',
      path: 'members',
      color: '#607D8B'
    }
  ];

  return (
    <div className="container community-dashboard">
      <div className="community-header">
        <div>
          <h1>{community.name}</h1>
          {community.description && <p className="text-muted">{community.description}</p>}
        </div>
        {isCommunityAdmin(communityId) && (
          <Link to={`/communities/${communityId}/settings`} className="btn btn-outline">
            Settings
          </Link>
        )}
      </div>

      <div className="feature-grid">
        {features.map(feature => (
          <Link
            key={feature.path}
            to={`/communities/${communityId}/${feature.path}`}
            className="feature-card card"
          >
            <div className="feature-icon" style={{ backgroundColor: feature.color + '20', color: feature.color }}>
              {feature.icon}
            </div>
            <h3>{feature.title}</h3>
            <p>{feature.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
