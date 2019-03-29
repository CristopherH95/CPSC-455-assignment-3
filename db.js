const fs = require('fs');
const sqlite3 = require('sqlite3');
const bcrypt = require('bcrypt');
const saltRounds = 10;
const dbPath = './data/database.sqlite3';
const dbSetupFile = './data/model.sql';
var dbConnect = null;

if (!fs.existsSync(dbPath)) {
    dbConnect = new sqlite3.Database(dbPath, (err) => {
        if (err) {
            throw err;
        }
        console.log('Setting up database...');
        let setupQueries = fs.readFileSync(dbSetupFile, 'utf8');
        // let setupQueries = JSON.parse(dbJson);
        dbConnect.serialize(() => {
            // run each query for initial setup
            // the error handler will attempt to delete the half complete database file if something goes wrong
            dbConnect.exec(setupQueries, (err) => {
                if (err) {
                    fs.unlink(dbPath, (fErr) => {
                        console.error('Failed to run query in initial setup, removing incomplete database file.');
                        if (fErr) {
                            throw fErr;
                        }
                    });
                    throw err;
                }
            });
        });
        console.log("Finished setup")
    });

} else {
    dbConnect = new sqlite3.Database(dbPath, (err) => {
        if (err) {
            throw err;
        }
    });
}

/**
 * @namespace db namespace provides functions for abstracting database operations, internally uses prepared statements for queries
 * @property {object} connection    An active SQLite database connection
 * @property {function} close   Finalizes all prepared statements and closes the database connection
 * @property {function} getUser Gets a single user from the database
 * @property {function} getUserAccounts Gets all of a given user's accounts
 * @property {function} getAccount Gets a single bank account
 * @property {function} insertUser Inserts a new user account
 * @property {function} insertAccount Inserts a new bank account
 * @property {function} updateAccount Updates a bank account's balance
 * @property {function} getAccountTypes Gets all possible bank account types
 */
var db = Object.defineProperties(
    // define properties for prepared SQL queries, functions for handling the database
    // prepared queries are deliberately not configurable, writable, or enumerable
    Object(),   // new, empty object
    {
        connection: {
            value: dbConnect,
            enumerable: true
        },
        getUserQuery: {
            value: dbConnect.prepare("SELECT user_id, first_name, last_name, street, city, country_state, country FROM bank_users WHERE user_id=?")
        },
        getAllAccountsQuery: {
            value: dbConnect.prepare("SELECT account_id, bank_user_id, account_type, balance FROM bank_user_accounts WHERE bank_user_id=?")
        },
        getAccountQuery: {
            value: dbConnect.prepare("SELECT account_id, bank_user_id, account_type, balance FROM bank_user_accounts WHERE account_id=?")
        },
        getAccountTypesQuery: {
            value: dbConnect.prepare("SELECT account_type FROM bank_account_types")
        },
        insertUserQuery: {
            value: dbConnect.prepare("INSERT INTO bank_users VALUES (?,?,?,?,?,?,?,?)")
        },
        insertAccountQuery: {
            value: dbConnect.prepare("INSERT INTO bank_user_accounts VALUES (NULL,?,?,?)")
        },
        updateAccountQuery: {
            value: dbConnect.prepare("UPDATE bank_user_accounts SET balance=? WHERE account_id=?")
        },
        close: {
            value: function() {
                // Finalize all prepared statements
                this.getUserQuery.finalize();
                this.getAllAccountsQuery.finalize();
                this.getAccountQuery.finalize();
                this.getAccountTypesQuery.finalize();
                this.insertUserQuery.finalize();
                this.insertAccountQuery.finalize();
                this.updateAccountQuery.finalize();
                // Close database connection
                this.connection.close();
            }
        },
        getUser: {
            value: function(user_id) {
                return new Promise(function(resolve, reject) {
                    this.getUserQuery.get(user_id, (err, row) => {  // run query to get user and get row
                        if (err) {  
                            reject(err);    // failed, reject promise
                        } else {
                            resolve(row);   // success, resolve with result
                        }
                    });
                });
            },
            enumerable: true
        },
        getUserAccounts: {
            value: function(user_id) {
                return new Promise(function(resolve, reject) {
                    this.getAllAccountsQuery.all(user_id, (err, rows) => {   // run query to get all of a user's accounts
                        if (err) {
                            reject(err);    // failed, reject promise
                        } else {
                            resolve(rows);  // success, resolve with result
                        }
                    });
                });
            },
            enumerable: true
        },
        getAccount: {
            value: function(account_id) {
                return new Promise(function(resolve, reject) {
                    this.getAccountQuery.get(account_id, (err, row) => {    // run query to get a specific account
                        if (err) {
                            reject(err);    // failed, reject promise
                        } else {
                            resolve(row);   // success, resolve with result
                        }
                    });
                });
            },
            enumerable: true
        },
        insertUser: {
            value: function(userObj) {
                insertQuery = this.insertUserQuery; // the context of 'this' may change, so get a reference to the query here
                return new Promise(function(resolve, reject) {
                    bcrypt.hash(userObj.pass, saltRounds, (hErr, hash) => { // hash the user password
                        if (hErr) {
                            reject(hErr);   // failed to hash, reject promise
                        } else {
                            insertQuery.run(userObj.user_id, hash, userObj.first_name, 
                                            userObj.last_name, userObj.street, userObj.city, 
                                            userObj.country_state, userObj.country, (err) => {  // run insert query with parameters from user object
                                if (err) {
                                    reject(err);    // failed to insert, reject promise
                                } else {
                                    resolve(true);  // success, resolve promise
                                }
                            });
                        }
                    });
                });
            },
            enumerable: true
        },
        insertAccount: {
            value: function(accountObj) {
                return new Promise(function(resolve, reject) {
                    this.insertAccountQuery.run(accountObj.bank_user_id, accountObj.account_type, accountObj.balance, (err) => {    // run query to insert account
                        if (err) {
                            reject(err);    // failed, reject promise
                        } else {
                            resolve(true);   // success, resolve with result
                        }
                    });
                });
            },
            enumerable: true
        },
        updateAccount: {
            value: function(account_id, new_balance) {
                return new Promise(function(resolve, reject) {
                    this.updateAccountQuery.run(account_id, new_balance, (err) => {    // run query to update account
                        if (err) {
                            reject(err);    // failed, reject promise
                        } else {
                            resolve(true);   // success, resolve with result
                        }
                    });
                });
            },
            enumerable: true
        },
        getAccountTypes: {
            value: function() {
                return new Promise(function(resolve, reject) {
                    this.getAccountTypesQuery.all((err, rows) => {   // run query to get all possible account types
                        if (err) {
                            reject(err);    // failed, reject promise
                        } else {
                            resolve(rows);  // success, resolve with result
                        }
                    });
                });
            },
            enumerable: true
        }
    }
);
db = Object.seal(db); // seal the database object

module.exports = db;