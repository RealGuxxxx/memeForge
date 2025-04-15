import { ethers } from 'ethers';
import { useState, useCallback } from 'react';
import { CONTRACT_ADDRESSES, CONTRACT_ABIS } from '../config/contracts';


export interface CreateTokenParams {
  name: string;
  symbol: string;
  initialSupply: string;
  decimals: number;
  initialLiquidityETH: string;
  tokenAmountForLiquidity: string;
  logoIpfsHash: string;
  deadline: number;
}

export const useTokenFactory = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createToken = useCallback(async (params: CreateTokenParams) => {
    try {
      setLoading(true);
      setError(null);

      // 检查是否安装了 MetaMask
      if (!window.ethereum) {
        throw new Error('请安装 MetaMask 钱包');
      }

      // 修改这里：优先使用自定义 RPC，如果未配置则回退到 MetaMask
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      // 创建合约实例
      const tokenFactory = new ethers.Contract(
        CONTRACT_ADDRESSES.TOKEN_FACTORY,
        CONTRACT_ABIS.TOKEN_FACTORY,
        signer
      );

      // 准备参数
      const {
        name,
        symbol,
        initialSupply,
        decimals,
        initialLiquidityETH,
        tokenAmountForLiquidity,
        logoIpfsHash,
        deadline
      } = params;

      console.log(`[TokenFactory] 开始创建代币: ${name} (${symbol})`);
      console.log(`[TokenFactory] 使用合约地址: ${CONTRACT_ADDRESSES.TOKEN_FACTORY}`);

      // 调用合约方法
      const tx = await tokenFactory.createTokenAndInitializeLiquidity(
        name,
        symbol,
        ethers.parseUnits(initialSupply, decimals),
        decimals,
        ethers.parseEther(initialLiquidityETH),
        ethers.parseUnits(tokenAmountForLiquidity, decimals),
        logoIpfsHash,
        deadline,
        { value: ethers.parseEther(initialLiquidityETH) }
      );

      console.log(`[TokenFactory] 交易已发送, 等待确认, 哈希: ${tx.hash}`);

      // 等待交易确认
      const receipt = await tx.wait();
      console.log(`[TokenFactory] 交易已确认, 区块号: ${receipt.blockNumber}, Gas使用: ${receipt.gasUsed}`);
      
      // 从事件中获取新创建的代币地址
      console.log(`[TokenFactory] 开始解析事件日志，寻找TokenCreated事件`);
      console.log(`[TokenFactory] 事件日志数量: ${receipt.logs?.length || 0}`);
      
      const events = receipt.logs || [];
      
      // 尝试从事件日志解析
      let tokenAddress;
      let pairAddress;
      
      // 遍历所有事件日志
      for (let i = 0; i < events.length; i++) {
        const log = events[i];
        console.log(`[TokenFactory] 日志 #${i}: address=${log.address}`);
        
        try {
          // 检查是否来自TokenFactory合约
          if (log.address.toLowerCase() === CONTRACT_ADDRESSES.TOKEN_FACTORY.toLowerCase()) {
            console.log(`[TokenFactory] 找到TokenFactory合约事件, topics:`, log.topics);
            
            // 尝试匹配TokenCreated事件
            const tokenCreatedEventSignature = ethers.id("TokenCreated(address,string,string,address)");
            const pairCreatedEventSignature = ethers.id("PairCreated(address,address)");
            
            if (log.topics[0] === tokenCreatedEventSignature) {
              console.log(`[TokenFactory] 识别到TokenCreated事件`);
              // 解析事件数据
              const decodedData = tokenFactory.interface.parseLog({
                topics: log.topics,
                data: log.data
              });
              tokenAddress = decodedData?.args?.token;
              console.log(`[TokenFactory] 解析到代币地址: ${tokenAddress}`);
            }
            
            if (log.topics[0] === pairCreatedEventSignature) {
              console.log(`[TokenFactory] 识别到PairCreated事件`);
              // 解析事件数据
              const decodedData = tokenFactory.interface.parseLog({
                topics: log.topics,
                data: log.data
              });
              pairAddress = decodedData?.args?.pair;
              console.log(`[TokenFactory] 解析到交易对地址: ${pairAddress}`);
            }
          }
        } catch (error) {
          console.error(`[TokenFactory] 解析日志 #${i} 时出错:`, error);
        }
      }
      
      // 如果从事件日志中未能解析到地址，则尝试直接从交易回执获取
      if (!tokenAddress) {
        console.log(`[TokenFactory] 未能从事件日志解析到代币地址，尝试获取交易回执中的合约地址`);
        if (receipt.contractAddress) {
          tokenAddress = receipt.contractAddress;
          console.log(`[TokenFactory] 从交易回执获取到合约地址: ${tokenAddress}`);
        } else {
          console.warn(`[TokenFactory] 警告: 未能从交易回执获取到合约地址`);
        }
      }
      
      // 最终返回结果
      const result = {
        tokenAddress,
        pairAddress,
        transactionHash: receipt.hash,
      };
      
      console.log(`[TokenFactory] 创建代币完成，返回结果:`, result);
      return result;
    } catch (err: any) {
      console.error(`[TokenFactory] 创建代币失败:`, err);
      setError(err.message || '创建代币失败');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const verifyToken = useCallback(async (tokenAddress: string) => {
    try {
      setLoading(true);
      setError(null);

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const tokenFactory = new ethers.Contract(
        CONTRACT_ADDRESSES.TOKEN_FACTORY,
        CONTRACT_ABIS.TOKEN_FACTORY,
        signer
      );

      const isVerified = await tokenFactory.verifyToken(tokenAddress);
      return isVerified;
    } catch (err: any) {
      setError(err.message || '验证代币失败');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    createToken,
    verifyToken,
    loading,
    error
  };
};