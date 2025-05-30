---
title: Linux安装Docker
tags:
  - Linux
  - Docker
  - 环境搭建
categories:
  - Docker
abbrlink: 96e9ca9a
date: 2024-05-21 22:58:06
cover: https://fb48e8e1.telegraph-image-bm7.pages.dev/file/74997adb952be015b09ca.png
---
# 1. **前置说明**

* 本文使用阿里云ECS服务器，系统为Alibaba Cloud Linux 3.2104 LTS 64位，是完全兼容CentOS的。
* CentOS安装Docker官网：[https://docs.docker.com/engine/install/centos/](https://docs.docker.com/engine/install/centos/)

# 2. **安装前卸载旧版本**

```shell
sudo yum remove docker \
                  docker-client \
                  docker-client-latest \
                  docker-common \
                  docker-latest \
                  docker-latest-logrotate \
                  docker-logrotate \
                  docker-engine
```

* 直接执行上面的命令，如果出现下面图片的效果，说明系统中没有Docker。

![](https://fb48e8e1.telegraph-image-bm7.pages.dev/file/76fb3ee8871ddd3dd62a4.png)

# 3. **执行安装**

**安装yum-utils软件包**

- 该软件包是一个yum工具集（yum理解为一个包管理器），它提供了一些常用的命令和插件，以便管理和维护yum软件包管理器，其中的 `-y`表示安装过程中遇到的所有问题全都回答yes。

```shell
sudo yum install -y yum-utils
```


**添加Docker仓库**

```shell
sudo yum-config-manager --add-repo https://mirrors.aliyun.com/docker-ce/linux/centos/docker-ce.repo
```

> - yum-config-manager：一个管理yum配置的命令行工具；
> - --add-repo：添加新的软件仓库，后面的链接为Docker软件仓库；


**安装Docker最新版本**

```shell
sudo yum install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

> 这个命令安装了 Docker，但是没有启动 Docker。
>
> 它还创建了一个 docker 组，但是默认情况下它不会将任何用户添加到组中。


**安装指定版本**

- 首先执行下面命令列出仓库中可用的版本，显示的第二列就是可用的版本，如图所示。

```shell
yum list docker-ce --showduplicates | sort -r
```

![img](https://fb48e8e1.telegraph-image-bm7.pages.dev/file/6ed2870a9b8112d6db512.png)

- 执行安装命令，将自己想要安装的版本替换掉命令中的<VERSION_STRING>即可，例如 `docker-ce-3:26.1.3-1.el8`。

```shell
sudo yum install docker-ce-<VERSION_STRING> docker-ce-cli-<VERSION_STRING> containerd.io docker-buildx-plugin docker-compose-plugin
```

> 现在Docker就已经安装完成了

# 4. **启动Docker**

**执行启动命令并验证是否启动成功。**

```shell
sudo systemctl start docker
sudo docker ps
```

**如果启动成功，会得到下图的效果。**

![](https://fb48e8e1.telegraph-image-bm7.pages.dev/file/c9b69496cdf87b2c818f7.png)

# 5. **END**

到这里整个Docker的安装和启动就结束了🍀🍀🍀
