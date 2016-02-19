var assert     = require('assert');

var parser = require("../lib/parser.js")
var reactivable = require("../lib/reactivable.js")
var data = require("./data/data.js")


describe('parse.postcss', function () {
    var tree = parser.fileParser("test/for-postcss/css/index.css")
    var css = reactivable.reactivable(tree)
});

describe('parse.sass', function () {
    var tree = parser.fileParser("test/for-sass/css/index.scss")
    var css = reactivable.reactivable(tree)
});

