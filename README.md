#### 使用说明


##### 人肉安装

为毛不能发布到qnpm了。。。

```
    git clone http://gitlab.corp.qunar.com/fed/react-native-ocss.git yourdir
    npm install
    cd /user/bin
    sudo ln -s yourdir/index.js react-native-ocss
    sudo chmod +x react-native-ocss
```


##### 使用

```
    react-native-ocss compile input.css output.js

    -f format 指定输出格式，支持amd，commonjs
    -b beauty 格式化
    -w watch  监控
```


##### 输出

```
    【Error】：未能解析的样式：nidaya，文件：/Users/qitmac000420/project/react-native-ocss/test/css/common.css，className：.slider
    【Error】：未能查找到变量：$sb，文件：/Users/qitmac000420/project/react-native-ocss/test/css/common.css，className：#only
    【Error】：赋给属性color【color】的值不对：undefined【$sb】，文件：/Users/qitmac000420/project/react-native-ocss/test/css/common.css，className：#only
    【Log】：自动替换background 为 backgroundColor，文件：/Users/qitmac000420/project/react-native-ocss/test/css/common.css，className：#only
    【Error】：不支持的属性：fontColor【font-color】，文件：/Users/qitmac000420/project/react-native-ocss/test/css/index.css，className：.show
    【Error】：赋给属性fontSize【font-size】的值不对：xxxx【xxxx】，文件：/Users/qitmac000420/project/react-native-ocss/test/css/index.css，className：.warning
    【Log】：转换test/css/index.css完成

```