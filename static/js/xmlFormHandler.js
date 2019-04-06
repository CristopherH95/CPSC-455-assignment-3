'use strict';

/**
 * @namespace xmlFormHandler
 * A collection of functions for handling form data with XML
 */
var xmlFormHandler = (function() {
    let namespace = {};
    Object.defineProperties(namespace, {
        /**
         * serializes a given form into an XML document string
         * 
         * @function serializeForm
         * @memberof xmlFormHandler
         * @param {string} formSelector A selector to use to retrieve a form's inputs
         */
        serializeForm: {
            value: function(formSelector = 'form') {
                let fields = document.querySelectorAll(formSelector + ' input');    // get all input fields
                let xml = "<?xml version='1.0'?><form>";
                for (let i of fields) {
                    xml += '<' + String(i.name) + '>';  // each attribute of <form> is a tag with the name of the field
                    xml += String(i.value);             // the value of each attribute is the form value
                    xml += '</' + String(i.name) + '>';
                }
                xml += '</form>';

                return xml
            },
            enumerable: true
        },
        /**
         * Returns an element using a selector, creating it if necessary
         * 
         * @function getOrCreateElement
         * @memberof xmlFormHandler
         * @param {string} selector A selector to use to try to retrieve an element
         * @param {object} elAttrs An object containing the attributs 'tag', 'classes', and 'id' to use in creating the element
         * @param {string} adjSelector A selector to use to get an element to use as a reference for inserting the new element
         */
        getOrCreateElement: {
            value: function(selector, elAttrs, adjSelector) {
                let el = document.querySelector(selector);  // get the element
                if (!el) {  // if could not find element, create it
                    el = document.createElement(elAttrs.tag);
                    if (elAttrs.classes) {  // add classes
                        for (let cls of elAttrs.classes) {
                            el.classList.add(cls);
                        }
                    }
                    el.id = elAttrs.id; // set ID
                    let refNode = document.querySelector(adjSelector);  // get the reference element
                    refNode.insertAdjacentElement('afterend', el);  // insert after the reference
                }
            
                return el;
            },
            enumerable: true
        },
        bindFormSubmit: {
            /**
             * @function bindFormSubmit
             * @memberof xmlFormHandler
             * @param {string} postUrl A URL to use for POSTing data
             * @param {string} redirectUrl A URL to use for redirecting the user on success (if necessary)
             * @param {Array} fieldNames A list of field names to use for form errors
             * @param {string} formSelector A selector to use to get the for retrieving the form 
             */
            value: function(postUrl, fieldNames, formSelector = 'form', redirectUrl = null) {
                let objNmSpc = this;
                document.querySelector(formSelector + ' button[type="submit"]').addEventListener('click', function(event) {
                    event.preventDefault();
                    let xmlData = objNmSpc.serializeForm(formSelector); // get form XML data
                    let req = new XMLHttpRequest(); // create a request
                    req.open('POST', postUrl);  // set the destination
                    req.responseType = 'document';  // accept text responses
                    req.setRequestHeader('Content-Type', 'text/xml');
                    req.send(xmlData);  // send the data
                    req.onreadystatechange = function() {
                        if (this.readyState === 4) {    // when the response is ready, check the status
                            if (this.status === 200 && redirectUrl) {
                                // if status good and a redirectUrl is given, initiate redirect
                                window.location.replace(redirectUrl)
                            } else {
                                // bad response, so check for form errors
                                let xmlFields = req.responseXML.getElementsByTagName('field');  // get all fields
                                for (let field of fieldNames) {
                                    for (let i of xmlFields) {
                                        let nameNode = i.querySelector('name');
                                        if (nameNode && nameNode.textContent === field) { 
                                            // if the error field is the same as a form field, add the error text
                                            let errorEl = objNmSpc.getOrCreateElement('#' + field + '-error', 
                                                                                     {tag: 'p', classes: ['text-danger', ], id: '#' + field + '-error'}, 
                                                                                     'input[name="' + field + '"]');
                                            let errorNode = i.querySelector('error');
                                            if (errorNode) {
                                                errorEl.innerText = errorNode.textContent;
                                            }
                                            break;
                                        }
                                    }
                                }
                            }
                        }
                    }
                });
            },
            enumerable: true
        }
    });
    return namespace;
})();
