#!/usr/bin/env node
var program = require("commander")
var parser = require("./lib/parser.js")
var reactivable = require("./lib/reactivable.js")
var js_beautify = require('js-beautify').js_beautify
var fs = require("fs")

var undefine
var prefix = "var StyleSheet = reactNative.StyleSheet;var styles = " // 普通文件
var suffix = ";"
var amdPrefix = "define([\"react-native\"], function(reactNative) {" + prefix // amd
var amdSuffix = "; return styles});"
var commonjsPrefix = "module.exports.styles = require('react-native')." // cmd
var commonjsSuffix = ";"
var path = require('path')

program
    .version("0.0.1")

function parse(input, output, option) {
    // 弄成绝对路径
    input = path.resolve(process.cwd(), input)
    if (output === undefine) {
        output = input.replace(/\.[\S]+$/g, "") + ".js"
    }
    var tree = parser.fileParser(input, null, null, option)
    var cssJS = reactivable.reactivable(tree)

    var format = option.format || option.commonjs && "commonjs" || option.amd && "amd" || option.browser && "browser"
    var f = commonjsPrefix
    var e = commonjsSuffix
    if (format == "amd") {
        f = amdPrefix
        e = amdSuffix
    } else if (format == "browser") {
        f = prefix
        e = suffix
    }
    cssJS = f + cssJS + e
    if (option.beauty) {
        var indent = "indent" in option ? option.indent : 4
        cssJS = js_beautify(cssJS, { indent_size: indent })
    }
    
    fs.writeFileSync(output, cssJS, {encoding: "utf8"})
}

program
    .usage("[options] <input> [output]")
    .option("-b, --beauty [beauty]", "格式化输出文件，默认美化")
    .option("-o, --output [output]", "输出")
    .option("-i, --indent [indent]", "格式时候指定缩进缩进")
    .option("-l, --log [log]", "指定输出log的种类，默认输出all，可选error，warning，log")
    .option("-f, --format <format>", "指定输出格式")
    .option("-C, --commonjs [commonjs]", "输出符合commonjs规范的文件")
    .option("-A, --amd [amd]", "输出符合commonjs规范的文件")
    .option("-B, --browser [browser]", "输出browser格式文件")
    .option("-w, --watch [watch]", "监听文件变化，实时替换")
    .description("转化css为react-native-css js，并检测使用的属性是否被支持")
    .action(function(input, output) {
        var option = arguments[arguments.length - 1]
        if (option.beauty === undefine) option.beauty = true // 默认美化
        if (option.beauty in {"0":"", "false": ""}) option.beauty = false
        var output = typeof output === "string" ? output : option.output
        if (output === undefine) {
            output = input.replace(/\.[\S]+$/g, "") + ".js"
        }
        parse(input, output, option)
        if(option.watch) {
            var dirPos = output.lastIndexOf("/")
            var toWatch = dirPos > 0 ? output.substr(0, dirPos) : "./"
            if (fs.existsSync(option.watch)) {
                toWatch = option.watch
            }
            console.log("正在监听: ", toWatch);
            console.log("ctrl + c to exit");
            fs.watch(toWatch, function (event, filename) {
                var isCss = filename.match(/\.[s]?css/g);

                if (filename === input || isCss) {
                    console.log("正在编译: " + filename);

                    parse(input, output, option);
                }
            });

        } else {
            console.log("转换" + input + "完成")
        }
    })


program.parse(process.argv)