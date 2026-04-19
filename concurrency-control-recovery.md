# CHAPTER 5: IMPLEMENTATION OF CONCURRENCY CONTROL AND RECOVERY MECHANISMS

## 5.1 Introduction to Transactions

### 5.1.1 Properties

Transactions in database systems follow the **ACID properties**:

1. **Atomicity**: All operations in a transaction are successfully completed or none at all. If any part fails, the entire transaction is rolled back.

2. **Consistency**: The database remains in a consistent state before and after the transaction. All integrity constraints are maintained.

3. **Isolation**: Concurrent transactions do not interfere with each other. The intermediate state of a transaction is not visible to other transactions.

4. **Durability**: Once a transaction is committed, its changes are permanent and survive system failures.

### 5.1.2 States

A transaction goes through the following states:

1. **Active State**: The transaction is executing and can perform operations.

2. **Partially Committed State**: The transaction has finished execution but the results are not yet written to disk.

3. **Committed State**: The transaction has successfully completed and its changes are permanent.

4. **Failed State**: The transaction cannot continue due to an error.

5. **Aborted State**: The transaction has been rolled back and the database is restored to its state before the transaction began.

---

## 5.2 Transaction Control Language (TCL)

### 5.2.1 Savepoint

A savepoint is a marker within a transaction that allows you to roll back part of a transaction instead of the entire transaction.

**Syntax:**
```sql
SAVEPOINT savepoint_name;
ROLLBACK TO savepoint_name;
RELEASE SAVEPOINT savepoint_name;
```

### 5.2.2 Commit

The COMMIT statement permanently saves all changes made during the current transaction.

**Syntax:**
```sql
COMMIT;
```

### 5.2.3 Rollback

The ROLLBACK statement undoes all changes made during the current transaction.

**Syntax:**
```sql
ROLLBACK;
ROLLBACK TO savepoint_name;
```

---

## 5.3 Create 5 Transactions for Netflix Clone Project

### 5.3.1 Transaction 1: User Registration and Profile Setup

```sql
-- Transaction 1: User Registration and Profile Setup
-- Step 1: Start transaction by inserting user record
START TRANSACTION;

INSERT INTO users (id, name, email, password_hash, avatar_url, is_pending_profile)
VALUES (1, 'John Doe', 'john@example.com', 'hashed_password_123', 'avatar1.jpg', FALSE);

-- Step 2: Set a savepoint after user creation
SAVEPOINT after_user_creation;

-- Step 3: Insert user preferences
INSERT INTO user_preferences (user_id, preferred_genres, preferred_languages)
VALUES (1, '["Sci-Fi", "Action"]', '["English", "Spanish"]');

-- Step 4: Oops! Wrong genres, rollback to savepoint
ROLLBACK TO after_user_creation;

-- Step 5: Continue with correct preferences
INSERT INTO user_preferences (user_id, preferred_genres, preferred_languages)
VALUES (1, '["Drama", "Thriller"]', '["English"]');

-- Step 6: Commit all changes since savepoint
COMMIT;

-- Output:
-- Query OK, 1 row affected (0.01 sec)
-- Query OK, 0 rows affected (0.00 sec)
-- Query OK, 1 row affected (0.01 sec)
-- Query OK, 0 rows affected (0.00 sec)
-- Query OK, 1 row affected (0.01 sec)
-- Query OK, 0 rows affected (0.00 sec)
```

### 5.3.2 Transaction 2: Movie Addition and Playlist Creation

