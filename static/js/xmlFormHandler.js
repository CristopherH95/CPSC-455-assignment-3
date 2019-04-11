'use strict';

/**
 * @namespace xmlFormHandler
 * defines a collection of functions for handling form data with XML
 */
window.xmlFormHandler = (function() {
  const namespace = {};
  Object.defineProperties(namespace, {
    /**
      * serializes a given form into an XML document string
      *
      * @function serializeForm
      * @memberof xmlFormHandler
      * @param {string} formSelector
      *         A selector to use to retrieve a form's inputs
      */
    serializeForm: {
      value: function(formSelector = 'form') {
        const fields = document.querySelectorAll(
            formSelector + ' input'
        ); // get all input fields
        let xml = '<?xml version=\'1.0\' standalone=\'yes\'?><form>';
        for (const i of fields) {
          // each attribute of <form> is a tag with the name of the field
          xml += '<' + String(i.name) + '>';
          // the value of each attribute is the form value
          xml += String(i.value);
          xml += '</' + String(i.name) + '>';
        }
        xml += '</form>';

        return xml;
      },
      enumerable: true,
    },
    /**
     * Returns an element using a selector, creating it if necessary
     *
     * @function getOrCreateElement
     * @memberof xmlFormHandler
     * @param {string} selector A selector to use to try to retrieve an element
     * @param {object} elAttrs
     *         An object containing the attributes
     *         'tag', 'classes', and 'id' to use in creating the element
     * @param {string} adjSelector
     *         A selector to use to get an element to use as a reference
     *         for inserting the new element
     */
    getOrCreateElement: {
      value: function(selector, elAttrs, adjSelector) {
        let el = document.querySelector(selector); // get the element
        if (!el) { // if could not find element, create it
          el = document.createElement(elAttrs.tag);
          if (elAttrs.classes) { // add classes
            for (const cls of elAttrs.classes) {
              el.classList.add(cls);
            }
          }
          el.id = elAttrs.id; // set ID
          // get the reference element
          const refNode = document.querySelector(adjSelector);
          // insert after the reference
          refNode.insertAdjacentElement('afterend', el);
        }

        return el;
      },
      enumerable: true,
    },
    /**
     * Removes any error elements related to
     * the given list of field names, if they exist
     *
     * @function cleanupErrors
     * @memberof xmlFormHandler
     * @param {Array<string>} fieldNames
     *         list of names to use for checking for error elements
     */
    cleanupErrors: {
      value: function(fieldNames) {
        for (const i of fieldNames) {
          const errEl = document.getElementById(i + '-error');
          if (errEl) {
            errEl.remove();
          }
        }
      },
      enumerable: true,
    },
    /**
     * Places elements containing error messages
     * from an XML based response to a form submission
     *
     * @function placeFormErrors
     * @memberof xmlFormHandler
     * @param {Array<string>} fieldNames list of field names in the form
     * @param {HTMLCollectionOf<element>} xmlErrorFields
     *         A collection of elements containing
     *         field error data from the server
     */
    placeFormErrors: {
      value: function(fieldNames, xmlErrorFields) {
        for (const field of fieldNames) {
          for (const i of xmlErrorFields) {
            const nameNode = i.querySelector('name');
            if (nameNode && nameNode.textContent === field) {
              // if the error field is the same as a form field,
              // add the error text
              const errorElId = field + '-error';
              const errorEl = this.getOrCreateElement('#' + errorElId,
                  {tag: 'p', classes: ['text-danger'], id: errorElId},
                  'input[name="' + field + '"]');
              const errorNode = i.querySelector('error');
              if (errorNode) {
                errorEl.innerText = errorNode.textContent;
              }
              break;
            }
          }
        }
      },
    },
    bindFormSubmit: {
      /**
       * @function bindFormSubmit
       * @memberof xmlFormHandler
       * @param {string} postUrl A URL to use for POSTing data
       * @param {Array<string>} fieldNames
       *         A list of field names to use for form errors
       * @param {function} checkForm
       *         A validation function to run before sending data,
       *         with the form selector as an argument
       *         (must return a boolean value)
       * @param {string} formSelector
       *         A selector to use to get the for retrieving the form
       * @param {string} redirectUrl
       *         A URL to use for redirecting the user on success
       *         (if necessary)
       */
      value: function(postUrl, fieldNames, checkForm = null,
          formSelector = 'form', redirectUrl = null) {
        const objNmSpc = this;
        document.querySelector(formSelector +
                               ' button[type="submit"]')
            .addEventListener('click', function(event) {
              event.preventDefault();
              objNmSpc.cleanupErrors(fieldNames);
              if (typeof(checkForm) !== 'function' ||
                checkForm(formSelector) === true) {
                // get form XML data
                const xmlData = objNmSpc.serializeForm(formSelector);
                const req = new XMLHttpRequest(); // create a request
                req.open('POST', postUrl); // set the destination
                req.responseType = 'document'; // accept text responses
                req.setRequestHeader('Content-Type', 'text/xml');
                req.send(xmlData); // send the data
                req.onreadystatechange = function() {
                  if (this.readyState === 4) {
                    // when the response is ready, check the status
                    if (this.status >= 200 && this.status <= 299 &&
                        redirectUrl) {
                      // if status good and a redirectUrl is given,
                      // initiate redirect
                      window.location.replace(redirectUrl);
                    } else {
                      // bad response, so check for form errors
                      // get all fields
                      const xmlFields = req.responseXML.getElementsByTagName(
                          'field'
                      );
                      objNmSpc.placeFormErrors(fieldNames, xmlFields);
                    }
                  }
                };
              }
            });
      },
      enumerable: true,
    },
  });
  return namespace;
})();
