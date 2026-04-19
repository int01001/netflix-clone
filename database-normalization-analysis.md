# Database Normalization Analysis - Netflix Clone

## Overview
This document analyzes the database structure of the Netflix clone application and applies normalization techniques to eliminate redundancy and improve data integrity.

## Current Database Structure

### Existing Tables:
1. **users** - User accounts and basic information
2. **movies** - Movie catalog with metadata
3. **watch_history** - User viewing history
4. **playlists** - User-created playlists
5. **playlist_items** - Items within playlists
6. **password_reset_otps** - Password reset functionality
7. **email_verification_otps** - Email verification functionality
8. **user_preferences** - User profile preferences
9. **temp_signup_passwords** - Temporary signup storage

---

# Chapter 4: ANALYZING THE PITFALLS, IDENTIFYING THE DEPENDENCIES, AND APPLYING NORMALIZATION

**Database used:** `netflix` (SQL command client).  
**Connection details:** Database name: `netflix`, Password: `Dhoni@28`
**Important fix:** Using actual Netflix clone database structure with proper normalization analysis.

---

## 0) Reset Current Netflix Data (base schema only)

```sql
USE netflix;

SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE user_preferences;
TRUNCATE TABLE temp_signup_passwords;
TRUNCATE TABLE email_verification_otps;
TRUNCATE TABLE password_reset_otps;
TRUNCATE TABLE playlist_items;
TRUNCATE TABLE playlists;
TRUNCATE TABLE watch_history;
TRUNCATE TABLE movies;
TRUNCATE TABLE users;
SET FOREIGN_KEY_CHECKS = 1;
```

---

## 4.1 Analyse the Pitfalls in Relations

## 4.1.1 BEFORE: One UNF table

```sql
DROP TABLE IF EXISTS netflix_data_unf;

CREATE TABLE netflix_data_unf (
    row_id INT PRIMARY KEY,
    user_id INT,
    name VARCHAR(100),
    email VARCHAR(191),
    password_hash VARCHAR(255),
    avatar_url VARCHAR(255),
    movie_id INT,
    movie_title VARCHAR(150),
    movie_genre VARCHAR(50),
    movie_year INT,
    movie_rating DECIMAL(3,1),
    movie_description TEXT,
    backdrop_url VARCHAR(300),
    thumbnail_url VARCHAR(300),
    trailer_url VARCHAR(300),
    featured BOOLEAN,
    watch_position INT,
    watch_duration INT,
    last_watched TIMESTAMP,
    playlist_id INT,
    playlist_name VARCHAR(80),
    preferred_genres VARCHAR(255),
    preferred_languages VARCHAR(255),
    otp_hash VARCHAR(255),
    otp_type VARCHAR(20),
    expires_at TIMESTAMP
);

INSERT INTO netflix_data_unf VALUES
(1, 1, 'John Doe', 'john@example.com', 'hashed_pass_123', 'avatar1.jpg',
 1, 'Obsidian Skies', 'Sci-Fi', 2025, 8.8, 'Captain Aya steers...', 'backdrop1.jpg', 'thumb1.jpg', 'trailer1.mp4', TRUE,
 1200, 7440, '2026-04-15 20:30:00',
 1, 'My Favorites', 'Sci-Fi,Action', 'English,Spanish', NULL, NULL, NULL),

(2, 1, 'John Doe', 'john@example.com', 'hashed_pass_123', 'avatar1.jpg',
 2, 'Red Harbor', 'Thriller', 2024, 8.2, 'An exiled detective...', 'backdrop2.jpg', 'thumb2.jpg', 'trailer2.mp4', TRUE,
 600, 6600, '2026-04-14 19:15:00',
 1, 'My Favorites', 'Sci-Fi,Action', 'English,Spanish', 'otp_hash_456', 'email_verification', '2026-04-16 09:00:00'),

(3, 2, 'Jane Smith', 'jane@example.com', 'hashed_pass_789', 'avatar2.jpg',
 1, 'Obsidian Skies', 'Sci-Fi', 2025, 8.8, 'Captain Aya steers...', 'backdrop1.jpg', 'thumb1.jpg', 'trailer1.mp4', TRUE,
 300, 7440, '2026-04-15 22:45:00',
 2, 'Weekend Movies', 'Drama,Romance', 'English,French', NULL, NULL, NULL);

-- Structured horizontal output (selected columns only)
SELECT
    row_id, user_id, name, email,
    movie_id, movie_title, movie_genre, movie_year,
    watch_position, last_watched,
    playlist_id, playlist_name,
    preferred_genres, preferred_languages,
    otp_type, expires_at
FROM netflix_data_unf
ORDER BY row_id;

-- Structured vertical output for full row details in MySQL CLI
SELECT * FROM netflix_data_unf WHERE row_id = 1\G
SELECT * FROM netflix_data_unf WHERE row_id = 2\G
```

