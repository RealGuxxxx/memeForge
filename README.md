# MemeForge 前端

MemeForge是一个基于Web3技术的表情包NFT创作与交易平台，允许用户创建、铸造、交易个性化的表情包NFT，支持Web3钱包认证、代币创建、流动性挖矿等功能。

## 项目结构
meme-forge-frontend/
├── src/
│ ├── abi/ # 智能合约ABI定义
│ ├── api/ # 后端API调用接口
│ ├── app/ # Next.js应用页面
│ ├── components/ # 共享React组件
│ ├── config/ # 全局配置
│ ├── hooks/ # 自定义React Hooks
│ ├── styles/ # 全局样式文件
│ ├── test/ # 测试文件
│ ├── types/ # TypeScript类型定义
│ └── utils/ # 工具函数


## 技术栈

- **框架**: Next.js, React
- **语言**: TypeScript
- **状态管理**: React Hooks
- **UI组件**: Tailwind CSS
- **Web3交互**: ethers.js
- **网络请求**: Axios
- **开发工具**: ESLint, Prettier

## 功能模块

### 1. 钱包连接与认证

支持多种Web3钱包的连接和签名认证流程，实现去中心化的用户身份验证。

### 2. 代币创建与管理

- 创建自定义代币，设置名称、符号、供应量等参数
- 为代币提供初始流动性，自动创建交易对
- 管理已创建的代币，查看市场表现

### 3. 代币交易

- 以太币与代币的交换
- 交易历史记录查询

### 4. 用户资产管理

- 查询用户持有的代币列表及余额
- 跟踪代币价值变化
- 管理授权与交易记录

## 开发指南

### 环境要求

- Node.js 16+
- Yarn 或 npm

### 安装依赖

```bash
npm install
# 或
yarn
```

### 本地开发

```bash
npm run dev
# 或
yarn dev
```

### 构建生产版本

```bash
npm run build
# 或
yarn build
```

## 配置

项目使用环境变量进行配置，可通过`.env.local`文件设置：
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
NEXT_PUBLIC_USER_API_BASE_URL=http://localhost:8081
NEXT_PUBLIC_TOKEN_API_BASE_URL=http://localhost:8082
NEXT_PUBLIC_SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY


## 与后端集成

前端通过API模块与后端服务交互，主要包括：

- 用户认证和信息管理
- 代币创建记录与元数据存储
- 交易记录同步

## 与区块链交互

前端通过ethers.js库实现与以太坊区块链的交互：

- 使用ABI定义调用智能合约方法
- 监听合约事件
- 处理交易签名和确认
- 管理钱包连接状态

## 部署指南

1. 构建生产版本
   ```bash
   npm run build
   ```

2. 使用合适的服务部署构建产物
   ```bash
   npm run start
   ```

3. 或者使用Docker部署
   ```bash
   docker build -t memeforge-frontend .
   docker run -p 3000:3000 memeforge-frontend
   ```
