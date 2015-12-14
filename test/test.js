var assert     = require('assert');

var parser = require("../lib/parser.js")
var reactivable = require("../lib/reactivable.js")
var data = require("./data/data.js")


describe('mr', function () {
    // var tree = parser.fileParser("test/css/index.css")

    var tree = data.data
    // console.log(JSON.stringify(tree))
    var css = reactivable.reactivable(tree)
    console.log(css)
});

