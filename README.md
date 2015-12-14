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
