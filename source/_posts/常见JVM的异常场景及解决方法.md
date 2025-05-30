---
title: 常见JVM的异常场景及解决方法
tags:
  - JVM
categories:
  - JVM
cover: >-
  https://blog.mrmanwen.cn/blog/%E5%B8%B8%E8%A7%81OOM%E4%BB%8B%E7%BB%8D_Cover.png
abbrlink: 318ab98f
date: 2025-05-19 23:13:27
---
<meta name="referrer" content="no-referrer"/>

## 1. 引言

​	对于Java开发人员，不需要直接操作内存，很容易因为编码不规范的情况造成内存使用不当，出现OOM异常，本篇文章来梳理有哪些场景会造成OOM，以及对应的解决方法。

{% note warning flat %}

注：本篇文章为个人学习所用，可能存在不严谨或出错的地方，还请谅解。

{% endnote %}

## 2. Java堆溢出

​	堆的唯一作用就是存储对象的实例，堆占用的内存是有限的，如果对象实例的大小达到了最大限制，就会出现内存溢出的情况。

​	下面这段代码是造成堆溢出的代码示例，运行前指定堆大小（如果堆的最小值和最大值相同，堆的大小就不会动态扩展），并配置堆溢出时导出堆转储文件。

```java
package com.mrman.OOM;

//VM options: -Xms20m -Xmx20m -XX:+HeapDumpOnOutOfMemoryError
import java.util.ArrayList;
import java.util.List;

public class HeapOOM {

    static class TestObject {
    }

    public static void main(String[] args) {
        List<TestObject> list = new ArrayList<>();

        while (true) {
            list.add(new TestObject());
        }
    }
}

```

​	得到的结果为：`java.lang.OutOfMemoryError: Java heap space`

<img src="https://blog.mrmanwen.cn/blog/Java%E5%A0%86%E6%BA%A2%E5%87%BA%E7%9A%84output.png" style="zoom:80%;" />

​	排查的大致思路：利用分析工具（如MAT）分析dump文件，**先确定是内存泄露还是内存溢出**。

{% note warning flat %}

注：

​	内存泄露：分配的内存没有办法回收，导致无内存可用；

​	内存溢出：程序在申请内存时，JVM没有足够的内存分配，不能满足请求。

{% endnote %}

- 如果是内存泄露，就要检查泄露对象到GC Roots的引用链，分析泄露对象是如何被引用的，为什么没有被垃圾收集器回收掉。一般通过分析到GC Roots的引用链，就可以得出泄露对象是在哪里被创建的，从而定位出原因。
- 如果内存溢出，就需要检查堆的配置参数，结合机器的内存，判断是否可以调大堆的最大空间。

 	将上面代码得到的dump文件让MAT分析下，查看Leak Suspects（帮助分析占用内存较多的对象），发现main主线程创建了一个Object[]实例，占用了95.33%的内存。

<img src="https://blog.mrmanwen.cn/blog/%E5%A0%86%E6%BA%A2%E5%87%BA_MAT_LeakSuspects.png" style="zoom:80%;" />

​	MAT中还有一个很常用的指标Dominator tree，Dominator tree是根据对象的引用和支配关系生成的树状支配图，按照Retained Heap大小排序，能清晰的查看对象之间的引用关系。

{% note warning flat %}

需要介绍两个概念：

​	Shallow Heap：对象自身占用的内存大小，不包含其属性对象占用的内存大小；

​	Retained Heap(重点)：指一个对象被GC后，能释放掉的内存大小（是分析内存溢出的一个非常重要的指标）。

{% endnote %}

​	现在看下Dominator tree，发现Object[]对象实例的Retained Heap为16206520KB，内部共有810325个TestObject示例，占用95.33%的内存。也可以发现每个TestObject关联的是Thread，属于GC Root，所以TestObject对象都无法被回收，从而导致堆溢出。

<img src="https://blog.mrmanwen.cn/blog/JVM%E5%A0%86%E6%BA%A2%E5%87%BA_MAT_DominatorTree.png" style="zoom:80%;" />


<img src="https://blog.mrmanwen.cn/blog/JVM%E5%A0%86%E6%BA%A2%E5%87%BA_MAT_pathToGCRoot.png" style="zoom:80%;" />

## 3. 虚拟机栈和本地方法栈溢出

​	在《Java虚拟机规范》中对于虚拟机栈和本地方法栈，讲了两种OOM异常：

1. 如果线程请求的栈深度大于虚拟机栈允许的最大深度，将抛出`StackOverflowError`异常。
2. 如果虚拟机的栈允许动态扩展，那么在扩展时无法申请到足够的内存，将抛出`OutOfMemoryError`异常。

​	在HotSpot虚拟机中，规定虚拟机栈不可以动态扩展，所以只有创建线程时无法获得足够内存的情况，才会造成OutOfMemoryError异常，其他情况均为StackOverflowError异常，造成StackOverflowError异常的情况也主要有两种：

1. 虚拟机栈整体的内存容量就偏小，无法容纳太多的栈帧；

2. 虚拟机栈的内存容量正常，但是栈帧的容量太大（如：方法中定义了很多的本地变量）。

## 4. 多线程下的OutOfMemoryError异常

​	如果将考虑范围扩大到多线程，通过不断地的创建线程，也会造成内存溢出异常。

​	原因很好理解，系统给每个进程分配的内存是有限的，如果其他区域占用的内存过大，那留给栈的内存就会变小此时有两种情况：

1. 如果此时创建过多的线程，就会迅速将留给栈的内存占满；

2. 如果给创建的线程分配栈内存过大，总量不变，能创建的线程数就变小，很快也会被占满。

​	在这种情况下，如果不能减少线程创建的数量，就只能通过减小堆大小或减少栈容量来换取创建更多的线程，这种手段不容易想到。

​	这里讲一下在实际开发中遇到的例子，程序运行时报错：

```Java
java.lang.OutOfMemoryError:unable to create new native thread
```

​	这个错误说明无法再创建新的线程了，这个时候需要判断是线程数量太多了，还是每个线程分配栈的内存太大了。首先，查询进程的PID信息，确定PID后，查看该进程一共创建了多少线程，以及操作系统规定可以创建的最多线程数：

![](https://blog.mrmanwen.cn/blog/%E6%9F%A5%E8%BF%9B%E7%A8%8B%E5%88%9B%E5%BB%BA%E7%9A%84%E7%BA%BF%E7%A8%8B%E6%95%B0.png)

​								![](https://blog.mrmanwen.cn/blog/%E6%9C%80%E5%A4%9A%E5%88%9B%E5%BB%BA%E7%BA%BF%E7%A8%8B%E6%95%B0.png)	

​   发现一共创建了30803个线程，而最大线程数为30823，非常接近，大概可以判断是线程创建的太多了，有了这个猜想后，就可以回到代码，检查线程创建的地方，确实发现了不对劲，创建线程的语句放在了循环里面，导致线程一直被创建。

<img src="https://blog.mrmanwen.cn/blog/%E7%BA%BF%E7%A8%8B%E5%88%9B%E5%BB%BA%E8%BF%87%E5%A4%9A-%E4%BB%A3%E7%A0%81%E6%8E%92%E6%9F%A5.png" style="zoom:80%;" />



## 5. 方法区和运行时常量池溢出

​   从JDK8开始，元空间永久替换了永久代，元空间直接受限于本地内存的大小，因此元空间出现内存溢出的情况已经很少见了，现在的项目都是JDK8起步了，所以可以不考虑这部分的溢出问题。

