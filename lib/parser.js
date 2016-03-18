// 转化器


var fs = require("fs");
var path = require('path');
var dict = require("./checker.js").dict; // 校验树木
var allProp = dict.allProp
var transformInAllProp = allProp.transform
var _transformInAllProp = transformInAllProp.props
var undefine
var _option = {}

var sass = require('node-sass');

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
    var p = path.resolve(module.parent.filename, file);
    // 绝对路径
    if (!file.match(/^[\/\\]/g)) {
        if (module.parent) p = path.dirname(module.parent.filename) + "/" + file
    }
    var content = "", isSass;

    // 处理sass
    if (file.match(/\.scss/g)) {
        isSass = p + ".build.css"
    }
    
    content = fs.readFileSync(p, {encoding: "utf8"});
    

    var tree = stringParser(content, {file: p}, {file: p, _file: file}, globalVars, null, isSass);

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

var stringParser = exports.stringParser = function (content, context, parContext, globalVars, inClass, isSass) {
    if (isSass) content = sass.renderSync({data: content, includePaths:  [context && context.file ? path.dirname(context.file) : "./"]}).css.toString().replace(/@charset[^;\n]+[;\n]/g, "");
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
                                        if (_a.match(/^[0-9\.\-]+$/g)) {
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
                        var newContent = ""
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
                            // 转化值
                            var v = ""
                            if (mt && mt[0] && mt[1]) {
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
                                // 校验样式名字，是否得到支持
                                var rule = mt[0].replace(/\-[\S]/g, function(mt) {if (mt == "float") {return "cssFloat"};return mt.substr(1).toUpperCase()})
                                if (rule === "background") {
                                    rule = "backgroundColor"
                                    reportError("【Log】：自动替换background" + " 为 backgroundColor" +  "，文件：" + context.file + "，className：" + inClass + "，行：" + item + (context.mixin ? "，in mixin " + context.mixin : ""))
                                } else if (rule in {"borderRadius": 1, "borderWidth": 1, "borderStyle": 1, "borderColor": 1, "padding": 1, "margin": 1}) {
                                    var pts = v.split(/[ ]+/g)
                                    if (pts.length > 1) {
                                        pts[2] = pts.length > 2 ? pts[2] : pts[0]
                                        pts[3] = pts.length > 3 ? pts[3] : pts[1]
                                        var newContent = "";
                                        if (rule === "borderRadius") {
                                            var _pos = ["left", "right"],
                                                pos = ["top", "bottom"]
                                            pos.forEach(function (p, index) {
                                                _pos.forEach(function (_p, _index) {
                                                    var ptsIndex = 0
                                                    if (index == 0) {
                                                        // top-left     => 0
                                                        // top-right    => 1
                                                        ptsIndex = _index == 0 ? 0 : 1
                                                    } else {
                                                        // bottom-right => 2
                                                        // bottom-left  => 3
                                                        ptsIndex = _index == 0 ? 3 : 2
                                                    }
                                                    newContent += ["border", p, _p, "radius"].join("-") + ":" + pts[ptsIndex] + ";\n"
                                                })
                                            })
                                        } else if (rule in {"margin": 1, "padding": 1}) {
                                            // 上下
                                            if (pts[2] === pts[0]) {
                                                newContent += rule + "-vertical" + ":" + pts[0] + ";"
                                            } else {
                                                newContent += rule + "-top" + ":" + pts[0] + ";"
                                                newContent += rule + "-bottom" + ":" + pts[2] + ";"
                                            }
                                            // 左右
                                            if (pts[3] === pts[1]) {
                                                newContent += rule + "-horizontal" + ":" + pts[1] + ";"
                                            } else {
                                                newContent += rule + "-right" + ":" + pts[1] + ";"
                                                newContent += rule + "-left" + ":" + pts[3] + ";"
                                            }
                                        } else {
                                            var pos = ["top", "right", "bottom", "left"]
                                            pos.forEach(function (p, index) {
                                                delete tempClass[rule]
                                                newContent += mt[0].replace("-", function () {
                                                    return "-" + p + "-"
                                                }) + ":" + pts[index] + ";"
                                            })
                                        }
                                    }
                                    
                                } else if (rule == "textDecoration") {
                                    rule = "textDecorationLine"
                                    v = v.trim().replace(/[ ]{2,}/g, " ")
                                } else if (rule == "boxShadow") {
                                    var shadowOpacity = ""
                                    pts = v.replace(/(outset|inset)$/g, "").replace(/rgba\([^\)]+\)/g, function(mat) {
                                        var rgb = "#", pos = 0
                                        mat.replace(/[0-9\.]+/g, function (num) {
                                            num = Number(num)
                                            if (pos > 2) {
                                                shadowOpacity = num // 透明度
                                            } else {
                                                rgb += ("0" + num.toString(16)).substr(-2).toLowerCase()
                                            }
                                            pos++
                                        })
                                        return rgb
                                    })


                                    pts = pts.split(",")[0].trim().split(/[ ]+/g)

                                    // 0 1 2    3      4     5
                                    // x y blur spread color inset
                                    // 不支持inset

                                    // 没什么卵用
                                    pts[3] = pts[3] || pts[2] || 3

                                    // 颜色
                                    if (!pts[4]) {
                                        // 做个交换
                                        if (!String(pts[3]).match(/^[0-9]/g)) {
                                            pts[4] = pts[3]
                                            pts[3] = pts[2]
                                        } else {
                                            return reportError("没有指定颜色：" + rule + "【" + mt[0] + "】" +  "，文件：" + context.file + "，className：" + inClass + "，行：" + item + (context.mixin ? "，in mixin " + context.mixin : ""))
                                        }
                                    }
                                    newContent = "shadowColor:" + pts[4] + ";" +
                                        "shadowOffset:" + pts[0] + " " + pts[1] + ";" +
                                        "shadowRadius:" + pts[3] + ";" 
                                    if (shadowOpacity) newContent += "shadowOpacity:" + shadowOpacity
                                    rule = false
                                } else if (rule == "shadowOffset") {
                                    var _v = v.split(/[ ]+/g)
                                    v = {
                                        width: parseFloat(_v[0]),
                                        height:parseFloat( _v[1] || _v[0]),
                                    }
                                }
                                // 检测属性
                                if (rule && !(rule in allProp)) {
                                    // 处理border*
                                    // 生成一个新的string，然后调用string parser
                                    if (rule.match(/^border/g)) {
                                        var _rule = mt[0].match(/border(\-[^\-]+)?/g)
                                        if (_rule) {
                                            v = v.split(/[ ]+/g);
                                            ["width", "style", "color"].forEach(function (pro, index) {
                                                newContent += (pro == "style" ? _rule[0].split("-")[0] : _rule[0]) + "-" + pro + ":" + (v[index] || " ") + ";\n"
                                            })
                                        }
                                    } else {
                                        reportError("不支持的属性：" + rule + "【" + mt[0] + "】" +  "，文件：" + context.file + "，className：" + inClass + "，行：" + item + (context.mixin ? "，in mixin " + context.mixin : ""))
                                    }
                                }
                                if (newContent) {
                                    reportError("【log】转换处理：" + trimLine)
                                    var bdObj = stringParser (newContent, {}, context, globalVars, "inClass")
                                    mix(tempClass, bdObj["context"]["@main"])
                                    newContent = ""
                                    return
                                }
                                // transform 需要特殊处理一下
                                if (rule === "transform") {
                                    var transforms = v.match(/[^\(\s]+\([^\)]*\)/g)
                                    if (transforms) {
                                        var newObj = []
                                        // 这里需要特殊处理的几个东西
                                        // skew(x-angle[, y-angle]) => skewX(x-angle), skewY(y-angle)，拆
                                        // translate(x[, y])        => translateX(x), translateY(y)，拆

                                        // scale(x[, y])            => scaleX(x), scaleY(y)，不同需要拆
                                        // scale(x[, x])            => scale(x) // 该设置是同时放大，同，只需要一个

                                        // rotate(z-angle), rotateZ(z-angle) 不需要转换
                                        transforms.forEach(function(transform) {
                                            var f = transform.indexOf("("),
                                                e = transform.lastIndexOf(")")
                                            var transformPro = transform.substring(0, f),
                                                value = transform.substring(f + 1, e)
                                            value = value.trim().split(/,[ ]?/)
                                            if (transformPro in {"skew": 1, "translate": 1}) {
                                                value[1] = value.length > 1 ? value[1] : value[0]
                                                transformPro = [transformPro + "X", transformPro + "Y"]
                                            } else if (transformPro == "scale") {
                                                // 只有一个值，或者两个值相等，否则拆分
                                                if (!(value.length < 2 || value[1] === value[0])) {
                                                    transformPro = [transformPro + "X", transformPro + "Y"]
                                                }
                                            }
                                            // 转化为数组
                                            if (!transformPro.join) transformPro = [transformPro]
                                            value.forEach(function (exp, i) {
                                                try {
                                                    value[i] = (new Function("return " + exp + ";"))()
                                                } catch (e) {

                                                }
                                            })
                                            transformPro.forEach(function (_transformPro, index) {
                                                var _value = value[index]
                                                var obj = {};
                                                if (!(_transformPro in _transformInAllProp)) {
                                                    reportError("不支持的属性：" + rule + "【" + mt[0] + " " + transform + "】" +  "，文件：" + context.file + "，className：" + inClass + "，行：" + item + (context.mixin ? "，in mixin " + context.mixin : ""))
                                                } else if (_transformInAllProp[_transformPro](_value, function (_) { return _value = Number(_.replace && _.replace(/[^0-9\.\-]+/g, "") || _)}) === false) {
                                                    reportError("赋给属性" +  rule + "【" + mt[0] + "】的值不对：" + v + "【" + mt[1] + "】" +  "，文件：" + context.file + "，className：" + inClass + "，行：" + item + (context.mixin ? "，in mixin " + context.mixin : ""))
                                                } else {
                                                    obj[_transformPro] = _value
                                                    newObj.push(obj)
                                                }
                                            })
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
                                    if ((rule in allProp) && allProp[rule](v, function (_) { return v = Number(_.replace && _.replace(/[^0-9\.\-]+/g, "") || _)}) === false) {
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

// 封装一下的require使用的api
var parserString = exports.parserString = function (str, vars, isSass) {
    var o = stringParser(str, {}, null, vars, null, isSass)
    return o.context
}

// file, 符合require规范
var parserFile = exports.parserFile = function (file, vars) {
    var o = fileParser(file, null, vars)
    return o.context
}
