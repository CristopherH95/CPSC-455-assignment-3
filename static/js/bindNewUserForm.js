'use strict';

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
              check = verify.name(value);
              break;
            case 'street':
              check = verify.address(value);
              break;
            case 'country_state':
            case 'country':
              check = verify.stateCountry(value);
              break;
            case 'username':
              check = verify.userName(value);
              break;
            default:
              check = verify[i](value); // the names of the remaining inputs
                                        // and their validators are the same
                                        // so just use them as the key
          }
          if (check.result === false) {
            valid = check.result; // only change valid if the check was false
            const errEl = xmlFormHandler.getOrCreateElement('#' + i + '-error',
                {tag: 'p', classes: ['text-danger'], id: i + '-error'},
                'input[name="' + i + '"]');
            errEl.innerText = check.reason;
          }
        }
        if (valid === true) {
          xmlFormHandler.cleanupErrors(inputs);
        }

        return valid;
      }, 'form', '/'); // TODO: new redirect URL
});