### Pitfalls
- Redundancy, update anomaly, insert anomaly, delete anomaly.
- Non-atomic `preferred_genres` and `preferred_languages` columns.
- Mixed responsibilities: OTP data mixed with movie/watch data.

## 4.2 First Normal Form (1NF)

## 4.2.1 Identify dependency
- Repeating/non-atomic values in UNF (`preferred_genres`, `preferred_languages`).

## 4.2.2 Apply normalization to 1NF

### BEFORE
- `netflix_data_unf` 

### AFTER (base Netflix tables)
- `users`, `movies`, `watch_history`, `playlists`, `playlist_items`, `user_preferences` 

```sql
-- users
INSERT INTO users (id, name, email, password_hash, avatar_url, is_pending_profile)
SELECT DISTINCT user_id, name, email, password_hash, avatar_url, FALSE
FROM netflix_data_unf;

-- movies
INSERT INTO movies (id, slug, title, genre, year, rating, description, backdrop_url, thumbnail_url, trailer_url, featured)
SELECT DISTINCT 
    movie_id,
    LOWER(REPLACE(movie_title, ' ', '-')) as slug,
    movie_title,
    movie_genre,
    movie_year,
    movie_rating,
    movie_description,
    backdrop_url,
    thumbnail_url,
    trailer_url,
    featured
FROM netflix_data_unf
WHERE movie_id IS NOT NULL;

-- watch_history
INSERT INTO watch_history (user_id, movie_id, position_seconds, duration_seconds, last_watched_at)
SELECT DISTINCT
    user_id,
    movie_id,
    watch_position,
    watch_duration,
    last_watched
FROM netflix_data_unf
WHERE movie_id IS NOT NULL AND watch_position IS NOT NULL;

-- playlists
INSERT INTO playlists (user_id, name)
SELECT DISTINCT user_id, playlist_name
FROM netflix_data_unf
WHERE playlist_id IS NOT NULL AND playlist_name IS NOT NULL;

-- playlist_items
INSERT INTO playlist_items (playlist_id, movie_id)
SELECT DISTINCT
    p.id as playlist_id,
    u.movie_id
FROM netflix_data_unf u
JOIN playlists p ON p.user_id = u.user_id AND p.name = u.playlist_name
WHERE u.movie_id IS NOT NULL AND u.playlist_id IS NOT NULL;

-- user_preferences (base schema stores JSON directly)
INSERT INTO user_preferences (user_id, preferred_genres, preferred_languages)
SELECT DISTINCT
    user_id,
    CONCAT('["', REPLACE(preferred_genres, ',', '","'), '"]') as preferred_genres,
    CONCAT('["', REPLACE(preferred_languages, ',', '","'), '"]') as preferred_languages
FROM netflix_data_unf
WHERE preferred_genres IS NOT NULL AND preferred_languages IS NOT NULL;

SELECT id, name, email, created_at FROM users ORDER BY id;
SELECT id, slug, title, genre, year, rating FROM movies ORDER BY id;
SELECT id, user_id, movie_id, position_seconds, last_watched_at FROM watch_history ORDER BY id;
SELECT id, user_id, name FROM playlists ORDER BY id;
SELECT id, playlist_id, movie_id FROM playlist_items ORDER BY id;
SELECT id, user_id, preferred_genres FROM user_preferences ORDER BY id;
```

---

## 4.3 Second Normal Form (2NF)

## 4.3.1 Fault after 1NF (what is still wrong)
You said you already did 1NF, so now check this fault:

### BEFORE (1NF-style mixed rows)
If we keep user and preferences in one relation:
- Key becomes `(user_id, preference_type)`.
- But columns like `name`, `email` depend only on `user_id`.

This is a **partial dependency** (2NF violation).

## 4.3.2 Apply normalization to 2NF (solve this fault)

