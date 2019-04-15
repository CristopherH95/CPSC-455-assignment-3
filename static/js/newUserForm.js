'use strict';

/**
 * Adds feedback for a specified list item
 * @param {string} elId element id to add the feedback to
 * @param {boolean} success whether to add success or error
 */
function addFeedback(elId, success) {
  document.getElementById(elId).classList.add(
    (success) ? 'list-group-item-success' : 'list-group-item-danger'
  );
  document.getElementById(elId).classList.remove(
    (success) ? 'list-group-item-danger' : 'list-group-item-success'
  );
}

/**
 * Checks that a password meets the required criteria,
 * dynamically updates the criteria list visually
 */
function checkPassword() {
  console.log('check');
  const passVal = document.querySelector('input[name="password"]').value;
  const special = ' !"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~'.split('');
  if (passVal.length < 10 || passVal.length > 128) {
    console.log('length');
    addFeedback('pass-length', false);
  } else {
    addFeedback('pass-length', true);
  }
  if (!passVal.split('').some(function(char) { 
    return special.includes(char) })) {
      addFeedback('pass-char', false);
  } else {
    addFeedback('pass-char', true);
  }
  if (!/[a-z]/.test(passVal)) {
    addFeedback('pass-lower', false);
  } else {
    addFeedback('pass-lower', true);
  }
  if (!/[A-Z]/.test(passVal)) {
    addFeedback('pass-upper', false);
  } else {
    addFeedback('pass-upper', true);
  }
  if (!/[0-9]/.test(passVal)) {
    addFeedback('pass-digit', false);
  } else {
    addFeedback('pass-digit', true);
  }
  if (/(.)\1\1/.test(passVal)) {
    addFeedback('pass-repeat', false);
  } else {
    addFeedback('pass-repeat', true);
  }
}

window.addEventListener('load', function(ev) {
  const inputNames = ['first_name', 'last_name', 'street',
    'city', 'country_state', 'country',
    'username', 'password'];
  xmlFormHandler.bindFormSubmit('/create-user',
      inputNames, function(formSelector) {
        let valid = true;
        const inputs = ['first_name', 'last_name', 'street',
          'city', 'country_state', 'country',
          'username', 'password']; // avoiding using inputNames from outer scope
        for (const i of inputs) {
          const value = document.querySelector(
              formSelector + ' input[name="' + i + '"]'
          ).value;
          let check;
          switch (i) {
            case 'first_name':
            case 'last_name':
              check = validate.name(value);
              break;
            case 'street':
              check = validate.address(value);
              break;
            case 'country_state':
            case 'country':
              check = validate.stateCountry(value);
              break;
            case 'username':
              check = validate.userName(value);
              break;
            default:
              check = validate[i](value); // the names of the remaining inputs
                                        // and their validators are the same
                                        // so just use them as the key
          }
          if (check.result === false) {
            valid = check.result; // only change valid if the check was false
            const errEl = xmlFormHandler.getOrCreateElement('#' + i + '-error',
                {tag: 'p', classes: ['text-danger'], id: i + '-error'},
                'input[name="' + i + '"]');
            errEl.textContent = check.reason;
          }
        }
        if (valid === true) {
          xmlFormHandler.cleanupErrors(inputs);
        }

        return valid;
      }, 'form', '/');
  document.querySelector(
      'input[name="password"]'
  ).addEventListener('change', checkPassword);
});
