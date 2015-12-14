// 转化器


var fs = require("fs");
var path = require('path');
var dict = require("./checker.js").dict; // 校验树木
var allProp = dict.allProp
var transformInAllProp = allProp.transform
var _transformInAllProp = transformInAllProp.props
var undefine

function mix(a, b) {
    for(var i in b) {
        a[i] = JSON.parse(JSON.stringify(b[i]))
    }
    return a
}


// 转化文件
var fileParser = exports.fileParser = function (file, parContext, globalVars) {
    var p = path.resolve(process.cwd(), file);
    var content = fs.readFileSync(p, {encoding: "utf8"});

    var tree = stringParser(content, {file: p}, {file: p, _file: file}, globalVars);

    if (parContext) {
        parContext.subContext[p] = tree
    }

    return tree
}


function reportError(msg) {
    console.log("【Error】：" + msg)
}

function getValue(varChain, context, globalVars) {
    var value, i = 0, variable, vars, _context = context, varName = varChain[0]
    if (varChain.length > 0) {
        while (_context) {
            vars = _context.vars
            if (vars) {
                if (varName in vars) {
                    vars = vars[varName]
                    _context = null
                    break
                } else {
                    _context = _context.parContext
                }
            } else {
                break
            }
            vars = value
        }
        if (vars === value) vars = globalVars[varName]
        if (vars !== value) {
            if (varChain.length > 1) {
                i = 1
                while (varChain[i]) {
                    varName = varChain[i];
                    if (varName in vars) {
                        vars = vars[varName]
                    } else {
                        break
                    }
                }
            }
            if (value !== vars) value = vars
        }
    }
    return value
}

// 转化字符串，可以包含换行符，即一个文件的内容

