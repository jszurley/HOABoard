-- HOABoard Database Schema

-- Users
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  avatar_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Communities
CREATE TABLE IF NOT EXISTS communities (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  address TEXT,
  invite_code VARCHAR(20) UNIQUE NOT NULL,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Community Members (junction table with roles)
CREATE TABLE IF NOT EXISTS community_members (
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  community_id INTEGER REFERENCES communities(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL DEFAULT 'resident' CHECK (role IN ('admin', 'board_member', 'resident')),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted')),
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, community_id)
);

-- Potluck Events
CREATE TABLE IF NOT EXISTS potluck_events (
  id SERIAL PRIMARY KEY,
  community_id INTEGER REFERENCES communities(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  theme VARCHAR(255),
  event_date DATE NOT NULL,
  event_time TIME,
  location VARCHAR(255),
  created_by INTEGER REFERENCES users(id),
  max_appetizers INTEGER,
  max_sides INTEGER,
  max_mains INTEGER,
  max_desserts INTEGER,
  max_drinks INTEGER,
  max_other INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Potluck Signups
CREATE TABLE IF NOT EXISTS potluck_signups (
  id SERIAL PRIMARY KEY,
  potluck_event_id INTEGER REFERENCES potluck_events(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  dish_name VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL CHECK (category IN ('appetizer', 'side', 'main', 'dessert', 'drink', 'other')),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Meeting Suggestions
CREATE TABLE IF NOT EXISTS meeting_suggestions (
  id SERIAL PRIMARY KEY,
  community_id INTEGER REFERENCES communities(id) ON DELETE CASCADE,
  submitted_by INTEGER REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'discussed', 'rejected')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Suggestion Upvotes
CREATE TABLE IF NOT EXISTS suggestion_upvotes (
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  suggestion_id INTEGER REFERENCES meeting_suggestions(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, suggestion_id)
);

-- Board Questions
CREATE TABLE IF NOT EXISTS board_questions (
  id SERIAL PRIMARY KEY,
  community_id INTEGER REFERENCES communities(id) ON DELETE CASCADE,
  submitted_by INTEGER REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  is_public BOOLEAN DEFAULT FALSE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'answered')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Board Question Responses
CREATE TABLE IF NOT EXISTS board_question_responses (
  id SERIAL PRIMARY KEY,
  question_id INTEGER REFERENCES board_questions(id) ON DELETE CASCADE,
  responded_by INTEGER REFERENCES users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  is_public BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Calendar Events
CREATE TABLE IF NOT EXISTS calendar_events (
  id SERIAL PRIMARY KEY,
  community_id INTEGER REFERENCES communities(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  location VARCHAR(255),
  event_type VARCHAR(20) NOT NULL DEFAULT 'meeting' CHECK (event_type IN ('meeting', 'social', 'maintenance', 'deadline', 'other')),
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Polls
CREATE TABLE IF NOT EXISTS polls (
  id SERIAL PRIMARY KEY,
  community_id INTEGER REFERENCES communities(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  description TEXT,
  poll_type VARCHAR(20) NOT NULL DEFAULT 'single' CHECK (poll_type IN ('single', 'multiple')),
  is_anonymous BOOLEAN DEFAULT FALSE,
  results_visible VARCHAR(20) NOT NULL DEFAULT 'after_close' CHECK (results_visible IN ('always', 'after_vote', 'after_close')),
  opens_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  closes_at TIMESTAMP,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Poll Options
CREATE TABLE IF NOT EXISTS poll_options (
  id SERIAL PRIMARY KEY,
  poll_id INTEGER REFERENCES polls(id) ON DELETE CASCADE,
  option_text VARCHAR(255) NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0
);

-- Poll Votes
CREATE TABLE IF NOT EXISTS poll_votes (
  id SERIAL PRIMARY KEY,
  poll_id INTEGER REFERENCES polls(id) ON DELETE CASCADE,
  option_id INTEGER REFERENCES poll_options(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (poll_id, option_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_community_members_community ON community_members(community_id);
CREATE INDEX IF NOT EXISTS idx_community_members_user ON community_members(user_id);
CREATE INDEX IF NOT EXISTS idx_potluck_events_community ON potluck_events(community_id);
CREATE INDEX IF NOT EXISTS idx_potluck_signups_event ON potluck_signups(potluck_event_id);
CREATE INDEX IF NOT EXISTS idx_meeting_suggestions_community ON meeting_suggestions(community_id);
CREATE INDEX IF NOT EXISTS idx_suggestion_upvotes_suggestion ON suggestion_upvotes(suggestion_id);
CREATE INDEX IF NOT EXISTS idx_board_questions_community ON board_questions(community_id);
CREATE INDEX IF NOT EXISTS idx_board_question_responses_question ON board_question_responses(question_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_community ON calendar_events(community_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_date ON calendar_events(event_date);
CREATE INDEX IF NOT EXISTS idx_polls_community ON polls(community_id);
CREATE INDEX IF NOT EXISTS idx_poll_options_poll ON poll_options(poll_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_poll ON poll_votes(poll_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_user ON poll_votes(user_id);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY['users', 'communities', 'potluck_events', 'meeting_suggestions', 'board_questions', 'calendar_events', 'polls'])
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS update_%s_updated_at ON %s', t, t);
    EXECUTE format('CREATE TRIGGER update_%s_updated_at BEFORE UPDATE ON %s FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', t, t);
  END LOOP;
END $$;
