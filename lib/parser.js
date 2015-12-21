// 转化器


var fs = require("fs");
var path = require('path');
var dict = require("./checker.js").dict; // 校验树木
var allProp = dict.allProp
var transformInAllProp = allProp.transform
var _transformInAllProp = transformInAllProp.props
var undefine
var _option = {}

function mix(a, b) {
    for(var i in b) {
        var source = b[i]
        if (typeof a[i] === "object") {
            mix(a[i], b[i])
        } else {
            a[i] = b[i]
        }
    }
    return a
}


// 转化文件
var fileParser = exports.fileParser = function (file, parContext, globalVars, option) {
    _option = option || _option
    var p = path.resolve(process.cwd(), file);
    var content = fs.readFileSync(p, {encoding: "utf8"});

    var tree = stringParser(content, {file: p}, {file: p, _file: file}, globalVars);

    if (parContext) {
        parContext.subContext[p] = tree
    }

    return tree
}


function reportError(msg) {
    if (msg.indexOf("【") !== 0) msg = "【Error】：" + msg
    var type = msg.substr(1, msg.indexOf("】") - 1).toLowerCase()
    if (_option.log !== "all" && _option.log && _option.log.toLowerCase().indexOf(type) === -1) return 
    console.log(msg)
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

function forMixin(item, mixinPos, context, globalVars) {
    var mixin = item.substr(mixinPos + 1)
    mixin = mixin.split(" ")
    reportError("【Log】：调用mixin " + item + "，文件：" + context.file)
    if (mixinPos === 0) {
        var mixinName = mixin[0]
        var mixinArgs = mixin.slice(1)
        mixinArgs.forEach(function (arg, index) {
            arg = arg.trim()
            // 变量 词法
            if (arg.indexOf("$") === 0) {
                arg = arg.substr(1).split(".")
                mixinArgs[index] = getValue(arg, context, globalVars)
            } else {
                // 转为数字
                if (arg.match(/^[0-9\.]+$/g)) arg = Number(arg)
                mixinArgs[index] = arg
            }
        })
        // 执行mixin
        var mixinFunc = getValue(mixinName.split("."), context, globalVars)
        if (typeof mixinFunc !== "function") {
            reportError("调用了未定义的mixin：" + mixinName +  "，文件：" + context.file + "，行：" + item + (context.mixin ? "，in mixin " + context.mixin : ""))
        } else {
            var mixinProp = mixinFunc.apply(null, mixinArgs)
            // 必须是对象
            if (typeof mixinProp !== "object" || mixinProp.join) {
                mixinProp = {}
                reportError("【warning】mixin：" + mixinName + "返回值类型错误")
            }
            return mixinProp
        }
    } else {
        reportError("在错误的位置调用了mixin：" + mixin[0] +  "，文件：" + context.file + "，行：" + item + (context.mixin ? "，in mixin " + context.mixin : ""))
    }
    return {}
}

// 转化字符串，可以包含换行符，即一个文件的内容

var stringParser = exports.stringParser = function (content, context, parContext, globalVars, inClass) {
    var stack = [];

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
    var lines = content.join ? content : content.replace(new RegExp("(/\\\*([^*]|[\\\r\\\n]|(\\\*+([^*/]|[\\\r\\\n])))*\\\*+/)|(//.*)", "gm"), "").replace(/[\S]+[\s]*[\{\}]/g, function(mat) { return mat.replace(/[\{\}]/g, function(m) { return "\n" + m}) }).split(/[\r\n]+/g);
    var currentDir = "./";
    var inFile = parContext._file;
    if (inFile) {
        var pos = inFile.lastIndexOf("/")
        currentDir = pos > -1 ? inFile.substr(0, pos) : "."
    }

    // 存储当前的class
    var tempClass, lastLine = "没有指定className，就出现了{", inMixin, defineMixinName, mixinStack = [], defineArgs, _defineArgs
    if (inClass) {
        context.context["@main"] = tempClass = {}
    }
    // 逐行解析
    lines.forEach(function(line, lineNumber) {
        var trimLine = line.trim();
        // 定义mixin
        // 将mixin代码提取出来，当做一个单独的文件那样处理
        var defineMixinPos = trimLine.indexOf("@define-mixin")
        if (defineMixinPos > -1 || inMixin) {
            inClass = false
            // 处理头
            if (!inMixin) {
                inMixin = []
                var mainParts = trimLine.split("@define-mixin")[1].trim()
                defineMixinName = mainParts.match(/^[^\s]+/g)
                if (!defineMixinName) {
                    reportError("居然都不给mixin指定一个名字 " + "，文件：" + context.file + "，行：" + trimLine)
                } else {
                    defineMixinName = defineMixinName[0]
                    defineArgs = mainParts.replace(/^[^\s]+/g, "").trim()
                    if (defineArgs) {
                        defineArgs = defineArgs.split(",")
                        _defineArgs = []
                        defineArgs.forEach(function(arg, i) {
                            arg = arg.trim()
                            if (arg) {
                                arg = arg.split(":") // 指定了默认值
                                arg.forEach(function(a, index) {
                                    var _a = a.trim()
                                    if (index === 1) {
                                        if (_a.match(/^[0-9\.]+$/g)) {
                                            _a = Number(_a)
                                        } else if(_a.indexOf("$") === 0) { // 默认值是个变量，立即取值，不是运行时候取值
                                            _a = getValue(_a.substr(1).split("."), context, globalVars)
                                            if (_a === undefine) {
                                                reportError("【warning】mixin " + defineMixinName + "的参数" + arg[0] + "指定的默认值为" + undefine  + "，文件：" + context.file + "，行：" + trimLine)
                                            }
                                        }
                                    } else if (!index && !_a) {
                                        reportError("mixin " + defineMixinName + "第" + (i + 1) + "个参数名为空，文件：" + context.file + "，行：" + trimLine)
                                    }
                                    arg[index] = _a
                                })
                                _defineArgs[i] = [arg[0], arg[1]] 
                                defineArgs[i] = arg[0] + "=" + arg[1]
                            } else {
                                reportError("mixin " + defineMixinName + "第" + (i + 1) + "个参数名为空，文件：" + context.file + "，行：" + trimLine)
                            }
                        })
                    }
                }
                if (trimLine.lastIndexOf("{") === 0) {
                    mixinStack.push("{")
                    inMixin.push("{")
                }
            } else {
                var changeStack = trimLine.match(/[\{]/g)
                if (changeStack) {
                    mixinStack.push.apply(mixinStack, changeStack)
                } else {
                    changeStack = trimLine.match(/[\}]/g)
                    if (changeStack) mixinStack.splice(-1, changeStack.length)
                }
                if (!trimLine) return
                inMixin.push(trimLine)
                if (!mixinStack.length) {
                    /*
                        只能处理
                        {
                            font-size: 12
                        }
                        or
                        {
                            .nihao {
                                font-size: 12
                            }
                            .nihao2 {
                                color:red;
                            }
                        }
                        中间不能出现 prop和class混合的情形
                    */
                    var tmp = inMixin.slice(1, inMixin.length - 1)

                    // 参数不要声明变量了
                    // if (defineArgs) tmp = defineArgs.concat(tmp)
                    var newArr = [], toKeep = 0, innerStack = [], innerClass // 过滤混合
                    tmp.forEach(function (newLine, i) {
                        newLine = newLine.trim()
                        var firstChar = newLine.charAt(0)
                        // 过滤掉嵌套和混合
                        // toKeep = 2 才保留
                        if (innerClass) {
                            if (toKeep === 2) {
                                newArr.push(newLine)
                            } else {
                                reportError("【warning】过滤掉mixin " + defineMixinName + "内：" + newLine +  "，文件：" + context.file + "，行：" + newLine)
                            }
                            if (newLine === "{") {
                                innerStack.push("{")
                            } else if (newLine === "}") {
                                innerStack.pop()
                                if (innerStack.length === 0 && toKeep === 2) innerClass = false
                            }
                        } else if (firstChar === "$") {
                            newArr.push(newLine)
                        } else if (firstChar === "." || firstChar === "#") {
                            if (!toKeep) toKeep = 2
                            innerClass = true
                            if (toKeep === 2) {
                                newArr.push(newLine)
                                if (newLine.indexOf("{") > -1) innerStack.push("{")
                            } else {
                                reportError("【warning】过滤掉mixin " + defineMixinName + "内：" + newLine +  "，文件：" + context.file + "，行：" + newLine)
                            }
                        } else {
                            // 只保留属性
                            if (!toKeep) toKeep = 1
                            if(toKeep === 1) {
                                newArr.push(newLine)
                            } else {
                                reportError("【warning】过滤掉mixin " + defineMixinName + "内：" + newLine +  "，文件：" + context.file + "，行：" + newLine)
                            }
                        }
                    })
                    // mix调用时候转化
                    // 挂载到全局
                    // context.vars[defineMixinName] = function () {
                    globalVars[defineMixinName] = function () {
                        var _arg = arguments, vars = {}
                        _defineArgs.forEach(function (arg, i) {
                            // 默认值
                            if (_arg[i] === undefine) _arg[i] = arg[1] || undefine
                            vars[arg[0].replace(/^\$/g, "")] = _arg[i]
                        })
                        var mixinContext = stringParser(newArr, {vars: vars, file: context.file, mixin: defineMixinName}, context, globalVars, toKeep === 1)
                        return mixinContext && mixinContext.context || {}
                    }
                    inMixin = null
                    defineArgs = null
                }
            }
        } else if (trimLine.indexOf("@import") === 0) {
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
                        // if (num = v[1].match(/^[0-9]+/g)) v[1] = num[0] * 1
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
                        // 处理 call mixin
                        var mixinPos = item.indexOf("@")
                        if (mixinPos > -1) {
                            // 将mixin的结果merge到当前class内
                            mix(tempClass, forMixin(item, mixinPos, context, globalVars)["@main"] || {})
                        } else {
                            var divPos = item.indexOf(":")
                            var mt = [item]
                            if (divPos > -1) {
                                mt[0] = item.substring(0, divPos).trim()
                                mt[1] = item.substring(divPos + 1).trim()
                            }
                            if (mt && mt[0] && mt[1]) {
                                // 校验样式名字，是否得到支持
                                var rule = mt[0].replace(/\-[\S]/g, function(mt) {if (mt == "float") {return "cssFloat"};return mt.substr(1).toUpperCase()})
                                if (rule === "background") {
                                    rule = "backgroundColor"
                                    reportError("【Log】：自动替换background" + " 为 backgroundColor" +  "，文件：" + context.file + "，className：" + inClass + "，行：" + item + (context.mixin ? "，in mixin " + context.mixin : ""))
                                }
                                // 检测属性
                                if (!(rule in allProp)) {
                                    reportError("不支持的属性：" + rule + "【" + mt[0] + "】" +  "，文件：" + context.file + "，className：" + inClass + "，行：" + item + (context.mixin ? "，in mixin " + context.mixin : ""))
                                }
                                // 转化值
                                v = mt[1].replace(/\$[a-z0-9_\.]+/gi, function(v) {
                                    var variable = v.substr(1).split(".")
                                    var res = getValue(variable, context, globalVars)
                                    if (res === undefine) {
                                        reportError("未能查找到变量：" + v +  "，文件：" + context.file + "，className：" + inClass + "，行：" + item + (context.mixin ? "，in mixin " + context.mixin : ""))
                                    } else {
                                        // 处理字符串
                                        if (res.match && res.match(/[^0-9]+/g)) res = "\"" + res.replace(/\"/g, "\\\"") + "\""
                                        return res
                                    }
                                })
                                // transform 需要特殊处理一下
                                if (rule === "transform") {
                                    var transforms = v.match(/[^\(\s]+\([^\)]*\)/g)
                                    if (transforms) {
                                        var newObj = []
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
                                            var obj = {};
                                            if (!(transformPro in _transformInAllProp)) {
                                                reportError("不支持的属性：" + rule + "【" + mt[0] + " " + transform + "】" +  "，文件：" + context.file + "，className：" + inClass + "，行：" + item + (context.mixin ? "，in mixin " + context.mixin : ""))
                                            } else if (_transformInAllProp[transformPro](value, function (_) { return value = Number(_.replace && _.replace(/[^0-9\.]+/g, "") || _)}) === false) {
                                                reportError("赋给属性" +  rule + "【" + mt[0] + "】的值不对：" + v + "【" + mt[1] + "】" +  "，文件：" + context.file + "，className：" + inClass + "，行：" + item + (context.mixin ? "，in mixin " + context.mixin : ""))
                                            } else {
                                                obj[transformPro] = value
                                                newObj.push(obj)
                                            }
                                        })
                                        // 一定要放在校验的后面，校验会修改值的类型
                                        tempClass["transform"] = newObj
                                    }
                                } else {
                                    try {
                                        v = (new Function("return " + v + ";"))()
                                    } catch (e) {
                                        
                                    }
                                    // 值不对
                                    if ((rule in allProp) && allProp[rule](v, function (_) { return v = Number(_.replace && _.replace(/[^0-9\.]+/g, "") || _)}) === false) {
                                        reportError("赋给属性" +  rule + "【" + mt[0] + "】的值不对：" + v + "【" + mt[1] + "】" +  "，文件：" + context.file + "，className：" + inClass + "，行：" + item + (context.mixin ? "，in mixin " + context.mixin : ""))
                                    }
                                    // 一定要放在校验的后面，校验会修改值的类型
                                    tempClass[rule] = v;
                                }
                            } else {
                                reportError("未能解析的样式：" + item + "，文件：" + context.file + "，className：" + inClass + "，行：" + item + (context.mixin ? "，in mixin " + context.mixin : ""))
                            }
                        }
                        
                    })
                } else { // 解析class
                    if (trimLine.indexOf("@") === 0) {
                        var classes = forMixin(trimLine, 0, context, globalVars)
                        for (var cls in classes) {
                            context.context[cls] = classes[cls]
                        }
                    } else {
                        trimLine = trimLine.split(",")
                        tempClass = tempClass || {}
                        trimLine.map(function(item) {
                            item = item.trim()
                            if (!item) return
                            if (item.indexOf(" ") !== -1) {
                                reportError("不支持层叠：" + item + "，文件：" + context.file + "，className：" + inClass + "，行：" + item + (context.mixin ? "，in mixin " + context.mixin : ""))
                            } else {
                                context.context[item] = tempClass
                            }
                        })
                    }
                }
            }    
        }
        lastLine = line
    })
    return context;
}