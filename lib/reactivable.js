// 转化成react-native style


// 将parser序列化的树转化成react-native的样式
var reactivable = exports.reactivable = function (tree, bigTree) {
    var topNode = !bigTree
    var context = tree.context
    bigTree = bigTree || {}
    for (var className in context) {
        bigTree[className.replace(/^[\.#]/g, "")] = context[className]
    }
    var subContext = tree.subContext
    if (subContext) {
        for (var subClass in subContext) {
            reactivable(subContext[subClass], bigTree)
        }
    }
    if (topNode) {
        var str = "StyleSheet.create("
        str += JSON.stringify(bigTree)
        str += ")"
        return str
    }
    return bigTree
}