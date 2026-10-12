#  微服务商城


---

## 目录

- [项目定位](#项目定位)
- [技术栈](#技术栈)
- [模块与端口](#模块与端口)
- [功能清单](#功能清单)
- [系统架构](#系统架构)
- [核心链路](#核心链路)
- [快速开始](#快速开始)

---

## 项目定位

| 项 | 说明 |
|---|---|
| **目的** | 学习 / 练习微服务技术栈 |
| **业务** | 简化版电商：商品 → 购物车 → 下单 → 支付 → 订单管理，含用户、地址簿、账户余额 |
| **原则** | 每个技术点都要落到真实业务链路上（举例：Seata 用于下单的跨服务一致性，而不是写个 Demo 接口） |
| **前端** | React  + Vite + Ant Design 5（登录、商品搜索、购物车、下单支付、订单与地址管理） |

---

## 技术栈

| 分类 | 技术 |
|---|---|
| 基础框架 | Spring Boot 2.7.12 · Spring Cloud 2021.0.3 · Spring Cloud Alibaba 2021.0.4.0 |
| 服务治理 | Nacos（注册发现 + 配置中心）· Spring Cloud Gateway · OpenFeign · Sentinel |
| 数据与事务 | MySQL 8 · MyBatis-Plus · Seata（AT 模式） |
| 消息与缓存 | RabbitMQ（延迟消息插件 + 死信队列）· Redis |
| 安全 | JWT（RSA，hmall.jks）· 网关统一鉴权 + 身份透传 |
| 前端 | React 18 · Vite 5 · TypeScript · Ant Design 5 · axios · react-router 6 |
| 构建部署 | Maven 多模块 · Docker（中间件）· JDK 17 |

---

## 模块与端口

| 模块 | 端口 | 职责 | 数据库 |
|---|---|---|---|
| `hm-gateway` | **8080** | 统一入口：路由转发、JWT 鉴权、白名单、用户身份透传 | — |
| `item-service` | 8081 | 商品：分页/搜索、CRUD、上下架、库存扣减与回滚 | `hm-item` |
| `cart-service` | 8082 | 购物车：加购、修改数量、删除、勾选、我的购物车 | `hm-cart` |
| `user-service` | 8084 | 用户：登录、账户信息、地址簿、余额（充值/扣减） | `hm-user` |
| `trade-service` | 8085 | 订单：下单、订单查询、支付状态同步、超时关单 | `hm-trade` |
| `pay-service` | 8086 | 支付：支付单申请、余额支付、支付成功通知 | `hm-pay` |
| `hm-common` | — | 公共模块：统一返回 `R`、异常体系与全局异常处理、用户上下文、分页、MQ 配置、自动装配 | — |
| `hm-api` | — | 公共契约：Feign 客户端、DTO、Feign 拦截器与降级工厂 | — |
| `hm-service` | 8080 | 原始单体服务（遗留模块，与网关端口冲突，默认不启动） | `hmall` |
| `hmall-web` | 5173 | 前端（Vite dev，`/api` 代理到网关） | — |

中间件端口：

| 中间件 | 端口 | 说明 |
|---|---|---|
| Nacos | 8848 | 注册中心 + 配置中心（含共享配置 `shared-seata.yaml`） |
| MySQL | **3307** | 用户名 `root`，密码见本地 profile |
| Redis | 6379 | 缓存 |
| RabbitMQ | 5672 / 15672 | 用户 `itheima`，vhost `/`，需安装 `x-delayed-message` 插件 |
| Seata Server | 8099（console 7099） | TC，注册到 Nacos，事务分组 `hmall` |
| Sentinel Dashboard | 8090 | cart-service 已配置指向 |

---

## 功能清单

**用户端**

- 首页轮播、商品搜索（关键词 / 分类 / 品牌 / 价格区间 + 排序 + 分页）、商品详情
- 购物车：加购、改数量、删除、勾选结算
- 下单：确认页选择收货地址、生成订单（跨服务：清购物车 + 扣库存）
- 支付：余额支付、支付成功回调订单状态
- 订单：我的订单（按状态筛选、分页）、订单详情、去支付
- 账户：用户信息、余额查看与充值
- 地址簿：新增 / 修改 / 删除 / 设为默认（Google Maps Places 选点，存 Place ID）

**管理端**

- 商品管理：分页查询、新增 / 修改 / 上下架 / 删除（含规格与库存）

---


## 快速开始

### 1. 环境要求

- JDK **17**、Maven 3.9+、Node 18+、Docker（或本机安装中间件）
- 建议在 IDEA 中运行；Maven 需能访问依赖仓库

### 2. 启动中间件

Nacos、MySQL（**3307**）、Redis、RabbitMQ（含 `x-delayed-message` 插件）、Seata Server。

> ⚠️ **启动顺序**：Nacos → MySQL/Redis/RabbitMQ → **Seata**（Seata 启动时会向 Nacos 注册，Nacos 未就绪会失败退出）。

### 3. 初始化数据库

各服务使用独立库：`hm-item`、`hm-cart`、`hm-trade`、`hm-pay`、`hm-user`，请自行执行建表与初始化脚本导入。

### 4. Nacos 配置

- 共享配置：`shared-seata.yaml`（Seata 事务分组、TC 地址等）；
- 各服务配置：`{服务名}.yaml` / `{服务名}-local.yaml`，包含 `server.port`、数据源、RabbitMQ 连接等；
- 本地 profile 中的 `hm.db.host` / `hm.db.pw` 用于区分"本机运行"与"容器运行"。

### 5. 启动服务

按依赖顺序启动：`item-service` / `cart-service` / `user-service` / `pay-service` / `trade-service` → 最后 `hm-gateway`。

**JDK 17 需添加的启动参数**（否则 MyBatis-Plus / Seata 反射会报 `InaccessibleObjectException`）：

```
--add-opens java.base/java.lang=ALL-UNNAMED
--add-opens java.base/java.lang.invoke=ALL-UNNAMED
```

### 6. 启动前端

```bash
cd hmall-web
npm install
npm run dev          # http://localhost:5173（/api 代理到 http://localhost:8080）
```

登录示例账号：`Jack / 123`。

### 7. 修改队列参数时

队列参数**只在首次声明时生效**。若调整了 `x-dead-letter-*` 等参数，需先删除旧队列再启动服务，否则会因
`PRECONDITION_FAILED - inequivalent arg ...` 导致监听容器启动失败：

```
管理台 http://localhost:15672 → Queues → 删除 trade.delay.order.queue / trade.pay.success.queue
```
