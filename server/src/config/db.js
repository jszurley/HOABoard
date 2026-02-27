const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const initializeDatabase = async () => {
  try {
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'users'
      );
    `);

    if (!tableCheck.rows[0].exists) {
      console.log('Initializing database schema...');

      await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          name VARCHAR(255) NOT NULL,
          phone VARCHAR(50),
          avatar_url TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS communities (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          address TEXT,
          invite_code VARCHAR(20) UNIQUE NOT NULL,
          created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS community_members (
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          community_id INTEGER REFERENCES communities(id) ON DELETE CASCADE,
          role VARCHAR(20) NOT NULL DEFAULT 'resident' CHECK (role IN ('admin', 'board_member', 'resident')),
          status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted')),
          joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (user_id, community_id)
        )
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS potluck_events (
          id SERIAL PRIMARY KEY,
          community_id INTEGER REFERENCES communities(id) ON DELETE CASCADE,
          created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
          title VARCHAR(255) NOT NULL,
          theme VARCHAR(255),
          description TEXT,
          event_date DATE NOT NULL,
          event_time TIME,
          location VARCHAR(255),
          max_appetizers INTEGER,
          max_sides INTEGER,
          max_mains INTEGER,
          max_desserts INTEGER,
          max_drinks INTEGER,
          max_other INTEGER,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS potluck_signups (
          id SERIAL PRIMARY KEY,
          potluck_event_id INTEGER REFERENCES potluck_events(id) ON DELETE CASCADE,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          dish_name VARCHAR(255) NOT NULL,
          category VARCHAR(50) NOT NULL CHECK (category IN ('appetizer', 'side', 'main', 'dessert', 'drink', 'other')),
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS meeting_suggestions (
          id SERIAL PRIMARY KEY,
          community_id INTEGER REFERENCES communities(id) ON DELETE CASCADE,
          submitted_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
          title VARCHAR(255) NOT NULL,
          description TEXT,
          status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'discussed', 'rejected')),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS suggestion_upvotes (
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          suggestion_id INTEGER REFERENCES meeting_suggestions(id) ON DELETE CASCADE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (user_id, suggestion_id)
        )
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS board_questions (
          id SERIAL PRIMARY KEY,
          community_id INTEGER REFERENCES communities(id) ON DELETE CASCADE,
          submitted_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
          title VARCHAR(255) NOT NULL,
          message TEXT NOT NULL,
          is_public BOOLEAN DEFAULT FALSE,
          status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'answered')),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS board_question_responses (
          id SERIAL PRIMARY KEY,
          question_id INTEGER REFERENCES board_questions(id) ON DELETE CASCADE,
          responded_by INTEGER REFERENCES users(id) ON DELETE CASCADE,
          message TEXT NOT NULL,
          is_public BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS calendar_events (
          id SERIAL PRIMARY KEY,
          community_id INTEGER REFERENCES communities(id) ON DELETE CASCADE,
          created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
          title VARCHAR(255) NOT NULL,
          description TEXT,
          event_date DATE NOT NULL,
          start_time TIME,
          end_time TIME,
          location VARCHAR(255),
          event_type VARCHAR(20) NOT NULL DEFAULT 'meeting' CHECK (event_type IN ('meeting', 'social', 'maintenance', 'deadline', 'other')),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS polls (
          id SERIAL PRIMARY KEY,
          community_id INTEGER REFERENCES communities(id) ON DELETE CASCADE,
          created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
          question TEXT NOT NULL,
          description TEXT,
          poll_type VARCHAR(20) NOT NULL DEFAULT 'single' CHECK (poll_type IN ('single', 'multiple')),
          is_anonymous BOOLEAN DEFAULT FALSE,
          results_visible VARCHAR(20) NOT NULL DEFAULT 'after_close' CHECK (results_visible IN ('always', 'after_vote', 'after_close')),
          opens_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          closes_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS poll_options (
          id SERIAL PRIMARY KEY,
          poll_id INTEGER REFERENCES polls(id) ON DELETE CASCADE,
          option_text VARCHAR(255) NOT NULL,
          display_order INTEGER NOT NULL DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS poll_votes (
          id SERIAL PRIMARY KEY,
          poll_id INTEGER REFERENCES polls(id) ON DELETE CASCADE,
          option_id INTEGER REFERENCES poll_options(id) ON DELETE CASCADE,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(poll_id, option_id, user_id)
        )
      `);

      // Create indexes
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_communities_invite_code ON communities(invite_code)`);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_community_members_user_id ON community_members(user_id)`);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_community_members_community_id ON community_members(community_id)`);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_potluck_events_community_id ON potluck_events(community_id)`);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_potluck_signups_event_id ON potluck_signups(potluck_event_id)`);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_potluck_signups_user_id ON potluck_signups(user_id)`);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_meeting_suggestions_community_id ON meeting_suggestions(community_id)`);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_suggestion_upvotes_suggestion_id ON suggestion_upvotes(suggestion_id)`);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_board_questions_community_id ON board_questions(community_id)`);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_board_questions_submitted_by ON board_questions(submitted_by)`);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_board_question_responses_question_id ON board_question_responses(question_id)`);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_calendar_events_community_id ON calendar_events(community_id)`);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_calendar_events_date ON calendar_events(event_date)`);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_polls_community_id ON polls(community_id)`);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_poll_options_poll_id ON poll_options(poll_id)`);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_poll_votes_poll_id ON poll_votes(poll_id)`);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_poll_votes_user_id ON poll_votes(user_id)`);

      console.log('Database schema initialized successfully');
    } else {
      console.log('Database connected - schema already exists');

      // Migrations for existing databases
      // Add new tables/columns here as features are added
    }
  } catch (error) {
    console.error('Database initialization error:', error.message || error);
  }
};

initializeDatabase();

module.exports = pool;
