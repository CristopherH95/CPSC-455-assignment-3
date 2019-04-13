'use strict';

/**
 * Gets XML data for the currently logged in user
 * @return {Document} the resulting XML
 */
function getBasicInfo() {
  return new Promise(function(resolve, reject) {
    const xHttpReq = new XMLHttpRequest();
    xHttpReq.open('GET', '/my-info');
    xHttpReq.responseType = 'document'; // accept text responses
    xHttpReq.send();
    xHttpReq.onreadystatechange = function() {
      if (this.readyState === 4 && 
          this.status >= 200 && this.status <= 299) {
            resolve(xHttpReq.responseXML);
      } else if (this.readyState === 4) {
        reject(xHttpReq.responseXML);
      }
    }
  });
}

// TODO: Implement populating of user data on the page
window.addEventListener('load', function(ev) {
  getBasicInfo().then((result) => {
    console.log(result);
  }).catch((err) => {
    console.log(err);
  });
});
