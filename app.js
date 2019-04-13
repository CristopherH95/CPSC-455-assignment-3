const express = require('express');
const db = require('./db');
const path = require('path');
const bodyParser = require('body-parser');
const helmet = require('helmet');
const sessions = require('client-sessions');
const validate = require('./validate');
const xml2js = require('xml2js');
const xssFilters = require('xss-filters');

const app = express();
const unprotectedPaths = ['/', '/login', '/new-user', '/create-user'];

// Set content security policy to allow content from self only
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ['\'self\''],
    scriptSrc: ['\'self\''],
    styleSrc: ['\'self\''],
    objectSrc: ['\'none\''],
  },
}));
// set x-xss-protection header (modern browsers will be alert for xss)
app.use(helmet.xssFilter());
// enable parsing of the request body (accept only XML type)
app.use(bodyParser.text({type: 'text/xml'}));
// parse POSTed XML
app.use((req, resp, next) => {
  if (req.is('text/xml') && req.method === 'POST') {
    const xmlParser = new xml2js.Parser();
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
  cookieName: 'session',
  // used for cookie encryption,
  secret: '5e2c512fa2d74ad016f55547117bf23e2c623a2dd2e3480e7ab9'
          + '01b9b559e888dd9716',
  duration: 3 * 60 * 1000, // 3 minutes
  activeDuration: 1 * 60 * 1000, // extend by 1 minute on activity
  cookie: {
    httpOnly: true,
  },
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
 * Middleware for redirecting users who have not authenticated
 * for protected areas
 * @param req the request
 * @param resp the response
 * @param next next middleware function to run in chain
 */
app.use((req, resp, next) => {
  if (!req.session.username && !/^\/static/.test(req.url)
      && !unprotectedPaths.includes(req.url)) {
    console.log('unauthorized user, redirecting');
    resp.redirect('/');
  } else {
    next();
  }
});

app.use((req, resp, next) => {
  if (req.session.username && (req.url === '/' || req.url === '/new-user')) {
    console.log('user already authenticated, redirecting');
    resp.redirect('/dashboard');
  } else {
    next();
  }
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
 * Check that the given object has the attributes expected for a form
 * @param {object} obj JSON representation of a form from XML
 * @param {Array<string>} fields list of field names to check
 * @return {boolean}
 */
function areFormFieldsPresent(obj, fields) {
  let present = true;
  for (const i of fields) {
    present = (i in obj.form && obj.form[i].length > 0);
    if (!present) {
      break;
    }
  }

  return present;
}

/**
 * Create an XML document describing form errors
 * @param {Array<{name: string, error: string}>}
 *         errors A list of objects describing
 *         the errors to create in the xml string
 * @return {string}
 */
function buildXmlFormErrorSet(errors) {
  const builder = new xml2js.Builder();
  const obj = {errorSet: []};

  for (const i of errors) {
    obj.errorSet.push({
      field: {
        name: i.name,
        error: i.error,
      },
    });
  }

  return builder.buildObject(obj);
}

/**
 * Handler for post requests to login
 * @param req the request
 * @param resp the response
 */
app.post('/login', (req, resp) => {
  let check = true; // indicator to run checks
  let userName = null;
  let password = null;
  resp.set('Content-Type', 'text/xml'); // set response header for xml
  if (areFormFieldsPresent(req.xml, ['username', 'password'])) {
    // ensure that required attributes are present
    userName = req.xml.form.username[0];
    password = req.xml.form.password[0];
  } else {
    const xmlResp = buildXmlFormErrorSet([
      {name: 'username', error: 'Required'},
      {name: 'password', error: 'Required'},
    ]);
    resp.status(401);
    resp.send(xmlResp);
    check = false; // skip any checks
  }
  // check if username/password combo is valid in database
  if (check) {
    db.validateUser(userName, password).then((result) => {
      if (result === true) {
        req.session.username = userName;
        resp.send('OK');
      } else {
        const xmlResp = buildXmlFormErrorSet([{
          name: 'password', error: 'Invalid password/username',
        }]);
        resp.status(401);
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

/**
 * validate a new user form and return any possible errors
 * @param {object} req request object from express
 * @return {{vals: object, err: Array<object>}}
 */
async function validateNewUserForm(req) {
  const vals = {
    first_name: null,
    last_name: null,
    street: null,
    city: null,
    country_state: null,
    country: null,
    username: null,
    password: null,
  };
  for (const fi of Object.keys(vals)) {
    vals[fi] = req.xml['form'][fi][0];
  }
  let valid = true;
  let check;
  let fieldValue;
  const errors = [];
  for (const fi of Object.keys(vals)) {
    fieldValue = vals[fi];
    switch (fi) {
      case 'first_name':
      case 'last_name':
        check = validate.name(fieldValue);
        break;
      case 'street':
        check = validate.address(fieldValue);
        break;
      case 'country_state':
      case 'country':
        check = validate.stateCountry(fieldValue);
        break;
      case 'username':
        try {
          check = await validate.userName(fieldValue, db);
        } catch (err) {
          console.log(err);
          check = {
            result: false,
            reason: 'Could not validate username, please try again',
          };
        }
        break;
      default:
        check = validate[fi](fieldValue); // the names of the remaining inputs
                                  // and their validators are the same
                                  // so just use them as the key
    }
    if (check.result === false) {
      if (valid === true) {
        valid = check.result;
      }
      errors.push({
        name: fi, error: check.reason,
      });
    }
  }

  return {vals: vals, err: errors};
}

/**
 * Handles POST requests with XML data for a new user
 * @param req the request
 * @param resp the response
 */
app.post('/create-user', async (req, resp) => {
  const fields = ['first_name', 'last_name', 'street',
    'city', 'country_state', 'country', 'username', 'password'];
  let result = null;
  resp.set('Content-Type', 'text/xml'); // set response header for xml
  if (areFormFieldsPresent(req.xml, fields)) {
    try {
      result = await validateNewUserForm(req);
    } catch (err) {
      console.log(err);
      result = {err: [{
        name: 'country', // country is the last field
        error: 'Could not validate data, please try again later',
      }]};
    }
    if (result.err.length > 0) {
      const xmlResp = buildXmlFormErrorSet(result.err);
      resp.status(400);
      resp.send(xmlResp);
    } else {
      result.vals.user_id = result.vals.username; // ensure name mirrors db
      try {
        const insertSuccess = await db.insertUser(result.vals);
        if (insertSuccess) {
          const builder = new xml2js.Builder();
          resp.status(201);
          resp.send(builder.buildObject({result: true}));
        } else {
          resp.status(500);
          resp.send(buildXmlFormErrorSet([
            {
              name: 'country',
              error: 'Failed to insert data, please try again later',
            },
          ]));
        }
      } catch (err) {
        console.log(err);
        resp.status(500);
        resp.send(buildXmlFormErrorSet([
          {
            name: 'country',
            error: 'Failed to insert data, please try again later',
          },
        ]));
      }
    }
  } else {
    const errorFields = [];
    for (const k of Object.keys(vals)) {
      errorFields.push({name: k, error: 'Required'});
    }
    const xmlResp = buildXmlFormErrorSet(errorFields);
    resp.status(400);
    resp.send(xmlResp);
  }
});

/**
 * Handles get requests for the user dashboard
 * @param req the request
 * @param resp the response
 */
app.get('/dashboard', (req, resp) => {
  resp.sendFile(__dirname + '/views/dashboard.html');
});

/**
 * Handles returning user info when a user is logged in
 * @param req the request
 * @param resp the response
 */
app.get('/my-info', (req, resp) => {
  resp.set('Content-Type', 'text/xml'); // set response header for xml
  const builder = new xml2js.Builder();
  if (req.session.username) {
    db.getUser(req.session.username).then((result) => {
      Object.keys(result).map((key, idx) => {
        // escape data result for HTML context
        result[key] = xssFilters.inHTMLData(result[key]);
      });
      // build XML and send it over to front-end
      const xmlResp = builder.buildObject({user: result});
      resp.send(xmlResp);
    }).catch((err) => {
      console.log(err);
      resp.status(500);
      resp.send(builder.buildObject({user: {error: 'Unknown Error'}}));
    });
  } else {
    resp.status(401);
    resp.send(builder.buildObject({user: {error: 'Unauthorized'}}));
  }
});

/**Handles returning user accounts data when a user is logged in
 * @param req the request
 * @param resp the response
 */
app.get('/my-accounts', (req, resp) => {
  resp.set('Content-Type', 'text/xml'); // set response header for xml
  const builder = new xml2js.Builder();
  if (req.session.username) {
    db.getUserAccounts(req.session.username).then((result) => {
      Object.keys(result).map((key, idx) => {
        // escape data for HTML context
        result[key] = xssFilters.inHTMLData(result[key]);
      });
      // build XML and send it over to front-end
      const xmlResp = builder.buildObject({accounts: result});
      resp.send(xmlResp);
    }).catch((err) => {
      console.log(err);
      resp.status(500);
      resp.send(builder.buildObject({user: {error: 'Unknown Error'}}));
    });
  } else {
    resp.status(401);
    resp.send(builder.buildObject({user: {error: 'Unauthorized'}}));
  }
});

/**
 * Handles user logout, redirects the user to the login page
 * @param req the request
 * @param resp the response
 */
app.get('/logout', (req, resp) => {
  req.session.reset();
  resp.redirect('/');
});

// listen on port 3000,
// output a log statement to show that the server should be up
console.log('Listening on port 3000');
const server = app.listen(3000);

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