### AFTER
- Keep user facts only in `users`.
- Move repeating preference values to `user_genre_preferences(user_id, genre_name)` and `user_language_preferences(user_id, language_name)`.

```sql
SELECT id, name, email, avatar_url FROM users ORDER BY id;
```

> For strict 2NF preference design, create additional junction tables only if needed:

```sql
CREATE TABLE IF NOT EXISTS user_genre_preferences (
    user_id INT NOT NULL,
    genre_name VARCHAR(50) NOT NULL,
    preference_order INT DEFAULT 0,
    PRIMARY KEY (user_id, genre_name),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_language_preferences (
    user_id INT NOT NULL,
    language_name VARCHAR(50) NOT NULL,
    preference_order INT DEFAULT 0,
    PRIMARY KEY (user_id, language_name),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

INSERT INTO user_genre_preferences VALUES
(1, 'Sci-Fi', 1),
(1, 'Action', 2),
(2, 'Drama', 1),
(2, 'Romance', 2);

INSERT INTO user_language_preferences VALUES
(1, 'English', 1),
(1, 'Spanish', 2),
(2, 'English', 1),
(2, 'French', 2);

SELECT * FROM user_genre_preferences ORDER BY user_id, preference_order;
SELECT * FROM user_language_preferences ORDER BY user_id, preference_order;
```

✅ **Fault solved:** no partial dependency in preference relations.

---

## 4.4 Third Normal Form (3NF)

## 4.4.1 Fault after 2NF
Even after 2NF, transitive dependency can happen in denormalized design:
- `movie_id -> genre` 
- `genre -> genre_description` 

So `movie_id -> genre_description` is transitive if genre_description is copied in movie data.

## 4.4.2 Apply normalization to 3NF (solve this fault)

### AFTER
- `movies` stores only `genre`.
- `genres` stores `genre_description`.
- genre description is fetched by join (not duplicated).

### Important correction (as you pointed out)
`genre_description` must **not** be a column in `movies`.
Use this to verify:

```sql
DESC movies;
```

Expected movie columns are like:
`movie_id, slug, title, genre, year, rating, description, created_at` 

So, in insert statements, keep:
- ✅ `INSERT INTO movies (... genre, ... )` 
- ❌ not `INSERT INTO movies (... genre_description, ... )` 

```sql
SELECT
    m.id,
    m.title,
    m.genre
FROM movies m
ORDER BY m.id;
```

✅ **Fault solved:** transitive dependency removed from movie-level data.

---

## 4.5 Boyce-Codd Normal Form (BCNF)

## 4.5.1 Fault after 3NF
BCNF rule: in every FD `X -> Y`, determinant `X` must be a **candidate key**.

### Candidate key identification (explicit)
1. `users` 
   - Primary candidate key: `id` 
   - Alternate candidate key: `email` (because it is UNIQUE)
2. `movies` 
   - Primary candidate key: `id` 
   - Alternate candidate key: `slug` (UNIQUE)
3. `playlists` 
   - Primary candidate key: `id` 
   - Alternate candidate key we declare now: `(user_id, name)` 

So determinants such as `email`, `slug`, and `(user_id, name)` are valid because each is a candidate key.

## 4.5.2 Apply normalization to BCNF (solve this fault)

```sql
-- A) Declare candidate keys (alternate keys)
-- users.email (already unique in base schema; run only if missing)
ALTER TABLE users
ADD CONSTRAINT uq_users_email UNIQUE (email);

-- movies.slug (already unique in base schema)
ALTER TABLE movies
ADD CONSTRAINT uq_movies_slug UNIQUE (slug);

-- playlists(user_id, name) (add this for BCNF-safe determinant)
ALTER TABLE playlists
ADD CONSTRAINT uq_playlists_user_name UNIQUE (user_id, name);
```

> If a key already exists, MySQL will show duplicate-key-name/duplicate-index errors; that simply means it is already declared.

