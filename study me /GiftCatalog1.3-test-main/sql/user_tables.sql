-- Create the user_points table to track user points
CREATE TABLE IF NOT EXISTS user_points (
  user_id BIGINT PRIMARY KEY,
  points INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create the user_tasks table to track completed tasks
CREATE TABLE IF NOT EXISTS user_tasks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  task_type VARCHAR(50) NOT NULL,
  task_id VARCHAR(255) NOT NULL,
  points_awarded INT NOT NULL DEFAULT 1,
  completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_user_task (user_id, task_type, task_id)
);

-- Create index for faster lookup
CREATE INDEX idx_user_id ON user_tasks (user_id); 