// 属性检测器
var fs = require("fs")
var dict = require("./dict.js").dict.toString()
dict = (dict.split(/[\-]{5,}/g)[1] || "").trim()
var ImageResizeMode = {
    cover: "等比拉伸",
    strech: "保持原有大小",
    contain: "图片拉伸  充满空间",
}
var undefine

var bigTree = {
    // 所有支持的属性
    allProp: {

    },
    // 特定标签支持的属性
}
var allProp = bigTree.allProp 

function enumable(v, arr) {
    var i = 0
    while (arr[i]) {
        if (arguments[i] === v) return true
        i++
    }
    return false
}

function mix(a, b) {
    for (var pro in b) {
        a[pro] = b[pro]
    }
}

// 转化规则
function ruleToFunc(v, pro) {
    var _v = v
    // 数字
    if (v === "number" || v === "string") {
        v = function(value) {
            return (typeof value === _v) && value === value
        }
    // 枚举
    } else if (_v.indexOf("enum") > -1) {
        v = function (value) {
            return enumable(value, _v.replace(/(enum\(|\))/g, "").split(","))
        }
    } else if (pro === "transform") {
        var props = (new Function("return " + v.replace(/string/g, "'string'").replace(/number/g, "'number'") + ";"))(),
            newPros = {}
        props.forEach(function(item) {
            for (var pro in item) {
                newPros[pro] = ruleToFunc(item[pro])
            }
        })
        v = function (value) {
            // 只能是对象
            if (typeof value !== "object" || !value || value.join) return false
            for (var pro in value) {
                // 不支持的属性或者属性值的类型不对
                if (!(pro in newPros)) return [false, "不支持的属性：" + pro]
                if (newPros[pro](value[pro]) === false) return [false, "赋给属性" + pro + "值错误：" + value[pro]]
            }
            return true
        }
        v.props = newPros
    } else {
        v = function (value) {
            return true
        }
    }
    return v
}

dict = dict.split(/[\r\n]+/g)

var indent, tar
dict.forEach(function (item, i) {
    var indentText = item.replace(/[\t]/g, "    ").match(/^[\s]+/g)
    indentText = indentText ? indentText[0] : ""
    var nowIndent = indentText.length
    if (nowIndent && indent === undefine) {
        indent = indentText.length
    }
    item = item.trim()
    if (nowIndent === 0) {
        tar = bigTree[item] = bigTree[item] || {}
    } else {
        if (!tar) return
        var pos = item.indexOf(" ")
        var pro = pos > -1 ? item.substr(0, pos) : item
        var v = item.substr(pos)
        if (pos > 0) {
            v = (v || "").trim()
            v = ruleToFunc(v, pro)
            allProp[pro] = tar[pro] = v
        // 引用了公用
        } else {
            tar[pro] = bigTree[item] = bigTree[item] || {}
        }
    }
})

// mix公用
var commonProp = ["Transforms", "Flexbox"];
var tagsName = ["Text", "View", "Image"]

commonProp.forEach(function (commonName) {
    var B = bigTree[commonName]
    tagsName.forEach(function (tagName) {
        var A = bigTree[tagName]
        if (commonName in A) {
            mix(A, B)
        }
    })
})

exports.dict = bigTree