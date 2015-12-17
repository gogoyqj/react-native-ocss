#!/bin/sh

npm install

indexjs=`pwd`/index.js

cd /usr/bin

sudo ln -s $indexjs rcss

sudo chmod +x rcss

echo "现在你可以用rcss 这个命令来转化文件"