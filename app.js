var express = require('express');
var db = require('./db');
var path = require('path');

var app = express();

// Serve files from the static directory automatically
app.use('/static', express.static(path.join(__dirname, 'static')));

/**
 * Simple middleware for printing out basic request information as they come in
 * @param req the request
 * @param resp the response
 * @param next next middleware function to run in chain
 */
app.use((req, resp, next) => {
    console.log('Received ' + req.method + ' request for ' + req.originalUrl);
    if (req.body) {
        console.log('Request has content:\n' + req.body);
    }
    next();
});

/**
 * Handler for index login page, simply sends the login page
 * @param req the request
 * @param resp the response
 */
app.get('/', (req, resp) => {
    resp.sendFile(__dirname + '/views/index.html');
});

// listen on port 3000, output a log statement to show that the server should be up
console.log('Listening on port 3000');
var server = app.listen(3000);

// Handle termination signal, close database and server gracefully
process.on('SIGINT', () => {
    console.log('Shutting down...');
    db.close((err) => { // close database using its close method
        if (err) {
            console.log(err);
            console.log('Could not close database');
        } else {
            console.log('Closed database');
        }
        server.close(); // close the server
        console.log('Stopped server');
        process.exit(0); // exit process
    });
});
