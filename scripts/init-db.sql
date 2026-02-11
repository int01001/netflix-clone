CREATE DATABASE IF NOT EXISTS netflix_local CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE netflix_local;

-- Reset movie/favorite tables so schema stays in sync with seed
DROP TABLE IF EXISTS watch_history;
DROP TABLE IF EXISTS favorites;
DROP TABLE IF EXISTS movies;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(80) NOT NULL,
  email VARCHAR(191) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  avatar_url VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS movies (
  id INT AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(191) NOT NULL UNIQUE,
  title VARCHAR(150) NOT NULL,
  tagline VARCHAR(255),
  genre VARCHAR(50),
  year INT,
  duration_minutes INT,
  rating DECIMAL(3,1) DEFAULT 0,
  description TEXT,
  backdrop_url VARCHAR(300),
  thumbnail_url VARCHAR(300),
  trailer_url VARCHAR(300),
  featured TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS watch_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  movie_id INT NULL,
  imdb_id VARCHAR(20) NULL,
  position_seconds INT NOT NULL DEFAULT 0,
  duration_seconds INT NOT NULL DEFAULT 0,
  last_watched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_user_movie (user_id, movie_id),
  UNIQUE KEY uniq_user_imdb (user_id, imdb_id),
  CONSTRAINT fk_history_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_history_movie FOREIGN KEY (movie_id) REFERENCES movies(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS favorites (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  movie_id INT NULL,
  imdb_id VARCHAR(20) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_user_movie (user_id, movie_id),
  UNIQUE KEY uniq_user_imdb (user_id, imdb_id),
  CONSTRAINT fk_favorites_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_favorites_movie FOREIGN KEY (movie_id) REFERENCES movies(id) ON DELETE CASCADE
) ENGINE=InnoDB;

INSERT INTO movies (slug, title, tagline, genre, year, duration_minutes, rating, description, backdrop_url, thumbnail_url, trailer_url, featured)
VALUES
  ('obsidian-skies', 'Obsidian Skies', 'Humanity''s last ark crosses a stormy cosmos.', 'Sci-Fi', 2025, 124, 8.8,
   'Captain Aya steers a fractured crew through a nebula of living dark matter before it swallows the ark whole.',
   'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?auto=format&fit=crop&w=1600&q=80',
   'https://images.unsplash.com/photo-1502134249126-9f3755a50d78?auto=format&fit=crop&w=800&q=80',
   'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', 1),
  ('red-harbor', 'Red Harbor', 'A detective returns home to a city that forgot him.', 'Thriller', 2024, 110, 8.2,
   'An exiled detective digs into a string of dockside murders while tides of corruption threaten the people he loves.',
   'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=80',
   'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80',
   'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4', 1),
  ('solstice-run', 'Solstice Run', 'Speed is currency in the desert sprawl.', 'Action', 2023, 102, 7.9,
   'Bike courier Lani joins an outlaw crew to outrun a tech cartel before the solstice eclipse shuts the city down.',
   'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=80',
   'https://images.unsplash.com/photo-1519125323398-675f0ddb6308?auto=format&fit=crop&w=800&q=80',
   'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4', 0),
  ('midnight-parade', 'Midnight Parade', 'A haunted carnival rolls into town.', 'Horror', 2022, 98, 7.5,
   'Teenage siblings uncover why the traveling carnival never stays past dawn and why no one remembers seeing it leave.',
   'https://images.unsplash.com/photo-1502134249126-9f3755a50d78?auto=format&fit=crop&w=1600&q=80',
   'https://images.unsplash.com/photo-1502134249126-9f3755a50d78?auto=format&fit=crop&w=800&q=80',
   'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4', 0),
  ('silk-road', 'Silk Road', 'A chef chases flavor across borders and scars.', 'Drama', 2021, 119, 8.1,
   'After losing her restaurant, Mei embarks on a train journey to recreate her grandmother''s forbidden recipe.',
   'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?auto=format&fit=crop&w=1600&q=80',
   'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?auto=format&fit=crop&w=800&q=80',
   'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/VolkswagenGTIReview.mp4', 0),
  ('tidecall', 'Tidecall', 'The ocean remembers everything.', 'Fantasy', 2020, 107, 7.7,
   'A marine biologist hears voices in tidal patterns that lead her to an underwater civilization on the brink.',
   'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1600&q=80',
   'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
   'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4', 0),
  ('emberline', 'Emberline', 'Love at the edge of the wildfire.', 'Romance', 2020, 101, 7.3,
   'Two smokejumpers navigate duty and desire while defending a mountain town from record-breaking fires.',
   'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=80',
   'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80',
   'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4', 0),
  ('shadow-miners', 'Shadow Miners', 'Pay dirt comes with a curse.', 'Adventure', 2019, 116, 7.8,
   'In the Arctic night, a crew discovers an alien alloy and must choose between fortune and survival.',
   'https://images.unsplash.com/photo-1502134249126-9f3755a50d78?auto=format&fit=crop&w=1600&q=80',
   'https://images.unsplash.com/photo-1519125323398-675f0ddb6308?auto=format&fit=crop&w=800&q=80',
   'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4', 0),
  ('paper-cities', 'Paper Cities', 'Architects rewrite skylines overnight.', 'Drama', 2018, 112, 7.6,
   'A visionary architect joins a guerilla collective to rebuild neglected blocks before dawn raids begin.',
   'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=80',
   'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80',
   'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4', 0),
  ('glacier-heart', 'Glacier Heart', 'A surgeon trapped in a blizzard field hospital.', 'Thriller', 2018, 105, 7.4,
   'When avalanches cut power, Dr. Noor improvises miracles while strangers close in with a secret payload.',
   'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1600&q=80',
   'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
   'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4', 0)
ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP;
