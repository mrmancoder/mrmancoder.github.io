---
title: >-
  MySQL主从同步报错排查：Coordinator stopped because there were error(s) in the
  worker(s).
tags:
  - MySQL
categories:
  - MySQL
cover: >-
  https://blog.mrmanwen.cn/blog/MySQL%E4%B8%BB%E4%BB%8E%E5%90%8C%E6%AD%A5%E9%97%AE%E9%A2%98%E6%8E%92%E6%9F%A5_cover.jpg
abbrlink: 99cfcdc2
date: 2025-05-24 17:49:00
---
<meta name="referrer" content="no-referrer"/>

## 1. 前言

​	在配置MySQL主从复制后，执行`show slave status;`查询同步状态，出现报错，Slave_SQL_Running为No，Last_Error是报错信息。

![](https://blog.mrmanwen.cn/blog/MySQL%E5%90%8C%E6%AD%A5%E7%8A%B6%E6%80%81%E6%8A%A5%E9%94%99.png)

> Last_Error：Coordinator stopped because there were error(s) in the worker(s). The most recent failure being: Worker 1 failed executing transaction 'ANONYMOUS' at source log binlog.000001, end_log_pos 1000. See error log and/or performance_schema.replication_applier_status_by_worker table for more details about this failure or others, if any.

​	顺着报错信息，来到`performance_schema.replication_applier_status_by_worker`表查看具体信息。

> LAST_ERROR_MESSAGE:Worker 1 failed executing transaction 'ANONYMOUS' at source log binlog.000001, end_log_pos 1000; Error executing row event: 'Unknown database 'nacos''

## 2. 问题分析

​	分析报错信息，一个工作进程在执行一个匿名事务时发生了报错，具体的问题为:`'Unknown database 'nacos''`。

​	主库上对 nacos 数据库进行了某些操作（比如插入、更新、删除数据），这些操作被记录到了binlog中。当从库尝试重放这些操作时，发现在从库环境中并不存在一个叫做 nacos 的数据库，因此抛出错误。

## 3. 解决办法

​	既然从库没有nacos数据库，那就**手动将主库的nacos库整体复制到从库**，之后再重新开启主从库的同步即可，查询同步状态，问题修复。