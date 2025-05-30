---
title: 聊聊Kafka到底是什么？
tags:
  - Kafka
  - 消息队列
categories:
  - kafka
  - 消息队列
cover: 'https://blog.mrmanwen.cn/blog/Kafka_logo.png'
abbrlink: 105f9113
date: 2024-12-29 18:49:56
---
<meta name="referrer" content="no-referrer"/>

## 一、概述

Kafka **既是一个高性能的分布式流处理平台，也是一个具有高吞吐量、低延迟和高可靠性的消息传递系统**。它不仅仅是一个简单的消息队列，还是一个面向实时数据流处理的基础设施。广泛应用于大数据分析、日志聚合、监控和事件流处理等场景。

## 二、Kafka架构分析

### （一）Kafka结构及重要组件

![](https://blog.mrmanwen.cn/blog/Kafka%E6%9E%B6%E6%9E%84%E5%9B%BE.png)

如上图所示，Kafka由Producer、Broker、Consumer 以及负责集群管理的 ZooKeeper 组成，各部分功能如下：

- **Producer：**生产者，负责消息的创建并通过一定的路由策略发送消息到合适的 Broker； 

- **Broker：**服务实例，负责消息的持久化、中转等功能；
- **Consumer：**消费者，负责从 Broker 中拉取（Pull）订阅的消息并进行消费，通常多个消费者构成一个分组，消息只能被同组中的一个消费者消费；
- **ZooKeeper：**负责 broker、consumer 集群元数据的管理等，在2.8版本及之后，Kafka移除了对Zookeeper的依赖；

- **topic：**消息主题。Kafka 按 topic 对消息进行分类，我们在收发消息时只需指定 topic。
- **partition：**分区。为了提升系统的吞吐，一个 topic 下通常有多个 partition，partition 分布在不同的 Broker 上，用于存储 topic 的消息，这使 Kafka 可以在多台机器上处理、存储消息，给 kafka 提供给了并行的消息处理能力和横向扩容能力。另外，为了提升系统的可靠性，partition 通常会分组，且每组有一个主 partition、多个副本 partition，且分布在不同的 broker 上，从而起到容灾的作用。
- **segment：**分段。宏观上看，一个 partition 对应一个日志（Log）。由于生产者生产的消息会不断追加到 log 文件末尾，为防止 log 文件过大导致数据检索效率低下，Kafka 采取了分段和索引机制，将每个 partition 分为多个 segment，同时也便于消息的维护和清理。每个 segment 包含一个 .log 日志文件、两个索引(.index、timeindex)文件以及其他可能的文件。每个 Segment 的数据文件以该段中最小的 offset 为文件名，当查找 offset 的 Message 的时候，通过二分查找快找到 Message 所处于的 Segment 中。
- **offset：**消息在日志中的位置，消息在被追加到分区日志文件的时候都会分配一个特定的偏移量。offset 是消息在分区中的唯一标识，是一个单调递增且不变的值。Kafka 通过它来保证消息在分区内的顺序性，不过 offset 并不跨越分区，也就是说，Kafka 保证的是分区有序而不是主题有序。

### （二）分区策略

每个主题内会存在多个分区，为了明确生产者将消息发送给哪个分区，Kafka指定了几种分区策略，其中默认的分区策略为轮询策略。

#### 1. 轮询策略

轮询策略也被称为Round-robin策略，即顺序分配，假如一个topic包括三个分区，分别为0,1,2，生产者共有10个消息，编号为1-10，按顺序分配后，得到的结果如图所示，轮询策略能保证消息最大程度的分配到不同的分区上，也是最合理的分区策略。

![](https://blog.mrmanwen.cn/blog/kafka_%E8%BD%AE%E8%AF%A2%E7%AD%96%E7%95%A5.png)

#### 2. 随机策略

随机策略也称为Randomness策略。所谓随机就是我们随意地将消息放置到任意一个分区上，在代码中先获取分区的个数N，然后随机获取一个小于N的正整数。随机策略本质上是将消息平均分配到分区上，但是会出现分区之间分配消息不均匀的情况，这也正是Kafka官方在新版本中将默认分区策略从随机策略改为轮询策略。

#### 3. 消费Key值顺序策略

Kafka 允许为每条消息定义消息键，简称为 Key。这个 Key是一个有着明确业务含义的字符串，比如工号、部门编号或是业务 ID 等；一旦消息被定义了 Key，那么就可以保证同一个Key 的所有消息都进入到相同的分区里面，这样做的优势在于可以根据业务场景对消息进行分组，在消息消费时能够极大的提高消息处理的吞吐量。由于每个分区下的消息处理都是有顺序的，所以这个策略被称为消息Key值顺序策略。如果指定了 Key，那么默认实现按消息键保序策略；如果没有指定 Key，则使用轮询策略。如下图所示。

![](https://blog.mrmanwen.cn/blog/kafka%E6%B6%88%E8%B4%B9Key%E5%80%BC%E9%A1%BA%E5%BA%8F%E7%AD%96%E7%95%A5.png)

#### 4. 自定义策略

Kafka提供了可自定义策略，因此开发人员可以自己定义具体策略。可以编写一个实现类实现 org.apache.kafka.clients.producer.Partitioner接口中的partition方法，然后在生产者端配置partition.class为实现类的全类名即可。观察Kafka源码发现，Kafka的默认分区器DefaultPartitioner类也实现了此方法，此方法的参数包括主题、分区、集群等，如图所示，可见Kafka提供足够多的信息让开发人员实现自定义策略。

![](https://blog.mrmanwen.cn/blog/Kafka-%E8%87%AA%E5%AE%9A%E4%B9%89%E7%AD%96%E7%95%A5.png)

### （三）消费者的位移提交机制

生产者将消息按照策略发送到分区之后，消息的下一个处理阶段是由消费者消费。Consumer利用偏移量offset记录了Consumer要消费的下一条消息的位移。在消息被消费后，Consumer会向Kafka提交自己的位移信息，即告诉Kafka我消费到什么位置了，这样当 Consumer 发生故障重启之后，就能够从 Kafka 中读取之前提交的位移值，然后从相应的位移处继续消费，从而避免整个消费过程重来一遍，此过程被叫做位移提交。由于消息只在分区中保证其有序性，因此Consumer会为分配给他的每个分区都维护一个offset。Kafka提供了两种提交机制，分别为自动提交和手动提交。

#### 1. 自动提交

自动提交是指Consumer在后台默默地提交位移，要想开启Consumer的自动提交，只需要将参数 enable.auto.commit设置为true即可，同时还需要关注一个参数：auto.commit.interval.ms。它表示多久自动提交一次，默认值是 5 秒。

#### 2. 手动提交

手动提交是指消费完消息后，在代码中手动向Kafka做位移提交。开启手动提交的方法是将enable.auto.commit置为false，然后在代码中调用**commitSync()**方法提交最新的位移，此方式为同步提交，同步提交的优势在于更加灵活，能够手动把控提交位移的时机。但是，同步提交也有缺陷，就是在调用 commitSync() 时，Consumer 程序会处于阻塞状态，直到远端的 Broker 返回提交结果，这个状态才会结束，会造成系统短暂的阻塞，在代码中的实现如下：

![](https://blog.mrmanwen.cn/blog/kafka-%E6%89%8B%E5%8A%A8%E6%8F%90%E4%BA%A4%E4%BB%A3%E7%A0%81.png)

为了避免同步提交造成阻塞的问题，Kafka还支持异步提交，即**commitAsync()**方法，该方法是一个异步操作。调用 commitAsync() 之后，它会立即返回，不会阻塞。同时Kafka还提供了回调函数（callback），用来实现提交之后的逻辑，比如记录日志或处理异常等。异步提交在代码中的实现如下：

![](https://blog.mrmanwen.cn/blog/kafka-%E5%BC%82%E6%AD%A5%E6%8F%90%E4%BA%A4.png)

### （四）Kafka为什么这么快-“零拷贝”

Kafka 中存在大量的网络数据持久化到磁盘（Producer 到 Broker）和磁盘文件通过网络发送（Broker 到 Consumer）的过程，这一过程的性能直接影响 Kafka 的整体吞吐量。传统的 IO 操作存在多次数据拷贝和上下文切换，性能比较低。Kafka 利用零拷贝技术提升上述过程性能，其中网络数据持久化磁盘主要用 mmap 技术，网络数据传输环节主要使用 Sendfile 技术。

传统模式下，数据从网络传输到文件需要 4 次数据拷贝、4 次上下文切换和两次系统调用。如下图所示：

![](https://blog.mrmanwen.cn/blog/%E6%95%B0%E6%8D%AE%E6%8B%B7%E8%B4%9D%EF%BC%88%E4%BC%A0%E7%BB%9F%E6%96%B9%E5%BC%8F%EF%BC%89.png)

为了减少上下文切换以及数据拷贝带来的性能开销，Broker 在对 Producer 传来的网络数据进行持久化时使用了 mmap 技术。通过这种技术手段， Broker 读取到 Socket Buffer 的网络数据，可以直接在内核空间完成落盘，没有必要将 Socket Buffer 的网络数据读取到应用进程缓冲区。

![](https://blog.mrmanwen.cn/blog/kafka-%E9%9B%B6%E6%8B%B7%E8%B4%9D.png)

Sendfile也是类似的效果，通过 NIO 的transferTo/transferFrom调用操作系统的 Sendfile 实现零拷贝，可以减少上下文切换以及数据拷贝带来的性能开销。

## 三、Kafka的应用场景

### （一）异步处理

![](https://blog.mrmanwen.cn/blog/kafka-%E5%BC%82%E6%AD%A5%E5%A4%84%E7%90%86.png)



场景说明：用户执行下单操作，系统需要完成扣款、更新库存、发货等处理。

传统方式：用户执行下单后，订单服务接收到消息，需要依次调用支付服务、库存服务、发货服务，所有任务全都执行完成后才将结果返回给用户，那么用户等待的时间会很长，严重影响了用户体验；

引入Kafka异步处理：订单服务接收用户下单请求后，将订单消息发送给Kafka，支付、库存、发货服务作为消费者，订阅Kafka的主题，读取订单消息后分开执行，降低了系统的耦合度，同时，用户的下单操作是异步的，订单服务发送完消息后，无需等待其他服务的响应即可返回，大幅度降低用户的等待时间。

### （二）流量削峰

![](https://blog.mrmanwen.cn/blog/kafka-%E6%B5%81%E9%87%8F%E5%89%8A%E5%B3%B0.png)

场景说明：一般用在短时间内处理大量请求，例如：秒杀、服务中的API遭到突发的访问压力等场景，在短时间内流量过大，极容易导致服务过载，应用挂掉。

引入Kafka实现流量削峰：Kafka 的消息队列可以作为请求的缓冲池，将请求写入 Kafka 队列，消费者可以根据负载情况控制流量的消费速率，避免系统承载超出负荷的流量，达到削峰的目的。

### （三）日志处理与分析

日志收集是 Kafka 最初的设计目标之一。Kafka可以收集各种服务的日志，如 web 服务器、服务器日志、数据库服务器等，通过Kafka以统一接口服务的方式开放给各种消费者，例如 Flink、Hadoop、Hbase、ElasticSearch 等。这样可以实现分布式系统中海量日志数据的处理与分析。

## 四、Kafka的缺点

虽然 Kafka 是一个高效且强大的分布式消息队列系统，但它也有一些**缺点和限制**。在复杂性方面，维护和管理集群是非常复杂的，需要确保节点、分区等都是实时监控且健康的；在扩容方面，集群中新增的broker只会处理新topic，如果要分担旧分区的压力，需要手动迁移partition，这时会占用大量集群带宽；在消息顺序方面：Kafka 保证了单个分区内的消息顺序，但跨分区的消息顺序是无法保证的。因此，在使用Kafka时，需要重点关注Kafka的缺点问题。

