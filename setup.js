'use strict';

const childProcess = require('child_process');
const fs = require('fs');
const readline = require('readline');
const mysql2 = require('mysql2');
const dbSetupFile = './data/model.sql';
const dbConfig = JSON.parse(
    fs.readFileSync('./dbConfig.json', {encoding: 'utf8'})
);

if (!dbConfig || !dbConfig.host || !dbConfig.user
    || !dbConfig.password || !dbConfig.database) {
  throw new Error('Failed to get database configuration.');
}
const connection = mysql2.createConnection({
  host: dbConfig.host,
  user: dbConfig.user,
  password: dbConfig.password,
  database: dbConfig.database,
  multipleStatements: true, // allow multiple so setup can run all at once
});

/**
 * Begins the guided setup process for the server private key and certificate
 */
function setupCert() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  // ask user if self-signed cert should be made
  rl.question('Generate self-signed certificate for local server [Y/N]? [Y] ',
      (ans) => {
        ans = ans.toUpperCase() || 'Y';
        if (ans === 'Y') {
          if (!fs.existsSync('./https_info')) {
            fs.mkdirSync('./https_info');
          }
          console.log('Generating https config file.');
          rl.question('Please enter pass phrase to use for the private key: ',
              (passPhrase) => {
                rl.close();
                // use openssl to generate cert/key
                childProcess.spawnSync('openssl', ['req', '-new', '-x509',
                  '-passout', 'pass:' + passPhrase,
                  '-keyout', './https_info/server.key',
                  '-out', './https_info/server.cert'], {
                  stdio: 'inherit', stdin: 'inherit',
                });
                // write to config file
                fs.writeFileSync('httpsConfig.json', JSON.stringify({
                  key: './https_info/server.key',
                  cert: './https_info/server.cert',
                  passphrase: passPhrase,
                }));
                console.log('Generated https config file...');
              });
        } else {
          // user already has cert/key, request their location and info
          rl.question('Please enter the path '
                      +'to the private key for the server: ', (keyPath) => {
            if (!fs.existsSync(keyPath)) {
              throw new Error('Could not find key with given path!');
            }
            rl.question('Please enter the path '
                        + 'to the server certificate: ', (certPath) => {
              if (!fs.existsSync(certPath)) {
                throw new Error('Could not find key with given path!');
              }
              rl.question('Please enter the pass phrase used for the key: ',
                  (passPhrase) => {
                    console.log('Generating https config file.');
                    // write locations to config file
                    fs.writeFileSync('httpsConfig.json', JSON.stringify({
                      key: keyPath,
                      cert: certPath,
                      passphrase: passPhrase,
                    }));
                    console.log('Generated https config file...');
                    rl.close();
                  });
            });
          });
        }
      });
}

connection.connect((err) => {
  if (err) {
    throw err;
  }
  console.log('Connected to database...');
  // run initial database setup
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
      setupCert(); // setup TLS/SSL
    });
  });
});
