'use strict';

const accountOptions = [];
const actionOptions = ['deposit', 'withdraw', 'transfer'];

/**
 * Gets XML data for the currently logged in user
 * @return {Promise<Document>} the resulting XML
 */
function getBasicInfo() {
  return new Promise(function(resolve, reject) {
    const xHttpReq = new XMLHttpRequest();
    xHttpReq.open('GET', '/my-info');
    xHttpReq.responseType = 'document'; // accept text responses
    xHttpReq.onreadystatechange = function() {
      if (this.readyState === 4 && 
          this.status >= 200 && this.status <= 299) {
            resolve(xHttpReq.responseXML);  // successful response
      } else if (this.readyState === 4) {
        reject(xHttpReq.responseXML); // failed response
      }
    };
    xHttpReq.send();
  });
}

/**
 * Gets XML data for all the user's current bank accounts
 * @return {Promise<Document>} the resulting XML
 */
function getAccounts() {
  return new Promise(function(resolve, reject) {
    const xHttpReq = new XMLHttpRequest();
    xHttpReq.open('GET', '/my-accounts');
    xHttpReq.responseType = 'document'; // accept text responses
    xHttpReq.onreadystatechange = function() {
      if (this.readyState === 4 && 
          this.status >= 200 && this.status <= 299) {
            resolve(xHttpReq.responseXML); // successful response
      } else if (this.readyState === 4) {
        reject(xHttpReq.responseXML); // failed response
      }
    };
    xHttpReq.send();
  });
}

/**
 * Gets XML data for a specific account
 * @param {number} accountId the account number
 * @return {Promise<Document>} the resulting XML
 */
function getAccountInfo(accountId) {
  return new Promise(function(resolve, reject) {
    const xHttpReq = new XMLHttpRequest();
    xHttpReq.open('GET', '/my-account/' + String(accountId));
    xHttpReq.responseType = 'document'; // accept text responses
    xHttpReq.onreadystatechange = function() {
      if (this.readyState === 4 && 
          this.status >= 200 && this.status <= 299) {
            resolve(xHttpReq.responseXML); // successful response
      } else if (this.readyState === 4) {
        reject(xHttpReq.responseXML); // failed response
      }
    };
    xHttpReq.send();
  });
}

/**
 * Handler for change events on the account choice
 * gets and sets account data for display on the page
 */
function accountChangeHandler() {
  const choice = this.options[this.selectedIndex].text; // get selected choice
  getAccountInfo(choice).then(function(result) { // get account info for choice
    // set the text on the page to display the account info from the server
    const aId = DOMPurify.sanitize(
      result.querySelector('account_id').textContent
    );
    const aType = DOMPurify.sanitize(
      result.querySelector('account_type').textContent
    );
    const bal = DOMPurify.sanitize(
      result.querySelector('balance').textContent
    );
    document.querySelector('.account-id').innerText = DOMPurify.sanitize(
      aId + ' (' + aType + ')'
    );
    document.querySelector('.account-bal').innerText = bal;
  }).catch(function(err) {
    // failed to retrieve account data
    console.log(err);
    alert('Could not load account data, '
          + 'please verify connection to the server.');
  });
}

/**
 * Handler for change events on the account action choice
 * reveals the second select element for transfers
 */
function actionChangeHandler() {
  const choice = this.options[this.selectedIndex].value; // get selected action
  if (choice === 'transfer') {
    // if choice is a transfer, reveal the option for the transfer account
    document.getElementById('transfer-row').classList.remove('d-none');
  } else {
    // not a transfer, so hide the option for the transfer account
    document.getElementById('transfer-row').classList.add('d-none');
  }
}

window.addEventListener('load', function(ev) {
  getBasicInfo().then(function(result) {
    // get the user's info from the server to display
    const userName = DOMPurify.sanitize(
      result.querySelector('first_name').textContent
    );
    document.querySelector('.user-name').innerText = userName;
  }).catch(function(err) {
    console.log(err);
  });
  getAccounts().then(function(result) {
    // get the account numbers the user owns and populate choices
    const accountIds = result.getElementsByTagName('account_id');
    const select = document.querySelectorAll('.user-accounts');
    const account = document.getElementById('account-choice');
    const action = document.getElementById('account-action');
    let opt = null;
    for (const s of select) {
      for (const aId of accountIds) {
        opt = document.createElement('option'); // create option
        // set option content to data from server
        opt.text = DOMPurify.sanitize(
          aId.textContent
        );
        if (!accountOptions.includes(opt.text)) {
          accountOptions.push(opt.text);  // record the valid accounts
        }
        s.add(opt); // add the option
      }
    }
    // populate data on page for each account on change of account
    account.addEventListener(
      'change', accountChangeHandler
    );
    accountChangeHandler.call(account);
    // show/hide transfer account based on action choice
    action.addEventListener(
      'change', actionChangeHandler
    );
    actionChangeHandler.call(action);
  }).catch(function(err) {
    console.log(err);
  });
  // input fields
  const inputs = ['account', 'action', 'change', 'transferAccount'];
  // bind the form using the XML handler
  xmlFormHandler.bindFormSubmit('/update-account', inputs, function(formSelector) {
    // get all input values
    const accountSelect = document.getElementById('account-choice');
    const accountChoice = accountSelect.options[accountSelect.selectedIndex].text;
    const transferSelect = document.getElementById('account-transfer');
    const transferAcc = transferSelect.options[transferSelect.selectedIndex].text;
    const actionSelect = document.getElementById('account-action');
    const actionChoice = actionSelect.options[actionSelect.selectedIndex].value;
    const changeValue = document.getElementById('account-change').value;
    let valid = true; // if the inputs are not valid, do not send them over
    if (!accountOptions.includes(accountChoice)) {
      // if the selected account was not one of the valid options, show error
      const errEl = xmlFormHandler.getOrCreateElement('#account-error',
                {tag: 'p', classes: ['text-danger'], id: 'account-error'},
                '[name="account"]');
      errEl.innerText = 'Invalid account option';
      valid = false;  // invalid
    }
    if (!actionOptions.includes(actionChoice)) {
      // if the action was not one of the valid options, show error
      const errEl = xmlFormHandler.getOrCreateElement('#action-error',
                {tag: 'p', classes: ['text-danger'], id: 'action-error'},
                '[name="action"]');
      errEl.innerText = 'Invalid action choice';
      valid = false;  // invalid
    } else if (actionChoice === 'transfer' && transferAcc === accountChoice) {
      // if the action is a transfer, cannot transfer to and from same account
      const errEl = xmlFormHandler.getOrCreateElement('#transferAccount-error',
                {tag: 'p', classes: ['text-danger'], id: 'transferAccount-error'},
                '[name="transferAccount"]');
      errEl.innerText = 'Accounts must not be the same';
      valid = false;  // invalid
    }
    const numberCheck = validate.positiveNumber(changeValue);
    if (!numberCheck.result) {
      // the change value must be a number, nothing else is allowed
      const errEl = xmlFormHandler.getOrCreateElement('#change-error',
                {tag: 'p', classes: ['text-danger'], id: 'change-error'},
                '[name="change"]');
      errEl.innerText = numberCheck.reason;
      valid = false;  // invalid
    }

    return valid;
  }, 'form', '/dashboard');
});
