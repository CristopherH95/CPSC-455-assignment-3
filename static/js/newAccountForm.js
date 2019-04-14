'use strict';

// a global for checking that selected options are valid
window.possibleOptions = [];

function getAccountTypes() {
  return new Promise(function(resolve, reject) {
    const xHttpReq = new XMLHttpRequest();
    xHttpReq.open('GET', '/account-types');
    xHttpReq.responseType = 'document'; // accept text responses
    xHttpReq.onreadystatechange = function() {
      // check if request complete
      if (this.readyState === 4 && 
          this.status >= 200 && this.status <= 299) {
            // request complete and successful, resolve
            resolve(xHttpReq.responseXML);
      } else if (this.readyState === 4) {
        // complete, but not successful, reject
        reject(xHttpReq.responseXML);
      }
    };
    // send off request to server
    xHttpReq.send();
  });
}

window.addEventListener('load', function(ev) {
  // get the possible account types
  getAccountTypes().then(function(result) {
    // get the types from the XML response
    const types = result.getElementsByTagName('account_type');
    // get the select element
    const typeSelect = document.getElementById('account-type');
    // name of the inputs
    const inputNames = ['account_type'];
    let opt = null;
    // add all the account types from the XML response to the select
    for (const t of types) {
      opt = document.createElement('option');
      opt.text = DOMPurify.sanitize(
        t.textContent
      );
      possibleOptions.push(opt.text);
      typeSelect.add(opt);
    }
    // bind the form submission
    xmlFormHandler.bindFormSubmit('/create-account', 
      inputNames, function() {
        const select = document.getElementById('account-type');
        const value = select.options[select.selectedIndex].text;
        // if the option is not valid, show an error
        if (!possibleOptions.includes(value)) {
          const errEl = xmlFormHandler.getOrCreateElement('#account_type-error',
                {tag: 'p', classes: ['text-danger'], id: 'account_type-error'},
                '#account-type');
          errEl.innerText = 'Invalid account type choice';
          return false;
        } else {
          // valid, clean up any errors
          xmlFormHandler.cleanupErrors(['account_type']);
          return true;
        }
      }, 'form', '/dashboard');
  }).catch(function(err) {
    console.log(err); // couldn't get the account types from the database
    alert('Could not retrieve account types, please try again.');
  });
});