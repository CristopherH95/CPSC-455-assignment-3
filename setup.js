'use strict';

const fs = require('fs');
const mysql = require('mysql');
const dbSetupFile = './data/model.sql';
const dbConfig = JSON.parse(fs.readFileSync('./dbConfig.json', {encoding: 'utf8'}));
if (!dbConfig || !dbConfig.host || !dbConfig.user || !dbConfig.password || !dbConfig.database) {
  throw new Error('Failed to get database configuration.');
}
const connection = mysql.createConnection({
  host: dbConfig.host,
  user: dbConfig.user,
  password: dbConfig.password,
  database: dbConfig.database,
  multipleStatements: true, // allow multiple so setup can run all at once
});

connection.connect((err) => {
  if (err) {
    throw err;
  }
  console.log('Connected to database...');
  const dbSetupQueries = fs.readFileSync(dbSetupFile, {encoding: 'utf8'});
  console.log('Running setup queries:');
  console.log(dbSetupQueries);
  connection.query(dbSetupQueries, (err) => {
    if (err) {
      throw err;
    }
    console.log('Database setup complete.');
    connection.end((err) => {
      if (err) {
        throw err;
      }
    });
  });
});
