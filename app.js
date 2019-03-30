var express = require('express');
var db = require('./db');
var path = require('path');

var app = express();

// Serve files from the static directory automatically
app.use('/static', express.static(path.join(__dirname, 'static')));

app.use((req, resp, next) => {
    console.log('Received ' + req.method + ' request for ' + req.originalUrl);
    if (req.body) {
        console.log('Request has content:\n' + req.body);
    }
    next();
});

app.get('/', (req, resp) => {
    resp.sendFile(__dirname + '/views/index.html');
});

console.log('Listening on port 3000');
var server = app.listen(3000);

// Handle termination signal, close database and server gracefully
process.on('SIGINT', () => {
    console.log('Shutting down...');
    db.close((err) => {
        if (err) {
            console.log(err);
            console.log('Could not close database');
        } else {
            console.log('Closed database');
        }
        server.close();
        console.log('Stopped server');
        process.exit(0);
    });
});
