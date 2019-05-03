'use strict';

/**
 * @namespace validate
 * defines functions for validateing user input data
 */
window.validate = (function() {
  const namespace = {};
  Object.defineProperties(namespace, {
    /**
     *
     * @param {string} input the input value for the user name
     * @returns {{result: boolean, reason: string}}
     *          A promise indicating if the username is valid to be used
     */
    userName: {
      value: function(input) {
        if (typeof(input) !== 'string') {
          return {
            result: false,
            reason: 'Username must be a string of characters',
          };
        }
        if (!/^([a-z0-9]){1,35}$/i.test(input)) {
          return {
            result: false,
            reason: 'Username must be alphanumeric and '
                    + 'be between 1 and 35 characters in length',
          };
        }
        return {result: true, reason: ''};
      },
      enumerable: true,
    },
    /**
         *
         * @param {string} input the input value for the address
         * @returns {{result: boolean, reason: string}}
         *          An object indicating whether the address is valid
         */
    address: {
      value: function(input) {
        if (typeof(input) !== 'string') {
          return {
            result: false,
            reason: 'Address must be a string of characters',
          };
        }
        if (!/^([0-9a-z. ]){1,100}$/i.test(input)) {
          return {
            result: false,
            reason: 'Address must be between 1 and 100 characters '
                    + 'in length and contain only alphanumeric symbols '
                    + 'and "."',
          };
        }
        return {result: true, reason: ''};
      },
      enumerable: true,
    },
    /**
     *
     * @param {string} name the input value for the name
     * @returns {{result: boolean, reason: string}}
     *          An object indicating whether the name is valid
     */
    name: {
      value: function(name) {
        if (typeof(name) !== 'string') {
          return {result: false, reason: 'Name must be a string of characters'};
        }
        if (!/^([a-zA-Z'-]){1,50}$/.test(name)) {
          return {
            result: false,
            reason: 'Name must be between 1 and 50 characters '
                    + 'in length and contain only alphanumeric symbols, '
                    + '"\'" and "-"',
          };
        } else if (/(\-\-)+/g.test(name)) {
          return {result: false, reason: 'Name cannot contain consequtive "-"'};
        }
        return {result: true, reason: ''};
      },
      enumerable: true,
    },
    /**
     *
     * @param {string} cityName the input value for the city name
     * @returns {{result: boolean, reason: string}}
     *          An object indicating whether the city name is valid
     */
    city: {
      value: function(cityName) {
        if (typeof(cityName) !== 'string') {
          return {result: false, reason: 'City must be a string of characters'};
        }
        if (!/^([a-zA-Z',.\- ]){1,60}$/.test(cityName)) {
          return {
            result: false,
            reason: 'City must be between 1 and 25 characters in length '
                    + 'and contain only alphabetical symbols, '
                    + '"\'", ",", ".", and "-"',
          };
        } else if (/(\-\-)+/g.test(name)) {
          return {result: false, reason: 'City cannot contain consequtive "-"'};
        }
        return {result: true, reason: ''};
      },
      enumerable: true,
    },
    /**
         *
         * @param {string} name the input value for the state or country
         * @returns {{result: boolean, reason: string}}
         *          An object indicating whether the state or country is valid
         */
    stateCountry: {
      value: function(name) {
        if (typeof(name) !== 'string') {
          return {
            result: false,
            reason: 'State/country must be a string of characters',
          };
        }
        if (!/^([a-zA-Z ]){2,55}$/.test(name)) {
          return {
            result: false,
            reason: 'State/country must be between 2 and 50 characters '
                    + 'in length and contain only alphabetical symbols',
          };
        }
        return {result: true, reason: ''};
      },
      enumerable: true,
    },
    /**
         *
         * @param {string} pass the input value for the password
         * @returns {{result: boolean, reason: string}}
         *          An object indicating whether the password is valid
         */
    password: {
      value: function(pass) {
        if (typeof(pass) !== 'string') {
          return {
            result: false,
            reason: 'Password must be a string of characters',
          };
        }
        const check = {result: true, reason: ''};
        const special = ' !"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~'.split('');
        if (pass.length < 10 || pass.length > 128) {
          check.result = false;
          check.reason += 'Must be at least 10 characters in length '
                          + 'and no longer than 128 characters';
        }
        if (!pass.split('').some(function(char) {
          special.includes(char);
        })) {
          if (!check.result) {
            check.result = false;
            check.reason += '; ';
          }
          check.reason += 'Must contain at least one special character';
        }
        if (!/[a-z]/.test(pass)) {
          if (!check.result) {
            check.result = false;
            check.reason += '; ';
          }
          check.reason += 'Must contain at least one lowercase letter';
        }
        if (!/[A-Z]/.test(pass)) {
          if (!check.result) {
            check.result = false;
            check.reason += '; ';
          }
          check.reason += 'Must contain at least on uppercase letter';
        }
        if (!/[0-9]/.test(pass)) {
          if (!check.result) {
            check.result = false;
            check.reason += '; ';
          }
          check.reason += 'Must contain at least one digit';
        }
        if (/(.)\1\1/.test(pass)) {
          if (!check.result) {
            check.result = false;
            check.reason += '; ';
          }
          check.reason += 'Must not contain more than 2 '
                          + 'identical characters in a row';
        }
        return check;
      },
      enumerable: true,
    },
    positiveNumber: {
      value: function(input) {
        const inputStr = String(input);
        if (!inputStr) {
          return {result: false, reason: 'No values provided'};
        } else {
          if (!/^\d+\.\d{2}$/.test(inputStr)) {
            return {result: false, reason: 'Decimal values of two places only'};
          } else {
            return {result: true, reason: ''};
          }
        }
      },
      enumerable: true,
    },
  });
  return namespace;
})();