```sql
-- B) Make candidate keys visible (index-level proof)
SHOW INDEX FROM users;
SHOW INDEX FROM movies;
SHOW INDEX FROM playlists;

-- C) Table DDL proof
SHOW CREATE TABLE users;
SHOW CREATE TABLE movies;
SHOW CREATE TABLE playlists;

-- Check alternate key behavior for users.email
SELECT email, COUNT(*)
FROM users
GROUP BY email
HAVING COUNT(*) > 1;

-- Check alternate key behavior for movies.slug
SELECT slug, COUNT(*)
FROM movies
GROUP BY slug
HAVING COUNT(*) > 1;

-- Check alternate key behavior for playlists(user_id, name)
SELECT user_id, name, COUNT(*)
FROM playlists
GROUP BY user_id, name
HAVING COUNT(*) > 1;
```

✅ **Fault solved:** determinants are enforced with keys/unique constraints.

---

## 4.6 Fourth Normal Form (4NF)

## 4.6.1 Fault after BCNF
MVD example in UNF: `user_id ->-> preferred_genres`.

If genres are stored as CSV in one column, that is multivalued dependency problem.

## 4.6.2 Apply normalization to 4NF (solve this fault)
### BEFORE (problem table pattern)
`user_preferences` + `preferred_genres_csv` in one row:
- one user can have many independent genre values,
- storing all in one cell creates update/delete anomalies.

### AFTER (4NF decomposition)
1. Keep user facts in `users`.
2. Keep independent multivalued genres in `user_genre_preferences`.

Run these commands:

```sql
-- Create 4NF genre preference table (drop/recreate for clean run)
DROP TABLE IF EXISTS user_genre_preferences;
CREATE TABLE user_genre_preferences (
    pref_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    genre_name VARCHAR(50) NOT NULL,
    preference_order INT NOT NULL,
    CONSTRAINT fk_pref_user FOREIGN KEY (user_id)
        REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT uq_user_genre UNIQUE (user_id, genre_name)
);

-- 4NF genre preference rows (key-value style)
INSERT INTO user_genre_preferences (user_id, genre_name, preference_order) VALUES
(1, 'Sci-Fi', 1),
(1, 'Action', 2),
(2, 'Drama', 1),
(2, 'Romance', 2)
ON DUPLICATE KEY UPDATE preference_order = VALUES(preference_order);

-- Output 1: user (4NF) view
SELECT
    id AS user_id,
    name,
    email,
    avatar_url
FROM users
ORDER BY id;

-- Output 2: user_genre_preferences (4NF) view
SELECT
    pref_id,
    user_id,
    genre_name,
    preference_order
FROM user_genre_preferences
ORDER BY pref_id;
```

Expected output format:

**user (4NF)**

| user_id | name | email | avatar_url |
|---:|---|---|---|
| 1 | John Doe | john@example.com | avatar1.jpg |
| 2 | Jane Smith | jane@example.com | avatar2.jpg |

**user_genre_preferences (4NF)**

| pref_id | user_id | genre_name | preference_order |
|---:|---:|---|---|
| 1 | 1 | Sci-Fi | 1 |
| 2 | 1 | Action | 2 |
| 3 | 2 | Drama | 1 |
| 4 | 2 | Romance | 2 |

✅ **Fault solved:** multivalued genres are separated from user facts.

---

## 4.7 Fifth Normal Form (5NF)

## 4.7.1 Fault after 4NF
Join dependency appears if all streaming facts are forced into one giant relation.

## 4.7.2 Apply normalization to 5NF (solve this fault)
### BEFORE (join-dependency risk)
If we store user-movie-playlist relationship only indirectly, some role/context info can be lost in complex cases.

### AFTER (5NF with explicit ternary relation using actual Netflix tables)
Create `user_movie_playlist` as a junction table that explicitly stores the 3-way relationship.

```sql
DROP TABLE IF EXISTS user_movie_playlist;
CREATE TABLE user_movie_playlist (
    user_id INT NOT NULL,
    movie_id INT NOT NULL,
    playlist_id INT NOT NULL,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, movie_id, playlist_id),
    CONSTRAINT fk_ump_user FOREIGN KEY (user_id)
        REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_ump_movie FOREIGN KEY (movie_id)
        REFERENCES movies(id) ON DELETE CASCADE,
    CONSTRAINT fk_ump_playlist FOREIGN KEY (playlist_id)
        REFERENCES playlists(id) ON DELETE CASCADE
);

-- Populate from actual playlist_item rows
INSERT INTO user_movie_playlist (user_id, movie_id, playlist_id)
SELECT DISTINCT
    p.user_id,
    pi.movie_id,
    pi.playlist_id
FROM playlist_items pi
JOIN playlists p ON pi.playlist_id = p.id
WHERE pi.movie_id IS NOT NULL
ON DUPLICATE KEY UPDATE added_at = VALUES(added_at);

-- Output 1: playlist_items table (actual table)
SELECT
    id,
    playlist_id,
    movie_id,
    created_at
FROM playlist_items
ORDER BY id;

-- Output 2: 5NF ternary table
SELECT
    user_id,
    movie_id,
    playlist_id,
    added_at
FROM user_movie_playlist
ORDER BY user_id, movie_id, playlist_id;
```

