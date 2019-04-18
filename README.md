# CPSC-455-assignment-2
Simulated banking web app for CPSC-455 Web Security

To setup this app, navigate to the top level directory which contains the "package.json" file and run:
```
npm install
```
After finishing this, run:
```
npm start
```
or
```
node app.js
```
to launch the server. The server will then listen on port 3000 for connections.

## Application Design

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
sqlite3 -> database management
bcrypt -> password hashing
xml2js -> back-end XML serialization/deserialization
```

Miscellaneous packages used:
```
ESLint -> code formatting
ESLint Google Config -> code style
```
