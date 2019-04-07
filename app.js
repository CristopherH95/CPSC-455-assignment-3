const express = require('express');
const db = require('./db');
const path = require('path');
const bodyParser = require('body-parser');
const helmet = require('helmet');
const sessions = require('client-sessions');
const verify = require('./verify');
const xml2js = require('xml2js');

var app = express();

// Set content security policy to allow content from self only
app.use(helmet.contentSecurityPolicy({
    directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
        objectSrc: ["'none'"]
    }
}));
// set x-xss-protection header (modern browsers will be alert for xss)
app.use(helmet.xssFilter());
// enable parsing of the request body (accept only XML type)
app.use(bodyParser.text({ type: 'text/xml' }));
// parse xml if it comes in
app.use((req, resp, next) => {
    if (req.is('text/xml') && req.method === 'POST') {
        let xmlParser = new xml2js.Parser();
        xmlParser.parseString(req.body, (err, result) => {
            if (err) {
                console.log(err);
                resp.status(400);
                resp.send('Invalid');
            } else {
                req.xml = result;
                next();
            }
        });
    } else {
        next();
    }
});
// Serve files from the static directory automatically
app.use('/static', express.static(path.join(__dirname, 'static')));

// Setup session info
app.use(sessions({
    cookieName: 'bnkSession',
    secret: '5e2c512fa2d74ad016f55547117bf23e2c623a2dd2e3480e7ab901b9b559e888dd9716',
    duration: 3 * 60 * 1000, // 3 minutes
    activeDuration: 1 * 60 * 1000, // extend by 1 minute on activity
    // TODO: set httpOnly
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
 * Handler for favicon.ico
 * @param req the request
 * @param resp the response
 */
app.get('/favicon.ico', (req, resp) => {
    resp.sendFile(__dirname + '/favicon.ico');
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
 * Check that the given object has the attributes expected for a login form
 * @param {object} obj 
 * @returns {boolean}
 */
function isLoginInfoPresent(obj) {
    return (obj.form && obj.form.username && obj.form.username.length > 0 && obj.form.username[0]
            && obj.form.password && obj.form.password.length > 0 && obj.form.username[0]);
}

/**
 * Handler for post requests to login
 * @param req the request
 * @param resp the response
 */
app.post('/login', (req, resp) => {
    let check = true;   // indicator to run checks
    resp.set('Content-Type', 'text/xml');   // set response header for xml
    if (isLoginInfoPresent(req.xml)) {  // check that required attributes are present
        var userName = req.xml.form.username[0];
        var password = req.xml.form.password[0];
    } else {
        // TODO: clean up XML error responses
        let builder = new xml2js.Builder(); // fields not present, send xml error response
        let xmlResp = builder.buildObject({
            errorSet: [
                {
                    field: 
                        {name: 'username', error: 'required'}
                },
                {
                    field: 
                        {name: 'password', error: 'required'}
                }
            ]});
        resp.status(400);
        resp.send(xmlResp);
        check = false;  // skip any checks
    }
    // verify that the content of the username and password are valid (no disallowed characters, etc.)
    // if the password/username the user input doesn't even follow required constraints don't bother with database
    if (check && (!verify.userNameNoDb(userName).result || !verify.password(password).result)) {
        let builder = new xml2js.Builder();
        let xmlResp = builder.buildObject({errorSet: [
            {
                field:
                    {name: 'password', error: 'Invalid password/username'}
            }
        ]});
        resp.status(400);
        resp.send(xmlResp);
        check = false;
    }
    // check if username/password combo is valid in database
    if (check) {
        db.validateUser(userName, password).then((result) => {
            if (result === true) {
                req.session.username = userName;
                resp.send('');
            } else {
                let builder = new xml2js.Builder();
                let xmlResp = builder.buildObject({errorSet: [
                    {
                        field:
                            {name: 'password', error: 'Invalid password/username'}
                    }
                ]});
                resp.status(400);
                resp.send(xmlResp);
            }
        });
    }
});

/**
 * Handles get requests for the new user form page
 * @param req the request
 * @param resp the response
 */
app.get('/new-user', (req, resp) => {
    resp.sendFile(__dirname + '/views/new-user.html');
});

// TODO: create-user or new-user POST request handler

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