Expected output format:

**playlist_items (5NF final context source)**

| id | playlist_id | movie_id | created_at |
|---:|---:|---:|---|
| 1 | 1 | 1 | 2026-04-15 20:30:00 |
| 2 | 1 | 2 | 2026-04-14 19:15:00 |

**user_movie_playlist (5NF ternary)**

| user_id | movie_id | playlist_id | added_at |
|---:|---:|---:|---|
| 1 | 1 | 1 | 2026-04-15 20:30:00 |
| 1 | 2 | 1 | 2026-04-14 19:15:00 |

✅ **Fault solved:** ternary join dependency is represented explicitly in a 5NF relation using actual Netflix tables.

---

## Final note
If you are using the `netflix` database with SQL command client, this chapter is now fully aligned and avoids referencing missing tables.
- `user_preferences.user_id` → `preferred_genres` (non-atomic)
- `user_preferences.user_id` → `preferred_languages` (non-atomic)
- `watch_history.user_id, watch_history.movie_id` → `watch_history.imdb_id` (redundant)
- `playlist_items.playlist_id, playlist_items.movie_id` → `playlist_items.imdb_id` (redundant)

### 4.2.2 Apply Normalization to 1NF

#### Before 1NF:
```sql
-- user_preferences table with JSON fields
CREATE TABLE user_preferences (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  preferred_genres JSON,  -- Non-atomic
  preferred_languages JSON,  -- Non-atomic
  -- other fields...
);

-- watch_history with duplicate identifiers
CREATE TABLE watch_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  movie_id INT NULL,
  imdb_id VARCHAR(20) NULL,  -- Redundant with movie_id
  -- other fields...
);
```

#### After 1NF - Commands to Execute:
```sql
-- Step 1: Create genre lookup table
CREATE TABLE genres (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Step 2: Create language lookup table
CREATE TABLE languages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(10) NOT NULL UNIQUE,  -- e.g., 'en', 'es', 'fr'
  name VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Step 3: Create user_genre_preferences junction table
CREATE TABLE user_genre_preferences (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  genre_id INT NOT NULL,
  preference_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_user_genre (user_id, genre_id),
  CONSTRAINT fk_user_genre_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_user_genre_genre FOREIGN KEY (genre_id) REFERENCES genres(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Step 4: Create user_language_preferences junction table
CREATE TABLE user_language_preferences (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  language_id INT NOT NULL,
  preference_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_user_language (user_id, language_id),
  CONSTRAINT fk_user_lang_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_user_lang_language FOREIGN KEY (language_id) REFERENCES languages(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Step 5: Update movies table to reference genre properly
ALTER TABLE movies ADD COLUMN genre_id INT NULL;
ALTER TABLE movies ADD CONSTRAINT fk_movies_genre FOREIGN KEY (genre_id) REFERENCES genres(id) ON DELETE SET NULL;

-- Step 6: Remove redundant imdb_id from watch_history
ALTER TABLE watch_history DROP COLUMN imdb_id;

-- Step 7: Remove redundant imdb_id from playlist_items
ALTER TABLE playlist_items DROP COLUMN imdb_id;

-- Step 8: Remove JSON fields from user_preferences
ALTER TABLE user_preferences DROP COLUMN preferred_genres;
ALTER TABLE user_preferences DROP COLUMN preferred_languages;
```

---

## 4.3 Second Normal Form (2NF)

### 4.3.1 Identify Dependency

**Current tables are already mostly in 2NF, but we can identify:**

**Partial Dependencies:**
- `movies.genre_id` → `genre.name` (should be in separate table)
- `user_preferences.user_id` → `user_preferences.name, user_preferences.phone, user_preferences.date_of_birth, user_preferences.gender` (all depend on full key)

**No partial dependencies found** as all tables have single-column primary keys or proper composite keys where all attributes depend on the entire key.

