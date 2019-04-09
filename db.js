const sqlite3 = require('sqlite3');
const bcrypt = require('bcrypt');
const saltRounds = 10;
const dbPath = './data/database.sqlite3';

const dbConnect = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    throw err;
  }
});

/**
 * @namespace db namespace provides functions for abstracting database
 *            operations, internally uses prepared statements for queries
 * @property {object} connection    An active SQLite database connection
 * @property {function} close
 *            Finalizes all prepared statements and
 *            closes the database connection
 * @property {function} getUser Gets a single user from the database
 * @property {function} getUserAccounts Gets all of a given user's accounts
 * @property {function} getAccount Gets a single bank account
 * @property {function} insertUser Inserts a new user account
 * @property {function} insertAccount Inserts a new bank account
 * @property {function} updateAccount Updates a bank account's balance
 * @property {function} getAccountTypes Gets all possible bank account types
 * @property {function} validateUser Checks if the given user id and
 *            password combo is valid in the database
 */
let db = Object.defineProperties(
    // define properties for prepared SQL queries,
    // functions for handling the database
    // prepared queries are deliberately not
    // configurable, writable, or enumerable
    Object(), // new, empty object
    {
      connection: {
        value: dbConnect,
        enumerable: true,
      },
      getUserQuery: {
        value: dbConnect.prepare('SELECT user_id, first_name, last_name, '
                                 + 'street, city, country_state, country'
                                 + ' FROM bank_users WHERE user_id=?'),
      },
      getUserPassQuery: {
        value: dbConnect.prepare('SELECT pass FROM bank_users WHERE user_id=?'),
      },
      getAllAccountsQuery: {
        value: dbConnect.prepare('SELECT account_id, bank_user_id, '
                                 + 'account_type, balance FROM '
                                 + 'bank_user_accounts WHERE bank_user_id=?'),
      },
      getAccountQuery: {
        value: dbConnect.prepare('SELECT account_id, bank_user_id, '
                                 + 'account_type, balance FROM '
                                 + 'bank_user_accounts WHERE account_id=?'),
      },
      getAccountTypesQuery: {
        value: dbConnect.prepare('SELECT account_type FROM bank_account_types'),
      },
      insertUserQuery: {
        value: dbConnect.prepare('INSERT INTO bank_users VALUES '
                                 + '(?,?,?,?,?,?,?,?)'),
      },
      insertAccountQuery: {
        value: dbConnect.prepare('INSERT INTO bank_user_accounts VALUES '
                                 + '(NULL,?,?,?)'),
      },
      updateAccountQuery: {
        value: dbConnect.prepare('UPDATE bank_user_accounts SET '
                                 + 'balance=? WHERE account_id=?'),
      },
      close: {
        value: function(callback) {
          // Finalize all prepared statements
          this.getUserQuery.finalize();
          this.getUserPassQuery.finalize();
          this.getAllAccountsQuery.finalize();
          this.getAccountQuery.finalize();
          this.getAccountTypesQuery.finalize();
          this.insertUserQuery.finalize();
          this.insertAccountQuery.finalize();
          this.updateAccountQuery.finalize();
          // Close database connection
          this.connection.close(callback);
        },
      },
      getUser: {
        value: function(userId) {
          // the context of 'this' may change,
          // so get a reference to the query here
          const getUserQuery = this.getUserQuery;
          return new Promise(function(resolve, reject) {
            getUserQuery.get(userId, (err, row) => {
              // run query to get user and get row
              if (err) {
                reject(err); // failed, reject promise
              } else {
                resolve(row); // success, resolve with result
              }
            });
          });
        },
        enumerable: true,
      },
      getUserAccounts: {
        value: function(userId) {
          // the context of 'this' may change,
          // so get a reference to the query here
          const getAllAccountsQuery = this.getAllAccountsQuery;
          return new Promise(function(resolve, reject) {
            getAllAccountsQuery.all(userId, (err, rows) => {
              // run query to get all of a user's accounts
              if (err) {
                reject(err); // failed, reject promise
              } else {
                resolve(rows); // success, resolve with result
              }
            });
          });
        },
        enumerable: true,
      },
      getAccount: {
        value: function(accountId) {
          // the context of 'this' may change,
          // so get a reference to the query here
          const getAccountQuery = this.getAccountQuery;
          return new Promise(function(resolve, reject) {
            getAccountQuery.get(accountId, (err, row) => {
              // run query to get a specific account
              if (err) {
                reject(err); // failed, reject promise
              } else {
                resolve(row); // success, resolve with result
              }
            });
          });
        },
        enumerable: true,
      },
      insertUser: {
        value: function(userObj) {
          // the context of 'this' may change,
          // so get a reference to the query here
          const insertQuery = this.insertUserQuery;
          return new Promise(function(resolve, reject) {
            bcrypt.hash(userObj.pass, saltRounds, (hErr, hash) => {
              // hash the user password
              if (hErr) {
                reject(hErr); // failed to hash, reject promise
              } else {
                insertQuery.run(userObj.user_id, hash, userObj.first_name,
                    userObj.last_name, userObj.street, userObj.city,
                    userObj.country_state, userObj.country, (err) => {
                      // run insert query with parameters from user object
                      if (err) {
                        reject(err); // failed to insert, reject promise
                      } else {
                        resolve(true); // success, resolve promise
                      }
                    });
              }
            });
          });
        },
        enumerable: true,
      },
      insertAccount: {
        value: function(accountObj) {
          // the context of 'this' may change,
          // so get a reference to the query here
          const insertAccountQuery = this.insertAccountQuery;
          return new Promise(function(resolve, reject) {
            insertAccountQuery.run(accountObj.bank_user_id,
                accountObj.account_type,
                accountObj.balance, (err) => {
                  // run query to insert account
                  if (err) {
                    reject(err); // failed, reject promise
                  } else {
                    resolve(true); // success, resolve with result
                  }
                });
          });
        },
        enumerable: true,
      },
      updateAccount: {
        value: function(accountId, newBalance) {
          // the context of 'this' may change,
          // so get a reference to the query here
          const updateAccountQuery = this.updateAccountQuery;
          return new Promise(function(resolve, reject) {
            updateAccountQuery.run(accountId, newBalance, (err) => {
              // run query to update account
              if (err) {
                reject(err); // failed, reject promise
              } else {
                resolve(true); // success, resolve with result
              }
            });
          });
        },
        enumerable: true,
      },
      getAccountTypes: {
        value: function() {
          // the context of 'this' may change,
          // so get a reference to the query here
          const getAccountTypesQuery = this.getAccountTypesQuery;
          return new Promise(function(resolve, reject) {
            getAccountTypesQuery.all((err, rows) => {
              // run query to get all possible account types
              if (err) {
                reject(err); // failed, reject promise
              } else {
                resolve(rows); // success, resolve with result
              }
            });
          });
        },
        enumerable: true,
      },
      validateUser: {
        value: function(userId, password) {
          // the context of 'this' may change,
          // so get a reference to the query here
          const getUserPassQuery = this.getUserPassQuery;
          return new Promise(function(resolve, reject) {
            getUserPassQuery.get(userId, (err, row) => {
              // run query to get the user's hashed password
              if (err) {
                reject(err); // failed, reject promise
              } else {
                if (row) {
                  bcrypt.compare(password, row.pass).then((res) => {
                    // compare password hash
                    resolve(res); // resolve promise with result of comparison
                  });
                } else {
                  // couldn't find any info, the user may not exist
                  resolve(false);
                }
              }
            });
          });
        },
      },
    }
);
db = Object.seal(db); // seal the database object

module.exports = db;
