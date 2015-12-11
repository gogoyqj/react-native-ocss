var assert     = require('assert');

var parser = require("../lib/parser.js")


describe('mr', function () {
    var tree = parser.fileParser("test/css/index.css")

    console.log(JSON.stringify(tree))
});

