'use strict';

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

// TODO: Implement populating of user data on the page
window.addEventListener('load', function(ev) {
  getBasicInfo().then(function(result) {
    console.log(result);
  }).catch(function(err) {
    console.log(err);
  });
  getAccounts().then(function(result) {
    console.log(result);
  }).catch(function(err) {
    console.log(err);
  });
});