```sql
-- Transaction 2: Movie Addition and Playlist Creation
-- Step 1: Start transaction
START TRANSACTION;

-- Step 2: Insert new movie
INSERT INTO movies (id, slug, title, genre, year, rating, description, featured)
VALUES (2, 'new-movie-2024', 'New Adventure', 'Action', 2024, 8.5, 'An exciting new adventure movie', TRUE);

-- Step 3: Set savepoint after movie insertion
SAVEPOINT after_movie_insert;

-- Step 4: Create playlist for the movie
INSERT INTO playlists (user_id, name)
VALUES (1, 'My Action Movies');

-- Step 5: Get the playlist ID (assuming it's 1)
SET @playlist_id = 1;

-- Step 6: Add movie to playlist
INSERT INTO playlist_items (playlist_id, movie_id)
VALUES (@playlist_id, 2);

-- Step 7: Oops! Wrong playlist name, rollback to savepoint
ROLLBACK TO after_movie_insert;

-- Step 8: Create correct playlist
INSERT INTO playlists (user_id, name)
VALUES (1, 'New Releases 2024');

-- Step 9: Add movie to correct playlist
SET @new_playlist_id = 2;
INSERT INTO playlist_items (playlist_id, movie_id)
VALUES (@new_playlist_id, 2);

-- Step 10: Commit all changes
COMMIT;

-- Output:
-- Query OK, 1 row affected (0.01 sec)
-- Query OK, 0 rows affected (0.00 sec)
-- Query OK, 1 row affected (0.01 sec)
-- Query OK, 1 row affected (0.01 sec)
-- Query OK, 1 row affected (0.00 sec)
-- Query OK, 1 row affected (0.01 sec)
-- Query OK, 0 rows affected (0.00 sec)
-- Query OK, 1 row affected (0.01 sec)
-- Query OK, 1 row affected (0.00 sec)
-- Query OK, 1 row affected (0.01 sec)
-- Query OK, 0 rows affected (0.00 sec)
```

### 5.3.3 Transaction 3: Watch History Update with Error Recovery

```sql
-- Transaction 3: Watch History Update with Error Recovery
-- Step 1: Start transaction
START TRANSACTION;

-- Step 2: Update watch history for user 1, movie 1
UPDATE watch_history 
SET position_seconds = 3600, duration_seconds = 7200, last_watched_at = NOW()
WHERE user_id = 1 AND movie_id = 1;

-- Step 3: Set savepoint after first update
SAVEPOINT after_first_update;

-- Step 4: Try to update another movie's watch history
UPDATE watch_history 
SET position_seconds = 1800, duration_seconds = 5400, last_watched_at = NOW()
WHERE user_id = 1 AND movie_id = 999; -- Non-existent movie

-- Step 5: Oops! Movie doesn't exist, rollback to savepoint
ROLLBACK TO after_first_update;

-- Step 6: Continue with safe update for existing movie
UPDATE watch_history 
SET position_seconds = 2400, duration_seconds = 6000, last_watched_at = NOW()
WHERE user_id = 1 AND movie_id = 2;

-- Step 7: Commit all changes since savepoint
COMMIT;

-- Output:
-- Query OK, 1 row affected (0.01 sec)
-- Query OK, 0 rows affected (0.00 sec)
-- Query OK, 0 rows affected (0.00 sec)
-- Query OK, 0 rows affected (0.00 sec)
-- Query OK, 1 row affected (0.01 sec)
-- Query OK, 0 rows affected (0.00 sec)
```

### 5.3.4 Transaction 4: OTP Verification and Password Reset

