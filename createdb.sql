CREATE DATABASE IF NOT EXISTS bank_web_app;

CREATE USER IF NOT EXISTS 'bank'@'localhost' IDENTIFIED WITH mysql_native_password BY 'bankers4life!';

GRANT ALL PRIVILEGES ON bank_web_app.* TO 'bank'@'localhost';

USE bank_web_app;

CREATE TABLE IF NOT EXISTS bank_users ( 
    user_id VARCHAR(35) PRIMARY KEY, 
    pass VARCHAR(255) NOT NULL, 
    first_name VARCHAR(50) NOT NULL, 
    last_name VARCHAR(50) NOT NULL, 
    street VARCHAR(100) NOT NULL, 
    city VARCHAR(60) NOT NULL, 
    country_state VARCHAR(55) NOT NULL, 
    country VARCHAR(55) NOT NULL 
);
CREATE TABLE IF NOT EXISTS bank_account_types ( account_type VARCHAR(25) PRIMARY KEY );
INSERT IGNORE INTO bank_account_types (account_type) VALUES ('Checking'), ('Savings');
CREATE TABLE IF NOT EXISTS bank_user_accounts ( 
    account_id INT AUTO_INCREMENT PRIMARY KEY, 
    bank_user_id VARCHAR(35) NOT NULL, 
    account_type VARCHAR(25) NOT NULL, 
    balance DECIMAL(25, 2) DEFAULT 0.00, 
        FOREIGN KEY(bank_user_id) REFERENCES bank_users(user_id) ON DELETE CASCADE, 
        FOREIGN KEY(account_type) REFERENCES bank_account_types(account_type) ON DELETE CASCADE 
);