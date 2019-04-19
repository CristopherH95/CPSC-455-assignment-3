'use strict';

const fs = require('fs');
const sqlite3 = require('sqlite3');
const dbPath = './data/database.sqlite3';
const dbSetupFile = './data/model.sql';

if (!fs.existsSync(dbPath)) {
  dbConnect = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      throw err;
    }
    console.log('Setting up database...');
    const setupQueries = fs.readFileSync(dbSetupFile, 'utf8');
    console.log('Initial database setup queries:');
    console.log(setupQueries);
    dbConnect.serialize(() => {
      // run each query for initial setup
      // the error handler will attempt to delete
      // the half complete database file if something goes wrong
      dbConnect.exec(setupQueries, (err) => {
        if (err) {
          fs.unlink(dbPath, (fErr) => {
            console.error('Failed to run query in initial setup, '
                        + 'removing incomplete database file.');
            if (fErr) {
              throw fErr;
            }
          });
          throw err;
        }
      });
    });
    console.log('Finished database setup');
  });
}
