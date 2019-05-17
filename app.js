'use strict';

const express = require('express');
const https = require('https');
const fs = require('fs');
const db = require('./db');
const path = require('path');
const bodyParser = require('body-parser');
const helmet = require('helmet');
const sessions = require('client-sessions');
const validate = require('./validate');
const xml2js = require('xml2js');
const xssFilters = require('xss-filters');
const Tracker = require('./attemptTracker');
const httpsConfig = JSON.parse(
    fs.readFileSync('./config/httpsConfig.json', {encoding: 'utf8'})
);
if (!httpsConfig.key || !httpsConfig.cert) {
  throw new Error('Failed to get https configuration');
}

const app = express();
const unprotectedPaths = [
  '/', '/login', '/new-user',
  '/create-user', '/favicon.ico',
];
const attempts = {};

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
      && !unprotectedPaths.includes(req.url.split('?')[0])) {
    console.log('unauthorized user, redirecting');
    resp.redirect('/');
  } else {
    next();
  }
});

app.use((req, resp, next) => {
  if (req.session.username && (unprotectedPaths.includes(req.url))) {
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
  resp.sendFile(path.join(__dirname, 'favicon.ico'));
});

/**
 * Handler for index login page, simply sends the login page
 * @param req the request
 * @param resp the response
 */
app.get('/', (req, resp) => {
  resp.sendFile(path.join(__dirname, 'views', 'index.html'));
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
  let locked = false; // send error if locked
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
  if (check) {
    const testUser = validate.userNameNoDb(userName);
    const testPass = validate.password(password);
    if (!testUser.result || !testPass.result) {
      const xmlResp = buildXmlFormErrorSet([{
        name: 'password', error: 'Invalid password/username',
      }]);
      resp.status(401);
      resp.send(xmlResp);
      check = false;
    }
  }
  if (check && attempts[userName]) {
    check = !attempts[userName].isLocked();
    locked = !check;
  }
  // check if username/password combo is valid in database
  if (check) {
    db.validateUser(userName, password).then((result) => {
      if (result === true) {
        if (attempts[userName]) {
          delete attempts[userName]; // remove attempt tracker
        }
        req.session.username = userName;
        resp.send('OK');
      } else {
        console.log('Failed login attempt for ' + String(userName));
        const xmlResp = buildXmlFormErrorSet([{
          name: 'password', error: 'Invalid password/username',
        }]);
        if (!attempts[userName]) {
          attempts[userName] = new Tracker(userName);
        }
        attempts[userName].addAttempt();
        resp.status(401);
        resp.send(xmlResp);
      }
    });
  } else if (locked) {
    console.log(
        String(userName) + ' attempted to login, but their account is locked'
    );
    const xmlResp = buildXmlFormErrorSet([{
      name: 'password', error: 'Invalid password/username',
    }]);
    resp.status(401);
    resp.send(xmlResp);
  }
});

/**
 * Handles get requests for the new user form page
 * @param req the request
 * @param resp the response
 */
app.get('/new-user', (req, resp) => {
  resp.sendFile(path.join(__dirname, 'views', 'new-user.html'));
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
  db.getAccountCount(req.session.username).then((result) => {
    if (result > 0) {
      resp.sendFile(path.join(__dirname, 'views', 'dashboard.html'));
    } else {
      resp.redirect('/new-account');
    }
  }).catch((err) => {
    console.log(err);
    resp.send('Unknown error, please try again.');
  });
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

/**
 * Handles returning user accounts data when a user is logged in
 * @param req the request
 * @param resp the response
 */
app.get('/my-accounts', (req, resp) => {
  resp.set('Content-Type', 'text/xml'); // set response header for xml
  const builder = new xml2js.Builder();
  if (req.session.username) {
    db.getUserAccounts(req.session.username).then((result) => {
      for (let i = 0; i < result.length; i++) {
        Object.keys(result[i]).map((key, idx) => {
          // escape data for HTML context
          result[i][key] = xssFilters.inHTMLData(result[i][key]);
        });
      }
      // form the object for XML
      const respObj = {accounts: []};
      for (const r of result) {
        respObj.accounts.push({account: r});
      }
      // build XML and send it over to front-end
      const xmlResp = builder.buildObject(respObj);
      resp.send(xmlResp);
    }).catch((err) => {
      console.log(err);
      resp.status(500);
      resp.send(builder.buildObject({accounts: {error: 'Unknown Error'}}));
    });
  } else {
    resp.status(401);
    resp.send(builder.buildObject({accounts: {error: 'Unauthorized'}}));
  }
});

/**
 * Handles retrieving information on a user's specific account
 * @param req the request
 * @param resp the response
 */
app.get('/my-account/:accountId', (req, resp) => {
  resp.set('Content-Type', 'text/xml'); // set response header for xml
  const builder = new xml2js.Builder();
  if (req.session.username) {
    // get data for the account
    db.getAccount(req.params.accountId,
        req.session.username).then((result) => {
      if (result) {
        Object.keys(result).map((key, idx) => {
          result[key] = xssFilters.inHTMLData(result[key]);
        });
        // build XML and send it over to front-end
        const xmlResp = builder.buildObject({account: result});
        resp.send(xmlResp);
      } else {
        const xmlResp = builder.buildObject({account: 'Account not found'});
        resp.status(404);
        resp.send(xmlResp);
      }
    }).catch((err) => {
      console.log(err);
      const xmlResp = builder.buildObject({account: 'Unknown error'});
      resp.status(500);
      resp.send(xmlResp);
    });
  } else {
    resp.status(401);
    resp.send(builder.buildObject({account: {error: 'Unauthorized'}}));
  }
});

/**
 * Handles retrieving the possible account types users can create
 * @param req the request
 * @param resp the response
 */
app.get('/account-types', (req, resp) => {
  resp.set('Content-Type', 'text/xml'); // set response header for xml
  const builder = new xml2js.Builder();
  db.getAccountTypes().then((result) => { // get the possible account types
    for (let i = 0; i < result.length; i++) {
      Object.keys(result[i]).map((key, idx) => {
        // escape data for HTML context
        result[i][key] = xssFilters.inHTMLData(result[i][key]);
      });
    }
    // build XML and send it over to front-end
    const xmlResp = builder.buildObject({types: result});
    resp.send(xmlResp);
  }).catch((err) => {
    console.log(err);
    resp.status(500);
    resp.send(builder.buildObject({types: {error: 'Unknown Error'}}));
  });
});

/**
 * Handles returning the page for creating a new bank account
 * @param req the request
 * @param resp the response
 */
app.get('/new-account', (req, resp) => {
  resp.sendFile(path.join(__dirname, 'views', 'new-account.html'));
});

/**
 * Handles POST requests with XML data for creating
 * a new bank account
 * @param req the request
 * @param resp the response
 */
app.post('/create-account', (req, resp) => {
  resp.set('Content-Type', 'text/xml'); // set response header for xml
  const accountTypes = []; // create a list of the possible types
  db.getAccountTypes().then((result) => {
    for (const i of result) {
      accountTypes.push(i.account_type);
    }
    if (areFormFieldsPresent(req.xml, ['account_type'])) {
      // form fields are present
      const choice = req.xml.form.account_type[0]; // type choice
      if (accountTypes.includes(choice)) {
        // valid account type selected, so insert
        db.insertAccount({bank_user_id: req.session.username,
          account_type: choice, balance: 0}).then(() => {
          // successfully inserted
          const builder = new xml2js.Builder();
          resp.status(201);
          resp.send(builder.buildObject({result: true}));
        }).catch((err) => {
          // unable to insert data
          console.log(err);
          resp.status(500);
          resp.send(buildXmlFormErrorSet([
            {
              name: 'account_type',
              error: 'Failed to insert data, please try again later',
            },
          ]));
        });
      } else {
        // the choice given was not valid
        resp.status(400);
        resp.send(buildXmlFormErrorSet([
          {
            name: 'account_type',
            error: 'Invalid account type choice',
          },
        ]));
      }
    } else {
      // fields were not present
      resp.status(400);
      resp.send(buildXmlFormErrorSet([
        {
          name: 'account_type',
          error: 'Required',
        },
      ]));
    }
  }).catch((err) => {
    // could not retrieve account types
    console.log(err);
    resp.status(500);
    resp.send(buildXmlFormErrorSet([
      {
        name: 'account_type',
        error: 'Unknown error',
      },
    ]));
  });
});

/**
 * Handles updating a specific account from XML data
 * @param req the request
 * @param resp the response
 */
app.post('/update-account', (req, resp) => {
  resp.set('Content-Type', 'text/xml'); // set response header for xml
  if (areFormFieldsPresent(req.xml, ['account', 'action',
    'change', 'transferAccount']) && req.session.username) {
    let check = true; // true indicates checks on input passed
    const account = req.xml.form.account[0]; // get all the values
    const accountDest = req.xml.form.transferAccount[0];
    const action = req.xml.form.action[0];
    let change = req.xml.form.change[0];
    const checkChange = validate.decimal(change); // validate amount
    if (!checkChange.result) {
      resp.status(400); // failed validation, send over errors
      resp.send(buildXmlFormErrorSet([
        {
          name: 'change',
          error: checkChange.reason,
        },
      ]));
      check = false;
    } else { // check passed, get amount as a number
      change = parseFloat(change);
    }
    // verify that the selected action is a valid choice
    if (!['deposit', 'withdraw', 'transfer'].includes(action)) {
      resp.status(400);
      resp.send(buildXmlFormErrorSet([
        {
          name: 'action',
          error: 'Invalid action choice',
        },
      ]));
      check = false;
    }
    // if all checks passed, continue on to perform action
    if (check) {
      let transfer = false; // behavior is different if transfer
      db.getUserAccounts(req.session.username).then((accounts) => {
        // verify that the user owns the selected account
        if (accounts.some((val) => account === String(val.account_id))) {
          // user owns the account, get the account's data
          db.getAccount(account, req.session.username).then((acc) => {
            let accountBal = parseFloat(acc.balance); // account balance
            if (action === 'deposit') {
              accountBal += change; // deposit, add to balance
            } else if (action === 'withdraw' && accountBal >= change) {
              accountBal -= change; // withdraw, subtract from balance
            } else if (action === 'withdraw') {
              resp.status(400); // not enough money in account for withdraw
              resp.send(buildXmlFormErrorSet([
                {
                  name: 'change',
                  error: 'Balance insuffient for withdraw',
                },
              ]));
            } else {
              transfer = true; // transer, so must change two accounts
              // verify that user owns the second account for the transfer
              // also verify that the transfer account is not the same
              if (accounts.some((val) => {
                return accountDest === String(val.account_id);
              }) && accountDest !== account) {
                // get the account info for the transfer account
                db.getAccount(accountDest,
                    req.session.username).then((accDest) => {
                  let accDestBalance = parseFloat(accDest.balance); // balance
                  // check that sufficient balance for transfer
                  if (accountBal >= change) {
                    accountBal -= change; // take from main account choice
                    accDestBalance += change; // add to destination account
                    // update both accounts
                    db.updateAccount(account, accountBal).then(() => {
                      db.updateAccount(accountDest,
                          accDestBalance).then(() => {
                        // successfully updated both accounts, send resp
                        const builder = new xml2js.Builder();
                        resp.status(202);
                        resp.send(builder.buildObject({result: true}));
                      }).catch((err) => {
                        // database error encountered
                        console.log(err);
                        resp.status(500);
                        resp.send(buildXmlFormErrorSet([
                          {
                            name: 'change',
                            error: 'Could not update account balance',
                          },
                        ]));
                      });
                    }).catch((err) => {
                      // database error encountered
                      console.log(err);
                      resp.status(500);
                      resp.send(buildXmlFormErrorSet([
                        {
                          name: 'change',
                          error: 'Could not update account balance',
                        },
                      ]));
                    });
                  } else {
                    // not enough money in account for transfer
                    resp.status(400);
                    resp.send(buildXmlFormErrorSet([
                      {
                        name: 'change',
                        error: 'Balance insuffient for transfer',
                      },
                    ]));
                  }
                }).catch((err) => {
                  // failed to verify account info
                  console.log(err);
                  resp.status(500);
                  resp.send(buildXmlFormErrorSet([
                    {
                      name: 'transferAccount',
                      error: 'Could not confirm account',
                    },
                  ]));
                });
              } else {
                // failed to verify account info for transfer
                resp.status(400);
                resp.send(buildXmlFormErrorSet([
                  {
                    name: 'transferAccount',
                    error: 'Could not confirm account '
                             + '(ensure that account choices are different)',
                  },
                ]));
              }
            }
            if (!transfer) {
              // not a transfer, so just update the main account choice
              db.updateAccount(account, accountBal).then(() => {
                const builder = new xml2js.Builder();
                resp.status(202);
                resp.send(builder.buildObject({result: true}));
              }).catch((err) => {
                // database error encountered
                console.log(err);
                resp.status(500);
                resp.send(buildXmlFormErrorSet([
                  {
                    name: 'change',
                    error: 'Could update account balance',
                  },
                ]));
              });
            }
          }).catch((err) => {
            // database error encountered
            console.log(err);
            resp.status(500);
            resp.send(buildXmlFormErrorSet([
              {
                name: 'account',
                error: 'Could not confirm account',
              },
            ]));
          });
        } else {
          // could not verify that the user own's the account
          resp.status(401);
          resp.send(buildXmlFormErrorSet([
            {
              name: 'account',
              error: 'Could not verify account ownership',
            },
          ]));
        }
      }).catch((err) => {
        // database error encountered
        console.log(err);
        resp.status(500);
        resp.send(buildXmlFormErrorSet([
          {
            name: 'change',
            error: 'Unknown error',
          },
        ]));
      });
    }
  } else {
    // could not get the form fields needed
    resp.status(400);
    resp.send(buildXmlFormErrorSet([
      {
        name: 'account',
        error: 'Required',
      },
      {
        name: 'action',
        error: 'Required',
      },
      {
        name: 'change',
        error: 'Required',
      },
    ]));
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
const server = https.createServer({
  key: fs.readFileSync(httpsConfig.key),
  cert: fs.readFileSync(httpsConfig.cert),
  passphrase: httpsConfig.passphrase,
}, app);
server.listen(3000, () => {
  console.log('Listening on port 3000 (NOTE: all requests must be HTTPS)');
});

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
