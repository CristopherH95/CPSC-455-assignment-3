const express = require('express');
const db = require('./db');
const path = require('path');
const bodyParser = require('body-parser');
const sessions = require('client-sessions');
const verify = require('./verify');
const xml2js = require('xml2js');

var app = express();

// enable parsing of the request body
app.use(bodyParser.urlencoded({ extended: true }));
// Serve files from the static directory automatically
app.use('/static', express.static(path.join(__dirname, 'static')));

// Setup session info
app.use(sessions({
    cookieName: 'bnkSession',
    secret: '5e2c512fa2d74ad016f55547117bf23e2c623a2dd2e3480e7ab901b9b559e888dd9716',
    duration: 30 * 60 * 1000, // 30 minutes
    activeDuration: 5 * 60 * 1000, // extend by 5 minutes on activity
}));

/**
 * Simple middleware for printing out basic request information as they come in
 * @param req the request
 * @param resp the response
 * @param next next middleware function to run in chain
 */
app.use((req, resp, next) => {
    console.log('Received ' + req.method + ' request for ' + req.originalUrl);
    if (req.body) {
        console.log('Request has content:\n' + JSON.stringify(req.body));
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

/**
 * Handler for post requests to login
 * @param req the request
 * @param resp the response
 */
app.post('/login', (req, resp) => {
    if (req.body.username !== undefined && req.body.password !== undefined) {
        var userName = req.body.username;
        var password = req.body.password;
    }
    if (!verify.userNameNoDb(userName).result || !verify.password(password).result) {
        // TODO: return response for when input is bad
    }
    db.validateUser(userName, password).then((result) => {
        if (result === true) {
            req.session.username = userName;
            resp.redirect('/'); // TODO: different redirect location
        }
    });
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
