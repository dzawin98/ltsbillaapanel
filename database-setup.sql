-- RTRW Billing System Database Setup
-- Run this script in your MySQL/MariaDB to create the production database

-- Create production database
CREATE DATABASE IF NOT EXISTS rtrw_db_production CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create user for the application (optional, you can use root)
-- GRANT ALL PRIVILEGES ON rtrw_db_production.* TO 'rtrw_user'@'localhost' IDENTIFIED BY 'your_secure_password';
-- FLUSH PRIVILEGES;

-- Use the production database
USE rtrw_db_production;

-- Show database info
SELECT 'Database rtrw_db_production created successfully!' as message;
SHOW TABLES;

-- Note: Tables will be created automatically when you run the migrations
-- using: npx sequelize-cli db:migrate --env production