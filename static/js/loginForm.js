'use strict';


function xmlSerializeForm() {
    var fields = document.querySelectorAll('form input');
    var xml = "<?xml version='1.0'?><form>";
    for (var i = 0; i < fields.length; i++) {
        xml += '<' + String(fields[i].name) + '>';
        xml += String(fields[i].value);
        xml += '</' + String(fields[i].name) + '>';
    }
    xml += '</form>';

    return xml
}

document.addEventListener('DOMContentLoaded', function() {
    document.querySelector('form submit').addEventListener('click', function(event) {
        event.preventDefault();
        // TODO: XHR request for POSTing the data see -> https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest
    });
});