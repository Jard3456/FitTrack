CREATE DATABASE IF NOT EXISTS fittrack
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE fittrack;

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('usuario', 'entrenador', 'administrador') NOT NULL DEFAULT 'usuario',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email)
);

CREATE TABLE IF NOT EXISTS user_progress (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  weight DECIMAL(6,2) NULL,
  target_weight DECIMAL(6,2) NULL,
  height DECIMAL(4,2) NULL,
  objective VARCHAR(120) NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_progress_user (user_id),
  CONSTRAINT fk_progress_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS weight_history (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  weight DECIMAL(6,2) NOT NULL,
  recorded_date DATE NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_weight_history_user_date (user_id, recorded_date),
  KEY idx_weight_history_user (user_id),
  CONSTRAINT fk_weight_history_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS custom_exercises (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(160) NOT NULL,
  type VARCHAR(80) NOT NULL,
  muscle VARCHAR(120) NOT NULL,
  difficulty VARCHAR(80) NOT NULL,
  equipment VARCHAR(160) NOT NULL,
  instructions TEXT NOT NULL,
  safety_info TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_custom_exercises_user (user_id),
  CONSTRAINT fk_custom_exercises_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS trainer_user_assignments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  trainer_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_trainer_assignment_user (user_id),
  KEY idx_trainer_assignments_trainer (trainer_id),
  CONSTRAINT fk_trainer_assignment_trainer
    FOREIGN KEY (trainer_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_trainer_assignment_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS routines (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  trainer_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(160) NOT NULL,
  level VARCHAR(60) NOT NULL,
  duration_minutes SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  scheduled_date DATE NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_routines_trainer (trainer_id),
  KEY idx_routines_user (user_id),
  CONSTRAINT fk_routines_trainer
    FOREIGN KEY (trainer_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_routines_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS routine_exercises (
  routine_id BIGINT UNSIGNED NOT NULL,
  exercise_id BIGINT UNSIGNED NOT NULL,
  exercise_order SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  PRIMARY KEY (routine_id, exercise_id),
  KEY idx_routine_exercises_exercise (exercise_id),
  CONSTRAINT fk_routine_exercises_routine
    FOREIGN KEY (routine_id) REFERENCES routines(id) ON DELETE CASCADE,
  CONSTRAINT fk_routine_exercises_exercise
    FOREIGN KEY (exercise_id) REFERENCES custom_exercises(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS routine_completions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  routine_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  completed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  total_exercises SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_routine_completions_routine (routine_id),
  KEY idx_routine_completions_user (user_id),
  CONSTRAINT fk_routine_completions_routine
    FOREIGN KEY (routine_id) REFERENCES routines(id) ON DELETE CASCADE,
  CONSTRAINT fk_routine_completions_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS exercise_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  completion_id BIGINT UNSIGNED NOT NULL,
  routine_id BIGINT UNSIGNED NOT NULL,
  exercise_id BIGINT UNSIGNED NULL,
  exercise_name VARCHAR(160) NOT NULL,
  exercise_type VARCHAR(80) NOT NULL,
  weight_kg DECIMAL(7,2) NULL,
  duration_minutes DECIMAL(7,2) NULL,
  notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_exercise_logs_completion (completion_id),
  KEY idx_exercise_logs_routine (routine_id),
  CONSTRAINT fk_exercise_logs_completion
    FOREIGN KEY (completion_id) REFERENCES routine_completions(id) ON DELETE CASCADE,
  CONSTRAINT fk_exercise_logs_routine
    FOREIGN KEY (routine_id) REFERENCES routines(id) ON DELETE CASCADE
);
