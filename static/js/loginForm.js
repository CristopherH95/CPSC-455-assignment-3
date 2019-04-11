'use strict';

window.addEventListener('load', function(ev) {
  xmlFormHandler.bindFormSubmit('/login', ['username', 'password'],
      null, 'form', '/dashboard');
});