### 4.3.2 Apply Normalization to 2NF

#### Before 2NF:
The current structure after 1NF is already in 2NF. However, we can improve by creating more specific tables:

#### After 2NF - Commands to Execute:
```sql
-- Step 1: Create separate user_profile table for basic profile info
CREATE TABLE user_profiles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  name VARCHAR(80),
  phone VARCHAR(20),
  date_of_birth DATE,
  gender ENUM('male', 'female', 'other', 'prefer_not_to_say'),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_user_profile_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Step 2: Simplify user_preferences to only contain preference settings
ALTER TABLE user_preferences DROP COLUMN name;
ALTER TABLE user_preferences DROP COLUMN phone;
ALTER TABLE user_preferences DROP COLUMN date_of_birth;
ALTER TABLE user_preferences DROP COLUMN gender;

-- Step 3: Add default genres to genres table
INSERT INTO genres (name) VALUES 
('Action'), ('Adventure'), ('Comedy'), ('Drama'), ('Fantasy'), 
('Horror'), ('Romance'), ('Sci-Fi'), ('Thriller'), ('Animation');

-- Step 4: Add default languages to languages table
INSERT INTO languages (code, name) VALUES 
('en', 'English'), ('es', 'Spanish'), ('fr', 'French'), 
('de', 'German'), ('it', 'Italian'), ('pt', 'Portuguese'), 
('ja', 'Japanese'), ('ko', 'Korean'), ('zh', 'Chinese');
```

---

## 4.4 Third Normal Form (3NF)

### 4.4.1 Identify Dependency

**Transitive Dependencies Found:**
1. **In movies table**: `movies.genre_id` → `genre.name` (already resolved in 2NF)
2. **In users table**: No transitive dependencies found
3. **In watch_history**: No transitive dependencies found
4. **In playlists**: No transitive dependencies found

**Potential Issues:**
- User email and password hash are in the same table (security consideration)
- Movie URLs could potentially be normalized

### 4.4.2 Apply Normalization to 3NF

#### Before 3NF:
Current structure is mostly in 3NF, but we can improve security and organization:

#### After 3NF - Commands to Execute:
```sql
-- Step 1: Create separate user_auth table for authentication data
CREATE TABLE user_auth (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  email VARCHAR(191) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  is_pending_profile BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_user_auth_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Step 2: Create movie_media table for media URLs
CREATE TABLE movie_media (
  id INT AUTO_INCREMENT PRIMARY KEY,
  movie_id INT NOT NULL UNIQUE,
  backdrop_url VARCHAR(300),
  thumbnail_url VARCHAR(300),
  trailer_url VARCHAR(300),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_movie_media_movie FOREIGN KEY (movie_id) REFERENCES movies(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Step 3: Move authentication data from users to user_auth
INSERT INTO user_auth (user_id, email, password_hash, is_pending_profile)
SELECT id, email, password_hash, is_pending_profile FROM users;

-- Step 4: Remove authentication fields from users table
ALTER TABLE users DROP COLUMN email;
ALTER TABLE users DROP COLUMN password_hash;
ALTER TABLE users DROP COLUMN is_pending_profile;

-- Step 5: Move media URLs from movies to movie_media
INSERT INTO movie_media (movie_id, backdrop_url, thumbnail_url, trailer_url)
SELECT id, backdrop_url, thumbnail_url, trailer_url FROM movies;

-- Step 6: Remove media fields from movies table
ALTER TABLE movies DROP COLUMN backdrop_url;
ALTER TABLE movies DROP COLUMN thumbnail_url;
ALTER TABLE movies DROP COLUMN trailer_url;

-- Step 7: Create user_security_settings table for additional security
CREATE TABLE user_security_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  two_factor_enabled BOOLEAN DEFAULT FALSE,
  last_password_change TIMESTAMP NULL,
  login_attempts INT DEFAULT 0,
  locked_until TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_user_security_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;
```

---

## 4.5 Boyce-Codd Normal Form (BCNF)

### 4.5.1 Identify Dependency

**BCNF Violations Analysis:**
- All tables are now in BCNF
- Every determinant is a candidate key
- No overlapping candidate keys found
- All functional dependencies are properly normalized

