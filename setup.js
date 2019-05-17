'use strict';

const childProcess = require('child_process');
const fs = require('fs');
const readline = require('readline');

if (!fs.existsSync('./config')) {
  fs.mkdirSync('./config');
}

if (!fs.existsSync('./https_info')) {
  fs.mkdirSync('./https_info');
}

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
                fs.writeFileSync('./config/httpsConfig.json', JSON.stringify({
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
                    fs.writeFileSync('./config/httpsConfig.json',
                        JSON.stringify({
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

if (!fs.existsSync('./config/dbConfig.json')) {
  fs.writeFileSync('./config/dbConfig.json', JSON.stringify({
    host: 'localhost',
    user: 'bank',
    password: 'bankers4life!',
    database: 'bank_web_app',
  }));
}

setupCert();
