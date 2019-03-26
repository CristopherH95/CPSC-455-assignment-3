const fs = require('fs');
const sqlite3 = require('sqlite3');

const dbPath = './data/database.sqlite3';
const dbSetupFile = './model.json';
var db = null;

if (!fs.existsSync(dbPath)) {
    db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
            throw err;
        }
        console.log('Setting up database...');
        let setupQuery = fs.readFileSync(dbSetupFile, 'utf8');  // TODO: Set up reading in the JSON array
        db.run(setupQuery, (err) => {
            throw err;
        });
    });

} else {
    db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
            throw err;
        }
    });
}

module.exports = db;