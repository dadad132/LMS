"""Database migration script to add quiz columns"""
import sqlite3

conn = sqlite3.connect('data.db')
cursor = conn.cursor()

# Add quiz columns to lessons table
try:
    cursor.execute("ALTER TABLE lessons ADD COLUMN quiz_questions TEXT DEFAULT '[]'")
    print('Added quiz_questions column')
except Exception as e:
    print(f'quiz_questions: {e}')

try:
    cursor.execute('ALTER TABLE lessons ADD COLUMN quiz_passing_score INTEGER DEFAULT 70')
    print('Added quiz_passing_score column')
except Exception as e:
    print(f'quiz_passing_score: {e}')

try:
    cursor.execute('ALTER TABLE lessons ADD COLUMN quiz_time_limit INTEGER')
    print('Added quiz_time_limit column')
except Exception as e:
    print(f'quiz_time_limit: {e}')

# Create quiz_attempts table
try:
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS quiz_attempts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            enrollment_id INTEGER NOT NULL,
            lesson_id INTEGER NOT NULL,
            answers TEXT DEFAULT '{}',
            score REAL DEFAULT 0,
            points_earned INTEGER DEFAULT 0,
            points_possible INTEGER DEFAULT 0,
            passed BOOLEAN DEFAULT 0,
            started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            submitted_at TIMESTAMP,
            time_spent_seconds INTEGER DEFAULT 0,
            FOREIGN KEY (enrollment_id) REFERENCES enrollments(id),
            FOREIGN KEY (lesson_id) REFERENCES lessons(id)
        )
    ''')
    print('Created quiz_attempts table')
except Exception as e:
    print(f'quiz_attempts table: {e}')

# Add team columns to site_config table
try:
    cursor.execute("ALTER TABLE site_config ADD COLUMN team_enabled BOOLEAN DEFAULT 1")
    print('Added team_enabled column')
except Exception as e:
    print(f'team_enabled: {e}')

try:
    cursor.execute("ALTER TABLE site_config ADD COLUMN team_title VARCHAR(255) DEFAULT 'Meet Our Team'")
    print('Added team_title column')
except Exception as e:
    print(f'team_title: {e}')

try:
    cursor.execute("ALTER TABLE site_config ADD COLUMN team_members TEXT DEFAULT '[]'")
    print('Added team_members column')
except Exception as e:
    print(f'team_members: {e}')

conn.commit()
conn.close()
print('Database migration complete!')
