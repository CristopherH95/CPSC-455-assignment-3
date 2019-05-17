'use strict';

const fs = require('fs');
const mysql2 = require('mysql2');
const bcrypt = require('bcrypt');
const saltRounds = 10;
const dbConfig = JSON.parse(
    fs.readFileSync('./config/dbConfig.json', {encoding: 'utf8'})
);
if (!dbConfig || !dbConfig.host || !dbConfig.user
    || !dbConfig.password || !dbConfig.database) {
  throw new Error('Failed to get database configuration.');
}

const dbConnect = mysql2.createConnection({
  host: dbConfig.host,
  user: dbConfig.user,
  password: dbConfig.password,
  database: dbConfig.database,
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
        value: 'SELECT user_id, first_name, last_name, '
               + 'street, city, country_state, country'
               + ' FROM bank_users WHERE user_id=?',
      },
      getUserPassQuery: {
        value: 'SELECT pass FROM bank_users WHERE user_id=?',
      },
      getAllAccountsQuery: {
        value: 'SELECT account_id FROM bank_user_accounts'
               + ' WHERE bank_user_id=?',
      },
      getAccountCountQuery: {
        value: 'SELECT COUNT(*) FROM bank_user_accounts '
               + 'WHERE bank_user_id=?',
      },
      getAccountQuery: {
        value: 'SELECT account_id, bank_user_id, '
               + 'account_type, balance FROM '
               + 'bank_user_accounts WHERE account_id=?'
               + ' AND bank_user_id=?',
      },
      getAccountTypesQuery: {
        value: 'SELECT account_type FROM bank_account_types',
      },
      insertUserQuery: {
        value: 'INSERT INTO bank_users VALUES (?,?,?,?,?,?,?,?)',
      },
      insertAccountQuery: {
        value: 'INSERT INTO bank_user_accounts (bank_user_id, '
               + 'account_type, balance) VALUES (?,?,?)',
      },
      updateAccountQuery: {
        value: 'UPDATE bank_user_accounts SET balance=? WHERE account_id=?',
      },
      close: {
        value: function(callback) {
          // Close database connection
          this.connection.end(callback);
        },
      },
      getUser: {
        value: function(userId) {
          // the context of 'this' may change,
          // so get references here
          const getUserQuery = this.getUserQuery;
          const connect = this.connection;
          return new Promise(function(resolve, reject) {
            const runner = connect.execute(getUserQuery, [userId],
                (err, row) => {
                  // run query to get user and get row
                  if (err) {
                    reject(err); // failed, reject promise
                  } else {
                    resolve(row.shift()); // success, resolve with result
                  }
                });
            console.log('QUERY');
            console.log(runner.sql + ' with args (' + userId + ')');
          });
        },
        enumerable: true,
      },
      getUserAccounts: {
        value: function(userId) {
          // the context of 'this' may change,
          // so get references here
          const getAllAccountsQuery = this.getAllAccountsQuery;
          const connect = this.connection;
          return new Promise(function(resolve, reject) {
            const runner = connect.execute(getAllAccountsQuery,
                [userId], (err, rows) => {
                  // run query to get all of a user's accounts
                  if (err) {
                    reject(err); // failed, reject promise
                  } else {
                    resolve(rows); // success, resolve with result
                  }
                });
            console.log('QUERY');
            console.log(runner.sql + ' with args (' + userId + ')');
          });
        },
        enumerable: true,
      },
      getAccountCount: {
        value: function(userId) {
          // the context of 'this' may change,
          // so get references here
          const getAccountCountQuery = this.getAccountCountQuery;
          const connect = this.connection;
          return new Promise(function(resolve, reject) {
            const runner = connect.execute(getAccountCountQuery,
                [userId], (err, res) => {
                  // run query to get a count of user's accounts
                  if (err) {
                    reject(err); // failed, reject promise
                  } else {
                    // success, resolve with result
                    resolve(res.shift()['COUNT(*)']);
                  }
                });
            console.log('QUERY');
            console.log(runner.sql + ' with args (' + userId + ')');
          });
        },
        enumerable: true,
      },
      getAccount: {
        value: function(accountId, userId) {
          // the context of 'this' may change,
          // so get references here
          const getAccountQuery = this.getAccountQuery;
          const connect = this.connection;
          return new Promise(function(resolve, reject) {
            const runner = connect.execute(getAccountQuery,
                [accountId, userId], (err, row) => {
                  // run query to get a specific account
                  if (err) {
                    reject(err); // failed, reject promise
                  } else {
                    resolve(row.shift()); // success, resolve with result
                  }
                });
            console.log('QUERY');
            console.log(
                runner.sql + ' with args (' + [accountId, userId].join() + ')'
            );
          });
        },
        enumerable: true,
      },
      insertUser: {
        value: function(userObj) {
          // the context of 'this' may change,
          // so get references here
          const insertQuery = this.insertUserQuery;
          const connect = this.connection;
          return new Promise(function(resolve, reject) {
            bcrypt.hash(userObj.password, saltRounds, (hErr, hash) => {
              // hash the user password
              if (hErr) {
                reject(hErr); // failed to hash, reject promise
              } else {
                const runner = connect.execute(insertQuery, [userObj.user_id,
                  hash, userObj.first_name,
                  userObj.last_name, userObj.street, userObj.city,
                  userObj.country_state, userObj.country], (err) => {
                  // run insert query with parameters from user object
                  if (err) {
                    reject(err); // failed to insert, reject promise
                  } else {
                    resolve(true); // success, resolve promise
                  }
                });
                console.log('QUERY');
                console.log(runner.sql + ' with args (' + [userObj.user_id,
                  hash, userObj.first_name,
                  userObj.last_name, userObj.street, userObj.city,
                  userObj.country_state, userObj.country].join() + ')');
              }
            });
          });
        },
        enumerable: true,
      },
      insertAccount: {
        value: function(accountObj) {
          // the context of 'this' may change,
          // so get references here
          const insertAccountQuery = this.insertAccountQuery;
          const connect = this.connection;
          return new Promise(function(resolve, reject) {
            const runner = connect.execute(insertAccountQuery,
                [accountObj.bank_user_id,
                  accountObj.account_type,
                  accountObj.balance], (err) => {
                  // run query to insert account
                  if (err) {
                    reject(err); // failed, reject promise
                  } else {
                    resolve(true); // success, resolve with result
                  }
                });
            console.log('QUERY');
            console.log(runner.sql + ' with args (' + [accountObj.bank_user_id,
              accountObj.account_type,
              accountObj.balance].join() + ')');
          });
        },
        enumerable: true,
      },
      updateAccount: {
        value: function(accountId, newBalance) {
          // the context of 'this' may change,
          // so get references here
          const updateAccountQuery = this.updateAccountQuery;
          const connect = this.connection;
          return new Promise(function(resolve, reject) {
            const runner = connect.execute(updateAccountQuery,
                [newBalance, accountId], (err) => {
                  // run query to update account
                  if (err) {
                    reject(err); // failed, reject promise
                  } else {
                    resolve(true); // success, resolve with result
                  }
                });
            console.log('QUERY');
            console.log(
                runner.sql + ' with args (' +
                [newBalance, accountId].join() + ')'
            );
          });
        },
        enumerable: true,
      },
      getAccountTypes: {
        value: function() {
          // the context of 'this' may change,
          // so get references here
          const getAccountTypesQuery = this.getAccountTypesQuery;
          const connect = this.connection;
          return new Promise(function(resolve, reject) {
            const runner = connect.execute(getAccountTypesQuery,
                (err, rows) => {
                  // run query to get all possible account types
                  if (err) {
                    reject(err); // failed, reject promise
                  } else {
                    resolve(rows); // success, resolve with result
                  }
                });
            console.log('QUERY');
            console.log(runner.sql);
          });
        },
        enumerable: true,
      },
      validateUser: {
        value: function(userId, password) {
          // the context of 'this' may change,
          // so get references here
          const getUserPassQuery = this.getUserPassQuery;
          const connect = this.connection;
          return new Promise(function(resolve, reject) {
            const runner = connect.execute(getUserPassQuery,
                [userId], (err, row) => {
                  // run query to get the user's hashed password
                  if (err) {
                    reject(err); // failed, reject promise
                  } else {
                    const user = row.shift();
                    if (user) {
                      bcrypt.compare(password, user.pass).then((res) => {
                        // compare password hash
                        resolve(res); // resolve promise with result
                      });
                    } else {
                      // couldn't find any info, the user may not exist
                      resolve(false);
                    }
                  }
                });
            console.log('QUERY');
            console.log(runner.sql + ' with args (' + userId + ')');
          });
        },
      },
    }
);
db = Object.seal(db); // seal the database object

module.exports = db;