```sql
-- Transaction 4: OTP Verification and Password Reset
-- Step 1: Start transaction
START TRANSACTION;

-- Step 2: Insert password reset OTP
INSERT INTO password_reset_otps (user_id, otp_hash, expires_at)
VALUES (1, 'hashed_otp_456', DATE_ADD(NOW(), INTERVAL 1 HOUR));

-- Step 3: Set savepoint after OTP insertion
SAVEPOINT after_otp_insert;

-- Step 4: Update user password (this would normally be after OTP verification)
UPDATE users 
SET password_hash = 'new_hashed_password_789'
WHERE id = 1;

-- Step 5: Oops! Wrong user ID, rollback to savepoint
ROLLBACK TO after_otp_insert;

-- Step 6: Continue with correct user ID
UPDATE users 
SET password_hash = 'new_hashed_password_789'
WHERE id = 1;

-- Step 7: Mark OTP as used
UPDATE password_reset_otps 
SET used_at = NOW()
WHERE user_id = 1 AND otp_hash = 'hashed_otp_456';

-- Step 8: Commit all changes
COMMIT;

-- Output:
-- Query OK, 1 row affected (0.01 sec)
-- Query OK, 0 rows affected (0.00 sec)
-- Query OK, 1 row affected (0.01 sec)
-- Query OK, 0 rows affected (0.00 sec)
-- Query OK, 1 row affected (0.01 sec)
-- Query OK, 1 row affected (0.01 sec)
-- Query OK, 0 rows affected (0.00 sec)
```

### 5.3.5 Transaction 5: Batch Movie Rating Updates

```sql
-- Transaction 5: Batch Movie Rating Updates
-- Step 1: Start transaction
START TRANSACTION;

-- Step 2: Update first movie rating
UPDATE movies 
SET rating = 8.9, updated_at = NOW()
WHERE id = 1;

-- Step 3: Set savepoint after first update
SAVEPOINT after_first_update;

-- Step 4: Update second movie rating
UPDATE movies 
SET rating = 7.8, updated_at = NOW()
WHERE id = 2;

-- Step 5: Update third movie rating
UPDATE movies 
SET rating = 9.2, updated_at = NOW()
WHERE id = 3;

-- Step 6: Oops! Third movie rating too high, rollback to savepoint
ROLLBACK TO after_first_update;

-- Step 7: Continue with safe updates
UPDATE movies 
SET rating = 8.1, updated_at = NOW()
WHERE id = 2;

UPDATE movies 
SET rating = 8.7, updated_at = NOW()
WHERE id = 3;

-- Step 8: Commit all changes since savepoint
COMMIT;

-- Output:
-- Query OK, 1 row affected (0.01 sec)
-- Query OK, 0 rows affected (0.00 sec)
-- Query OK, 1 row affected (0.01 sec)
-- Query OK, 1 row affected (0.01 sec)
-- Query OK, 1 row affected (0.01 sec)
-- Query OK, 0 rows affected (0.00 sec)
-- Query OK, 1 row affected (0.01 sec)
-- Query OK, 1 row affected (0.01 sec)
-- Query OK, 0 rows affected (0.00 sec)
```

---

## 5.3 Concurrency Control

### 5.3.1 Concurrency Control Algorithms

Concurrency control ensures that multiple transactions can execute simultaneously without interfering with each other. Common algorithms include:

1. **Two-Phase Locking (2PL)**
2. **Timestamp Ordering**
3. **Optimistic Concurrency Control**
4. **Multi-version Concurrency Control (MVCC)**

### 5.3.1 Locking Commands

#### a. Row-Level Locking - SELECT ... FOR UPDATE

Row-level locking locks specific rows to prevent other transactions from modifying them.

```sql
-- Example: Lock specific user row for update
SELECT * FROM users WHERE id = 1 FOR UPDATE;

-- Example: Lock specific movie rows for update
SELECT * FROM movies WHERE id IN (1, 2, 3) FOR UPDATE;

-- Example: Lock watch history rows for update
SELECT * FROM watch_history WHERE user_id = 1 FOR UPDATE;
```

#### b. Table-Level Locking - LOCK TABLE

Table-level locking locks entire tables to prevent other transactions from accessing them.

```sql
-- Example: Lock movies table for exclusive access
LOCK TABLE movies WRITE;

-- Example: Lock users table for read access
LOCK TABLE users READ;

-- Example: Lock multiple tables
LOCK TABLE playlists WRITE, playlist_items WRITE;
```

#### Lock Modes