var stringParser = exports.stringParser = function (content, context, parContext, globalVars) {
    var stack = [];

    // 移除注释
    content = content.replace(new RegExp("(/\\\*([^*]|[\\\r\\\n]|(\\\*+([^*/]|[\\\r\\\n])))*\\\*+/)|(//.*)", "gm"), "")

    parContext = parContext || {};

    context = context || {};

    // 域
    mix(context, {
        vars: {},       // 变量
        context: {},    // 域
        subContext: {}, // 引用域
        parContext: parContext.vars ? parContext : null, // 父级
    })

    if (!globalVars) globalVars = context.vars

    // 切换，并将[\{\}]换行
    var lines = content.replace(/[\S]+[\s]*[\{\}]/g, function(mat) { return mat.replace(/[\{\}]/g, function(m) { return "\n" + m}) }).split(/[\r\n]+/g);
    var currentDir = "./";
    var inFile = parContext._file;
    if (inFile) {
        currentDir = inFile.substr(0, inFile.lastIndexOf("/"))
    }

    // 存储当前的class
    var tempClass, lastLine = "没有指定className，就出现了{", inClass
    // 逐行解析
    lines.forEach(function(line, lineNumber) {
        var trimLine = line.trim();
        if (trimLine.indexOf("@import") === 0) {
            var subFile = trimLine.match(/url\([^\)]+\)/g)
            subFile = subFile && subFile[0]
            if (subFile) {
                subFile = subFile.replace(/url|[\(\)\'\"]/g, "")
                fileParser(currentDir + "/" + subFile, context, globalVars)
            }
        // 逐行解析
        } else {
            // 变量
            if (trimLine.indexOf("$") === 0) {
                var vars = trimLine.match(/(\$[^,\$]+)/g)
                if (vars) {
                    vars.map(function(v) {
                        v = v.replace(/^\$/g, "").split("=")
                        var vContext = v[0].split(".")
                        v[1] = v[1] ? v[1].trim() : ""
                        // 移除数字后面的单位
                        var num
                        if (num = v[1].match(/^[0-9]+/g)) v[1] = num[0] * 1
                        if (vContext[1]) {
                            globalVars[vContext[1].trim()] = v[1]
                        } else {
                            context.vars[v[0].trim()] = v[1]
                        }
                    })
                }
            } else if (trimLine === "{") {
                if (inClass) {
                    reportError("不应该出现的{：" + lastLine)
                } else {
                    inClass = lastLine
                }
            } else if (trimLine === "}") {
                inClass = ""
                tempClass = null
            } else {
                if (inClass) { // 解析样式
                    // 过滤掉 -prefix-
                    if (trimLine.indexOf("-") === 0) return
                    trimLine = trimLine.split(";")
                    trimLine.map(function(item) {
                        if (!item.trim()) return
                        var divPos = item.indexOf(":")
                        var mt = [item]
                        if (divPos > -1) {
                            mt[0] = item.substring(0, divPos)
                            mt[1] = item.substring(divPos + 1)
                        }
                        if (mt && mt[0] && mt[1]) {
                            // 校验样式名字，是否得到支持
                            var rule = mt[0].replace(/\-[\S]/g, function(mt) {if (mt == "float") {return "cssFloat"};return mt.substr(1).toUpperCase()})
                            // 检测属性
                            if (!(rule in allProp)) {
                                reportError("不支持的属性：" + rule + "【" + mt[0] + "】" +  "，文件：" + context.file + " " + inClass)
                            }
                            // do something

                            // 转化值
                            mt[1] = mt[1].replace(/\$[a-z0-9_\.]+/gi, function(v) {
                                var variable = v.substr(1).split(".")
                                var res = getValue(variable, context, globalVars)
                                if (res === undefine) {
                                    reportError("未能查找到变量：" + v +  "，文件：" + context.file + " " + inClass)
                                } else {
                                    // 处理字符串
                                    if (res.match && res.match(/[^0-9]+/g)) res = "\"" + res.replace(/\"/g, "\\\"") + "\""
                                    return res
                                }
                            })
                            var v = mt[1]
                            // transform 需要特殊处理一下
                            if (rule === "transform") {
                                var transforms = v.match(/[^\(\s]+\([^\)]*\)/g)
                                if (transforms) {
                                    var newObj = {}
                                    transforms.forEach(function(transform) {
                                        var f = transform.indexOf("("),
                                            e = transform.lastIndexOf(")")
                                        var transformPro = transform.substring(0, f),
                                            value = transform.substring(f + 1, e)
                                        value = value.split(",")
                                        value.forEach(function (exp, i) {
                                            try {
                                                value[i] = (new Function("return " + exp + ";"))()
                                            } catch (e) {

                                            }
                                        })
                                        value = value.join(",")
                                        newObj[transformPro] = value
                                        console.log(_transformInAllProp)
                                        if (!(transformPro in _transformInAllProp)) {
                                            reportError("不支持的属性：" + rule + "【" + mt[0] + "】" +  "，文件：" + context.file + " " + inClass)
                                        } else if (_transformInAllProp[transformPro](value) === false) {
                                            reportError("赋给属性" +  rule + "【" + mt[0] + "】的值不对：" + v + "【" + mt[1] + "】" +  "，文件：" + context.file + " " + inClass)
                                        }
                                    })
                                }
                            } else {
                                try {
                                    v = (new Function("return " + mt[1] + ";"))()
                                } catch (e) {
                                    
                                }
                                tempClass[rule] = v;
                                // 值不对
                                if ((rule in allProp) && allProp[rule](v) === false) reportError("赋给属性" +  rule + "【" + mt[0] + "】的值不对：" + v + "【" + mt[1] + "】" +  "，文件：" + context.file + " " + inClass)
                            }
                        } else {
                            reportError("未能解析的样式：" + item + "，文件：" + context.file + " " + inClass)
                        }
                    })
                } else { // 解析class
                    trimLine = trimLine.split(",")
                    tempClass = {}
                    trimLine.map(function(item) {
                        item = item.trim()
                        if (!item) return
                        if (item.indexOf(" ") !== -1) {
                            reportError("不支持层叠：" + item + "，文件：" + context.file + " " + inClass)
                        } else {
                            context.context[item] = tempClass
                        }
                    })
                }
            }    
        }
        lastLine = line
    })

    return context;
}