const fs = require('fs');
const readline = require('readline');
const configFile = './dbConfig.json';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question('MySQL host: [localhost] ', (accHost) => {
  rl.question('Database name: [banking_web_app] ', (dbName) => {
    rl.question('MySQL database account name for app: ', (accName) => {
      rl.question('Password for MySQL account: ', (accPass) => {
        const connectData = {
          host: accHost || 'localhost',
          user: accName,
          password: accPass,
          database: dbName || 'banking_web_app',
        };
        fs.writeFileSync(configFile, JSON.stringify(connectData));
        console.log('Created config file for database...');
        rl.close();
      });
    });
  });
});
