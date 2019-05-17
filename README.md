# CPSC-455-assignment-3
Simulated banking web app for CPSC-455 Web Security

Developed by Cristopher Hernandez, cristopherh@csu.fullerton.edu


Note: this web app is only compatible with newer browsers due to use of some ES6 language features.

Pre-requisites:
- MySQL (ver >= 5.7.6)
- OpenSSL

To setup this app, first install MySQL in the most convenient method for your platform.
A page with help can be found here: https://dev.mysql.com/doc/refman/8.0/en/installing.html
Once this is done, the file "createdb.sql" contains statements to run for the apps default configuration.
This can be run by first opening a mysql shell with root privileges and running ```source createdb.sql```.

Finally, navigate to the directory containing this repository's package.json file and run the following:

```
npm install
```

This will begin the install process, and the app will prompt you for the information it must use to access the database.
At the end of the install process, the app will ask whether a certificate should be generated for testing.
This uses OpenSSL, and so requires that it be installed and accessible from the command line.
If a private key and certificate already exists, the path to both of these can optionally be specified instead.
The app will be usable with the self-signed certificate, but it will need to be installed as a trusted certificate if browser warnings are to be avoided.

After finishing, run ```npm start``` or ```node app.js``` to launch the server. The server will then listen on port 3000 for connections over the HTTPS protocol.

## Application Design

This web app uses the built in features of the Node mysql2 package to protect against SQL injection.
For secure communications only HTTPS is used. Further, password storage is secured using bcrypt to hash and salt them.
In addition, input validation, output sanitization, XSS headers, and CSP headers are used to protect against XSS attacks.
For broken authentication protection, this web app locks accounts on repeated login attempts, requires strict constraints on
passwords, and prevents access to data not associated with a logged in user.

### SQL Injection Protection

All user inputs are validated on both the front end and the back end to protect against malicious data.
Additionally, the mysql2 package provides an API for prepared statements, which is used here.
OWASP's recommendation is first to used prepared statements, which is why they are utilized here.
As such, the application should be secured against SQL injection attempts.

### User Data

The application takes the following input for user information:
- user name
- password
- first name
- last name
- street address
- city
- state
- country
- bank account choices
- deposit, withdrawal, transfer numbers

All data is validated on both the front-end and the back-end. 
Restrictions are placed on each input in the following way:

User Name:
```
Alphanumeric characters only
Must be unique
Case insensitive
Maximum length of 35 characters
```
Password:
```
Length between 10 and 128 characters
At least one special character (as defined here: https://www.owasp.org/index.php/Password_special_characters)
At least one lowercase letter
At least one uppercase letter
At least one number
No more than two consecutive instances of the same character
```
First and Last Names:
```
Uppercase and lowercase letters, apostrophe, dash
No consecutive dashes allowed
Maximum length of 50 characters
```
Street Address:
```
Alphanumeric characters, ".", and spaces
Maximum length of 100 characters
```
City:
```
Alphabetical characters, apostrophe, comma, period, dash, and spaces
No consecutive dashes
Maximum length of 60 characters
```
State and Country:
```
Alphabetical characters and spaces
2 to 55 characters in length
```

The choices for the type of bank account are determined by a database table, and verified against that table.
All numbers and action choices (deposit, withdrawal, transfer) are verified on both the front-end and back-end.

### Front End

The following pieces of user input are displayed in the HTML element context:
- first name
- street address
- city
- state
- country

In order to protect against the introduction of XSS, these values are sanitized using the DOMPurify front-end script.
This is to help protect against potential XSS attacks (such as DOM based XSS) which may take advantage of dynamically 
created elements.

All data is passed between the front-end and back-end via XML, as specified in the project requirements.
Form data is serialized into XML, and then sent over to the server via XMLHTTPRequests.


### Back End

All data is verified before being saved into the database.
In addition, all outgoing data is sanitized using the 'xss-filters' package using the "inHTMLData" method.
This outgoing data, after being sanitized, is serialized into XML and sent over to the front end.
Login attempts are tracked by the server for each user name. If the user exceeds three consecutive failed attempts,
further attempts to login will be blocked for 10 minutes. As per the OWASP guidelines, the error messages for incorrect
user name or password is the same regardless of which one (or both) is incorrect. 

#### Sessions

Sessions are managed by the the 'client-sessions' package, and cookies encrypted using a long secret string.
The duration of a valid session is 3 minutes, activity can keep a user session valid for an additional 1 minute.
All cookies are set to HTTP only. Access to any account data is restricted to data which is assoicated with a valid
user session's username. This means that a user who is logged in under the user name 'Bob87' can only access records associated
with that user name, and no others.

The following paths can be accessed without the need for a valid session:
```
/
/login
/new-user
/create-user
```
Accessing these paths with an already valid session will cause a redirect to the '/dashboard' path.
Any other path not in the above list will cause a redirect to the '/' path, when a user does not have a session active.

#### Content Security Policy

The following directives are used:
```
default source: 'self'
script source: 'self'
style source: 'self'
object source: 'none'
```

## Packages and Resources Used

The following is used for the front end:
```
Bootstrap 4 CSS Component -> styling
DOMPurify -> sanitization
```

The following is used for the back end:
```
express -> server functionality/routing
client-sessions -> session management
xss-filters -> back-end sanitization
helmet -> CSP specification
body-parser -> accessing POST data
mysql2 -> database management
bcrypt -> password hashing
xml2js -> back-end XML serialization/deserialization
```

Miscellaneous packages used:
```
ESLint -> code formatting
ESLint Google Config -> code style
```
