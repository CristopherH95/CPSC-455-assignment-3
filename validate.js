/**
 * collection of methods for validating data,
 * each returns an object where 'result' is true/false
 * indicating whether the input should be valid,
 * and 'reason' is a string explaining why input is invalid (if applicable)
 * @namespace validate defines functions for validateing user input data
 * @property {function} userName checks if the given username is alphanumeric
 *                      and does not already exist
 * @property {function} userNameNoDb checks if a given username is alphanumeric,
 *                      but does not check the database
 * @property {function} address checks if the given address contains only
 *                      numbers, letters, "." and spaces
 * @property {function} name checks if the given name (first or last)
 *                      contains only letters, "'", ".", and "-", and
 *                      verifies there are not consecutive "-"
 * @property {function} city checks if the given city contains only
 *                      alphabetical symbols, "'", ",", ".", and "-"
 * @property {function} stateCountry checks if the given state or country name
 *                      contains only alphabetical letters and spaces
 * @property {function} password checks if the given password contains
 *                      at least one of each:
 *                          uppercase character, lowercase character, digit,
 *                          and special character
 *                          as well as being sufficiently long
 * @see https://github.com/OWASP/CheatSheetSeries/blob/master/cheatsheets/Authentication_Cheat_Sheet.md for password complexity guidelines used
 */
let validate = {
  /**
     *
     * @param {string} input the input value for the user name
     * @param {object}
     *              db a database object with methods/connection
     *              needed to check the database
     * @return {Promise<{result: boolean, reason: string}>}
     *              a promise indicating if the username is valid to be used
     */
  userName: async function(input, db) {
    if (typeof(input) !== 'string') {
      return {result: false, reason: 'Username must be a string of characters'};
    }
    const uName = input.toLowerCase();
    if (!/^([a-z0-9]){1,35}$/.test(uName)) {
      return {
        result: false,
        reason: 'Username must be alphanumeric and '
                + 'be between 1 and 35 characters in length',
      };
    }
    try {
      const dbCheck = await db.getUser(uName);
      if (dbCheck === undefined) {
        return {result: true, reason: ''};
      }
      return {result: false, reason: 'Username already exists'};
    } catch (err) {
      console.log(err);
      return {
        result: false,
        reason: 'Encountered error while checking username',
      };
    }
  },
  /**
     *
     * @param {string} input the input value for the user name
     * @return {{result: boolean, reason: string}}
     *              a promise indicating if the username is valid to be used
     */
  userNameNoDb: function(input) {
    if (typeof(input) !== 'string') {
      return {result: false, reason: 'Username must be a string of characters'};
    }
    if (!/^([a-z0-9]){1,35}$/i.test(input)) {
      return {
        result: false,
        reason: 'Username must be alphanumeric and'
                + 'be between 1 and 35 characters in length',
      };
    }
    return {result: true, reason: ''};
  },
  /**
     *
     * @param {string} input the input value for the address
     * @return {{result: boolean, reason: string}}
     *              an object indicating whether the address is valid
     */
  address: function(input) {
    if (typeof(input) !== 'string') {
      return {result: false, reason: 'Address must be a string of characters'};
    }
    if (!/^([0-9a-z. ]){1,100}$/i.test(input)) {
      return {
        result: false,
        reason: 'Address must be between 1 and 100 characters in length and '
                + 'contain only alphanumeric symbols and "."',
      };
    }
    return {result: true, reason: ''};
  },
  /**
     *
     * @param {string} name the input value for the name
     * @return {{result: boolean, reason: string}}
     *              an object indicating whether the name is valid
     */
  name: function(name) {
    if (typeof(name) !== 'string') {
      return {result: false, reason: 'Name must be a string of characters'};
    }
    if (!/^([a-zA-Z'-]){1,50}$/.test(name)) {
      return {
        result: false,
        reason: 'Name must be between 1 and 50 characters in length and '
                + 'contain only alphanumeric symbols, "\'" and "-"',
      };
    } else if (/(\-\-)+/g.test(name)) {
      return {result: false, reason: 'Name cannot contain consequtive "-"'};
    }
    return {result: true, reason: ''};
  },
  /**
     *
     * @param {string} cityName the input value for the city name
     * @return {{result: boolean, reason: string}}
     *              an object indicating whether the city name is valid
     */
  city: function(cityName) {
    if (typeof(cityName) !== 'string') {
      return {result: false, reason: 'City must be a string of characters'};
    }
    if (!/^([a-zA-Z',.\- ]){1,60}$/.test(cityName)) {
      return {
        result: false,
        reason: 'City must be between 1 and 25 characters in length and '
                + 'contain only alphabetical symbols, "\'", ",", ".", and "-"',
      };
    } else if (/(\-\-)+/g.test(cityName)) {
      return {result: false, reason: 'City cannot contain consequtive "-"'};
    }
    return {result: true, reason: ''};
  },
  /**
     *
     * @param {string} name the input value for the state or country
     * @return {{result: boolean, reason: string}}
     *              an object indicating whether the state or country is valid
     */
  stateCountry: function(name) {
    if (typeof(name) !== 'string') {
      return {
        result: false,
        reason: 'State/country must be a string of characters',
      };
    }
    if (!/^([a-zA-Z ]){2,55}$/.test(name)) {
      return {
        result: false,
        reason: 'State/country must be between 2 and 50 characters in length '
                + 'and contain only alphabetical symbols',
      };
    }
    return {result: true, reason: ''};
  },
  /**
     *
     * @param {string} pass the input value for the password
     * @return {{result: boolean, reason: string}}
     *              an object indicating whether the password is valid
     */
  password: function(pass) {
    if (typeof(pass) !== 'string') {
      return {result: false, reason: 'Password must be a string of characters'};
    }
    const check = {result: true, reason: ''};
    // characters from OWASP: https://www.owasp.org/index.php/Password_special_characters
    const special = ' !"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~'.split('');
    if (pass.length < 10 || pass.length > 128) {
      check.result = false;
      check.reason += 'Must be at least 10 characters in length';
      check.reason += 'and no longer than 128 characters';
    }
    if (!pass.split('').some((char) => special.includes(char))) {
      if (!check.result) {
        check.result = false;
        check.reason += ';';
      }
      check.reason += 'Must contain at least one special character';
    }
    if (!/[a-z]/.test(pass)) {
      if (!check.result) {
        check.result = false;
        check.reason += ';';
      }
      check.reason += 'Must contain at least one lowercase letter';
    }
    if (!/[A-Z]/.test(pass)) {
      if (!check.result) {
        check.result = false;
        check.reason += ';';
      }
      check.reason += 'Must contain at least on uppercase letter';
    }
    if (!/[0-9]/.test(pass)) {
      if (!check.result) {
        check.result = false;
        check.reason += ';';
      }
      check.reason += 'Must contain at least one digit';
    }
    if (/(.)\1\1/.test(pass)) {
      if (!check.result) {
        check.result = false;
        check.reason += ';';
      }
      check.reason += 'Must not contain 2 identical characters in a row';
    }
    return check;
  },
};
// freeze validate object so it cannot be altered
validate = Object.freeze(validate);

module.exports = validate;