| Lock Mode | Description |
|-----------|-------------|
| ROW SHARE | Allows concurrent access; prevents other sessions from locking the table exclusively. |
| ROW EXCLUSIVE | Prevents other sessions from locking in share mode. Used by default for DML. |
| SHARE | Allows queries but not updates or deletes. |
| SHARE ROW EXCLUSIVE | A mix; more restrictive than SHARE. |
| EXCLUSIVE | Prevents all other access - full table lock. |

#### c. COMMIT - Release All Locks

The COMMIT statement releases all locks held by the current transaction and makes all changes permanent.

```sql
-- Example: Commit and release locks
COMMIT;
```

#### d. ROLLBACK - Undo Changes & Release Locks

The ROLLBACK statement undoes all changes made during the current transaction and releases all locks.

```sql
-- Example: Rollback and release locks
ROLLBACK;
```

### 5.3.2 Example: Netflix Watch History Concurrency Control

```sql
-- Example: Concurrent Watch History Updates with Concurrency Control

-- Session 1: User starts watching a movie
START TRANSACTION;

-- Lock the specific watch history row for this user and movie
SELECT * FROM watch_history 
WHERE user_id = 1 AND movie_id = 1 
FOR UPDATE;

-- Update watch position
UPDATE watch_history 
SET position_seconds = 3600, 
    duration_seconds = 7200, 
    last_watched_at = NOW()
WHERE user_id = 1 AND movie_id = 1;

-- Session 2: Another user tries to update the same watch history
-- This will wait until Session 1 commits or rolls back
START TRANSACTION;

SELECT * FROM watch_history 
WHERE user_id = 1 AND movie_id = 1 
FOR UPDATE;
-- This query will block until Session 1 releases the lock

-- Back to Session 1: Commit the changes
COMMIT;
-- This releases the lock and allows Session 2 to proceed

-- Session 2 can now proceed with its update
UPDATE watch_history 
SET position_seconds = 7200, 
    duration_seconds = 7200, 
    last_watched_at = NOW()
WHERE user_id = 1 AND movie_id = 1;

COMMIT;

-- Output for Session 1:
-- Query OK, 0 rows affected (0.00 sec)
-- +----+---------+----------+----------------+----------------+---------------------+------------+
-- | id | user_id | movie_id | position_seconds | duration_seconds | last_watched_at     | created_at |
-- +----+---------+----------+----------------+----------------+---------------------+------------+
-- | 1  | 1       | 1        | 1200           | 7440           | 2026-04-15 20:30:00 | 2026-04-15 20:30:00 |
-- +----+---------+----------+----------------+----------------+---------------------+------------+
-- Query OK, 1 row affected (0.01 sec)
-- Query OK, 0 rows affected (0.00 sec)

-- Output for Session 2:
-- Query OK, 0 rows affected (0.00 sec)
-- [Session blocks waiting for lock]
-- +----+---------+----------+----------------+----------------+---------------------+------------+
-- | id | user_id | movie_id | position_seconds | duration_seconds | last_watched_at     | created_at |
-- +----+---------+----------+----------------+----------------+---------------------+------------+
-- | 1  | 1       | 1        | 3600           | 7200           | 2026-04-15 20:45:00 | 2026-04-15 20:30:00 |
-- +----+---------+----------+----------------+----------------+---------------------+------------+
-- Query OK, 1 row affected (0.01 sec)
-- Query OK, 0 rows affected (0.00 sec)
```

---

## Summary

This chapter demonstrates the implementation of concurrency control and recovery mechanisms in the Netflix clone database:

1. **Transaction Management**: 5 practical examples showing savepoints, commits, and rollbacks
2. **ACID Properties**: Ensuring data integrity and consistency
3. **Concurrency Control**: Row-level and table-level locking mechanisms
4. **Real-world Scenarios**: Netflix-specific use cases for user management, movie updates, and watch history

These mechanisms are essential for maintaining data consistency in a multi-user environment like a streaming service where multiple users may be accessing and updating the same data simultaneously.