**Verification:**
1. **users**: `id` is the only candidate key ✓
2. **user_auth**: `user_id` and `email` are candidate keys ✓
3. **user_profiles**: `user_id` is the only candidate key ✓
4. **movies**: `id` and `slug` are candidate keys ✓
5. **genres**: `id` and `name` are candidate keys ✓
6. **languages**: `id` and `code` are candidate keys ✓
7. **All junction tables**: Composite keys are properly defined ✓

### 4.5.2 Apply Normalization to BCNF

#### Current structure is already in BCNF. No additional normalization needed.

#### Final Optimization Commands:
```sql
-- Step 1: Add proper indexes for performance
CREATE INDEX idx_movies_genre ON movies(genre_id);
CREATE INDEX idx_movies_year ON movies(year);
CREATE INDEX idx_movies_featured ON movies(featured);
CREATE INDEX idx_watch_history_user ON watch_history(user_id);
CREATE INDEX idx_watch_history_last_watched ON watch_history(last_watched_at);
CREATE INDEX idx_playlists_user ON playlists(user_id);
CREATE INDEX idx_playlist_items_playlist ON playlist_items(playlist_id);

-- Step 2: Add check constraints for data integrity
ALTER TABLE movies ADD CONSTRAINT chk_movies_year CHECK (year >= 1900 AND year <= YEAR(CURRENT_DATE) + 5);
ALTER TABLE movies ADD CONSTRAINT chk_movies_rating CHECK (rating >= 0 AND rating <= 10);
ALTER TABLE movies ADD CONSTRAINT chk_movies_duration CHECK (duration_minutes > 0);
ALTER TABLE watch_history ADD CONSTRAINT chk_watch_position CHECK (position_seconds >= 0);
ALTER TABLE watch_history ADD CONSTRAINT chk_watch_duration CHECK (duration_seconds >= 0);

-- Step 3: Create view for complete user information
CREATE VIEW user_complete_view AS
SELECT 
    u.id,
    u.avatar_url,
    u.created_at as user_created_at,
    ua.email,
    ua.is_pending_profile,
    up.name,
    up.phone,
    up.date_of_birth,
    up.gender,
    us.two_factor_enabled,
    us.last_password_change
FROM users u
LEFT JOIN user_auth ua ON u.id = ua.user_id
LEFT JOIN user_profiles up ON u.id = up.user_id
LEFT JOIN user_security_settings us ON u.id = us.user_id;

-- Step 4: Create view for complete movie information
CREATE VIEW movie_complete_view AS
SELECT 
    m.id,
    m.slug,
    m.title,
    m.tagline,
    m.year,
    m.duration_minutes,
    m.rating,
    m.description,
    m.featured,
    m.created_at,
    g.name as genre_name,
    mm.backdrop_url,
    mm.thumbnail_url,
    mm.trailer_url
FROM movies m
LEFT JOIN genres g ON m.genre_id = g.id
LEFT JOIN movie_media mm ON m.id = mm.movie_id;
```

---

## Summary of Normalization Process

### Final Database Structure After Normalization:

**Core Tables:**
- `users` - Basic user entity
- `user_auth` - Authentication data
- `user_profiles` - Profile information
- `user_security_settings` - Security preferences
- `movies` - Movie catalog
- `movie_media` - Movie media URLs
- `genres` - Genre lookup
- `languages` - Language lookup

**Junction Tables:**
- `user_genre_preferences` - User genre preferences
- `user_language_preferences` - User language preferences

**Application Tables:**
- `watch_history` - Viewing history
- `playlists` - User playlists
- `playlist_items` - Playlist contents
- `password_reset_otps` - Password reset tokens
- `email_verification_otps` - Email verification tokens
- `temp_signup_passwords` - Temporary signup data

### Benefits Achieved:
1. **Eliminated redundancy** - No duplicate data storage
2. **Improved data integrity** - Proper constraints and relationships
3. **Enhanced security** - Separated authentication data
4. **Better performance** - Proper indexing and optimized queries
5. **Maintainability** - Clear separation of concerns
6. **Scalability** - Structure supports future enhancements

### Commands to Execute Complete Normalization:
```sql
-- Execute all commands from sections 4.2.2, 4.3.2, 4.4.2, and 4.5.2 in order
-- This will transform the database from unnormalized to BCNF
```

The database is now fully normalized to BCNF with proper relationships, constraints, and optimizations for a production Netflix clone application.
