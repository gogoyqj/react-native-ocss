### 使用说明

#### 干嘛

1.将css转换成对应的react-native-js

2.自动检测并提醒属性是否被react-native所支持

3.识别.scss文件，并调用node-sass将其转化为css，并最终转化为react-native-js文件

#### npm安装

```
npm install -g react-native-ocss
```

#### 人肉安装

为毛不能发布到qnpm了。。。

```
    git clone https://github.com/gogoyqj/react-native-ocss.git yourdir
    npm install
    cd /usr/bin
    sudo ln -s yourdir/index.js react-native-ocss
    sudo chmod +x react-native-ocss

    // or
    sh install.sh
```


#### 使用

##### cli
```
    rcss [options] input.css [output.js]

    .option("-b, --beauty [beauty]", "格式化输出文件")
    .option("-o, --output [output]", "输出")
    .option("-i, --indent [indent]", "格式时候指定缩进缩进")
    .option("-l, --log [log]", "指定输出log的种类，默认输出all，可选error，warning，log")
    .option("-f, --format <format>", "指定输出格式")
    .option("-C, --commonjs [commonjs]", "输出符合commonjs规范的文件")
    .option("-A, --amd [amd]", "输出符合commonjs规范的文件")
    .option("-B, --browser [browser]", "输出browser格式文件")
    .option("-w, --watch [watch]", "监听文件变化，实时替换")
```

##### require
```
    var rss = require("react-native-ocss")
    
    var stylesObject = rss.parserString(`
        .test {
            border: $testBorder solid $testBorderColor;
        }
        .xx {
            border-left: $testBorder solid $testBorderColor;
            font-color: blue;
        }
    `, {
        testBorder: 1,
        testBorderColor: "#fff",
    })

    var stylesObject = rss.parserFile("../css/index.css", {
        testBorder: 1,
        testBorderColor: "#fff",
    }) 

    var styles = require('react-native').StyleSheet.create(stylesObject)
```


#### 支持的语法

在转换的过程中，会抛出警告或者错误来提示使用不支持的语法、属性及其他有用信息


##### 普通css

注意：不支持层叠，嵌套，不能通过import循环引用，类名a-bc-def会被转换成aBcDef

```
// 单行注释
/*
    多行注释
*/
.class {
    color: blue;
}

@import url(other.css)
@import url("other2.css")

// 自动转换支持react-native不直接支持的几个属性
.class2 {
    border: 1px solid #ccc;
}
//==>等价于
.class2 {
    border-width: 1px;
    border-style: solid;
    border-color: #ccc;
}

.class {
    border-left: 1px solid #ccc;
}
//==>等价于
.class {
    border-left-width: 1px;
    border-style: solid;
    border-left-color: #ccc;
}

.class3 {
    border-radius: 1px 2px 3px;
}
//==>等价于
.class3 {
    border-top-left-radius: 1px;
    border-top-right-radius: 2px;
    border-bottom-right-radius: 3px;
    border-bottom-left-radius: 2px;
}

// 支持将原生的以下写法转换为react-native写法
.a {
    margin: *;
    padding: *;
}

// 支持将box-shadow转换
.c {
    // box-shadow: 10px 12px 6px #000;
    box-shadow: 10px 12px 5px 6px #000 inset;
}
==>转换为==>
c: {
    "shadowColor": "#000",
    "shadowOffset": {
        "width": 10,
        "height": 12
    },
    "shadowRadius": 6,
}
```

##### 变量

局部变量的作用域在定义他的文件，全局变量所有文件都可以引用，对应到react-native style的属性类型未number的，会去掉单位自动转化为数字

```
// 局部变量
$color=red
#size=12

// 全局变量
$global.color=yellow
$global.size=14

```

##### 函数mixin

mixin词法作用域，可指定参数，可以给参数指定默认值

mixin内不能混合出现样式和class，不要嵌套mixin

```
$width = 200px

// 定义一个只包含属性的mixin
@define-mixin commonstyle $color, $size:12, $width:$width {
    color: $color;
    font-size:$size;
    width:$width;
}

// 定义一个只包含class的mixin
@define-mixin commonClass $color, $size:12, $width:$width {
    .look {
        color: $color;
        font-size:$size;
    }

    .layout {
        width:$width;
    }
}

// 调用
.looklike {
    @commonstyle blue $size $width;
}

@commonClass #fff 30

```

#### 输出

##### 输入文件

```
@define-mixin test $color:blue {
    color: $color;
}

@define-mixin test2 $color:blue {
    .hellow {
        color: $color;
    }
}

.nihao {
    @test #fff
}

@test2

@test2 red
```
##### log

```
    【Error】：未能解析的样式：nidaya，文件：/Users/qitmac000420/project/react-native-ocss/test/css/common.css，className：.slider
    【Error】：未能查找到变量：$sb，文件：/Users/qitmac000420/project/react-native-ocss/test/css/common.css，className：#only
    【Error】：赋给属性color【color】的值不对：undefined【$sb】，文件：/Users/qitmac000420/project/react-native-ocss/test/css/common.css，className：#only
    【Log】：自动替换background 为 backgroundColor，文件：/Users/qitmac000420/project/react-native-ocss/test/css/common.css，className：#only
    【Error】：不支持的属性：fontColor【font-color】，文件：/Users/qitmac000420/project/react-native-ocss/test/css/index.css，className：.show
    【Error】：赋给属性fontSize【font-size】的值不对：xxxx【xxxx】，文件：/Users/qitmac000420/project/react-native-ocss/test/css/index.css，className：.warning
    【Log】：转换test/css/index.css完成

```

##### 输出文件

```
module.exports.styles = StyleSheet.create({
    "nihao": {
        "color": "#fff"
    },
    "hellow": {
        "color": "red"
    }
});
```