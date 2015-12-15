### 使用说明


#### 人肉安装

为毛不能发布到qnpm了。。。

```
    git clone http://gitlab.corp.qunar.com/fed/react-native-ocss.git yourdir
    npm install
    cd /user/bin
    sudo ln -s yourdir/index.js react-native-ocss
    sudo chmod +x react-native-ocss
```


#### 使用

```
    react-native-ocss compile input.css [output.js]

    .option("-b, --beauty [beauty]", "格式化输出文件")
    .option("-i, --indent [indent]", "格式时候指定缩进缩进")
    .option("-l, --log [log]", "指定输出log的种类，默认输出all，可选error，warning，log")
    .option("-f, --format <format>", "指定输出格式")
    .option("-C, --commonjs [commonjs]", "输出符合commonjs规范的文件")
    .option("-A, --amd [amd]", "输出符合commonjs规范的文件")
    .option("-B, --browser [browser]", "输出browser格式文件")
    .option("-w, --watch [watch]", "监听文件变化，实时替换")
```


#### 支持的语法

##### 普通css

注意：不支持层叠，嵌套，不能通过import循环引用

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