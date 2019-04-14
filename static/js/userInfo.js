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
            resolve(xHttpReq.responseXML);
      } else if (this.readyState === 4) {
        reject(xHttpReq.responseXML);
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
            resolve(xHttpReq.responseXML);
      } else if (this.readyState === 4) {
        reject(xHttpReq.responseXML);
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
            resolve(xHttpReq.responseXML);
      } else if (this.readyState === 4) {
        reject(xHttpReq.responseXML);
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
  const choice = this.options[this.selectedIndex].text;
  getAccountInfo(choice).then(function(result) {
    const aId = result.querySelector('account_id').textContent;
    const aType = result.querySelector('account_type').textContent;
    const bal = result.querySelector('balance').textContent;
    document.querySelector('.account-id').innerText = aId + ' (' + aType + ')';
    document.querySelector('.account-bal').innerText = bal;
  }).catch(function(err) {
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
  const choice = this.options[this.selectedIndex].value;
  if (choice === 'transfer') {
    document.getElementById('transfer-row').classList.remove('d-none');
  } else {
    document.getElementById('transfer-row').classList.add('d-none');
  }
}

// TODO: Implement populating of user data on the page
window.addEventListener('load', function(ev) {
  getBasicInfo().then(function(result) {
    console.log(result);
    const userName = result.querySelector('first_name').textContent;
    document.querySelector('.user-name').innerText = userName;
  }).catch(function(err) {
    console.log(err);
  });
  getAccounts().then(function(result) {
    console.log(result);
    const accountIds = result.getElementsByTagName('account_id');
    const select = document.querySelectorAll('.user-accounts');
    const account = document.getElementById('account-choice');
    const action = document.getElementById('account-action');
    let opt = null;
    for (const s of select) {
      for (const aId of accountIds) {
        opt = document.createElement('option');
        opt.text = aId.textContent;
        if (!accountOptions.includes(opt.text)) {
          accountOptions.push(opt.text);
        }
        s.add(opt);
      }
    }
    account.addEventListener(
      'change', accountChangeHandler
    );
    accountChangeHandler.call(account);
    action.addEventListener(
      'change', actionChangeHandler
    );
    actionChangeHandler.call(action);
  }).catch(function(err) {
    console.log(err);
  });
  const inputs = ['account', 'action', 'change', 'transferAccount'];
  xmlFormHandler.bindFormSubmit('/update-account', inputs, function(formSelector) {
    const accountSelect = document.getElementById('account-choice');
    const accountChoice = accountSelect.options[accountSelect.selectedIndex].text;
    const transferSelect = document.getElementById('account-transfer');
    const transferAcc = transferSelect.options[transferSelect.selectedIndex].text;
    const actionSelect = document.getElementById('account-action');
    const actionChoice = actionSelect.options[actionSelect.selectedIndex].value;
    const changeValue = document.getElementById('account-change').value;
    let valid = true;
    if (!accountOptions.includes(accountChoice)) {
      const errEl = xmlFormHandler.getOrCreateElement('#account-error',
                {tag: 'p', classes: ['text-danger'], id: 'account-error'},
                '[name="account"]');
      errEl.innerText = 'Invalid account option';
      valid = false;
    }
    if (!actionOptions.includes(actionChoice)) {
      const errEl = xmlFormHandler.getOrCreateElement('#action-error',
                {tag: 'p', classes: ['text-danger'], id: 'action-error'},
                '[name="action"]');
      errEl.innerText = 'Invalid action choice';
      valid = false;
    } else if (actionChoice === 'transfer' && transferAcc === accountChoice) {
      const errEl = xmlFormHandler.getOrCreateElement('#transferAccount-error',
                {tag: 'p', classes: ['text-danger'], id: 'transferAccount-error'},
                '[name="transferAccount"]');
      errEl.innerText = 'Accounts must not be the same';
      valid = false;
    }
    const numberCheck = validate.positiveNumber(changeValue);
    if (!numberCheck.result) {
      const errEl = xmlFormHandler.getOrCreateElement('#change-error',
                {tag: 'p', classes: ['text-danger'], id: 'change-error'},
                '[name="change"]');
      errEl.innerText = numberCheck.reason;
      valid = false;
    }

    return valid;
  }, 'form', '/dashboard');
});
