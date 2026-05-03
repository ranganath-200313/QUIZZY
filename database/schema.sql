-- Quiz Application Database Schema
-- Run this file to set up the database

CREATE DATABASE IF NOT EXISTS quizapp CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE quizapp;

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('student', 'teacher') NOT NULL DEFAULT 'student',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Questions table
CREATE TABLE IF NOT EXISTS questions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  question_text TEXT NOT NULL,
  option_a VARCHAR(255) NOT NULL,
  option_b VARCHAR(255) NOT NULL,
  option_c VARCHAR(255) NOT NULL,
  option_d VARCHAR(255) NOT NULL,
  correct_answer ENUM('A', 'B', 'C', 'D') NOT NULL,
  category VARCHAR(100) DEFAULT 'General',
  difficulty ENUM('easy', 'medium', 'hard') DEFAULT 'medium',
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Quiz results table
CREATE TABLE IF NOT EXISTS quiz_results (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  score INT NOT NULL,
  total_questions INT NOT NULL,
  percentage DECIMAL(5,2) NOT NULL,
  answers_json JSON,
  time_taken INT DEFAULT 0,  -- in seconds
  taken_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Seed some default questions
INSERT INTO questions (question_text, option_a, option_b, option_c, option_d, correct_answer, category, difficulty) VALUES
('What is the capital of France?', 'London', 'Berlin', 'Paris', 'Madrid', 'C', 'Geography', 'easy'),
('Which planet is known as the Red Planet?', 'Venus', 'Jupiter', 'Saturn', 'Mars', 'D', 'Science', 'easy'),
('What is 15% of 200?', '20', '25', '30', '35', 'C', 'Math', 'easy'),
('Who wrote "Romeo and Juliet"?', 'Charles Dickens', 'William Shakespeare', 'Mark Twain', 'Jane Austen', 'B', 'Literature', 'easy'),
('What is the chemical symbol for Gold?', 'Go', 'Gd', 'Au', 'Ag', 'C', 'Science', 'medium'),
('Which ocean is the largest?', 'Atlantic', 'Indian', 'Arctic', 'Pacific', 'D', 'Geography', 'easy'),
('What is the square root of 144?', '10', '11', '12', '13', 'C', 'Math', 'easy'),
('In which year did World War II end?', '1943', '1944', '1945', '1946', 'C', 'History', 'medium'),
('What is the fastest land animal?', 'Lion', 'Cheetah', 'Horse', 'Leopard', 'B', 'Science', 'easy'),
('What does CPU stand for?', 'Central Processing Unit', 'Computer Personal Unit', 'Central Program Utility', 'Core Processing Unit', 'A', 'Technology', 'easy');
