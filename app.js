var express = require('express');
var db = require('./db');

var app = express();

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

var server = app.listen(3000);

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
    });
});
