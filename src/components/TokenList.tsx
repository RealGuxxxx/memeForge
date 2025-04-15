"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Button,
  Window,
  WindowHeader,
  WindowContent,
  TextField,
  ProgressBar,
  MenuList,
  MenuListItem,
  Separator,
  ScrollView,
} from "react95";
import { tokenApi, TokenVO, getContractAddress } from "@/api";

interface TokenListProps {
  onTokenSelect?: (token: TokenVO) => void;
}

export const TokenList: React.FC<TokenListProps> = ({ onTokenSelect }) => {
  const [tokens, setTokens] = useState<TokenVO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchTrigger, setSearchTrigger] = useState(0);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const tokenListRef = useRef<HTMLDivElement>(null);
  const pageSize = 10;
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    token: TokenVO | null;
    visible: boolean;
  }>({
    x: 0,
    y: 0,
    token: null,
    visible: false,
  });

  const [showCopySuccess, setShowCopySuccess] = useState(false);

  // 检测是否为移动设备
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // 从后端获取代币列表
  const fetchTokens = useCallback(
    async (isLoadMore = false) => {
      try {
        // 修改：当需要加载更多时使用当前页码，否则重置为0
        const actualPage = isLoadMore ? currentPage : 0;
        const actualKeyword = searching ? searchKeyword.trim() : "";

        // 设置加载状态
        if (isLoadMore) {
          setLoadingMore(true);
        } else {
          setLoading(true);
          // 非加载更多时清空现有数据
          setTokens([]);
          // 重要：搜索新内容时重置页码
          if (!isLoadMore) {
            setCurrentPage(0);
          }
        }

        console.log(
          `获取代币列表 - 页码: ${actualPage}, 页大小: ${pageSize}, 关键词: ${actualKeyword}`
        );

        // API调用
        const response = await tokenApi.pageTokens(
          actualPage,
          pageSize,
          actualKeyword
        );

        console.log("获取到的代币列表响应:", JSON.stringify(response));

        // 处理响应数据
        if (response && Array.isArray(response.records)) {
          console.log(`获取到 ${response.records.length} 条代币数据`);

          // 处理数据
          if (isLoadMore) {
            // 加载更多时，将新数据添加到现有数据后面
            setTokens((prevTokens) => [...prevTokens, ...response.records]);
          } else {
            // 首次加载或搜索时，直接使用新数据
            setTokens(response.records);
          }

          setTotalPages(response.pages || 1);
          setError(null);

          // 检查是否还有更多数据
          const hasNextPage = response.current < response.pages - 1;
          setHasMore(hasNextPage);
        } else {
          console.error("代币列表响应格式不正确，records不是数组", response);
          if (!isLoadMore) {
            setTokens([]);
            setTotalPages(0);
            setError("获取代币列表返回的数据格式不正确");
          }
          setHasMore(false);
        }
      } catch (err) {
        console.error("获取代币列表失败", err);
        if (!isLoadMore) {
          setError("获取代币列表失败");
          setTokens([]);
        }
        setHasMore(false);
      } finally {
        if (isLoadMore) {
          setLoadingMore(false);
        } else {
          setLoading(false);
        }
      }
    },
    [currentPage, pageSize, searchKeyword, searching]
  );

  // 自动触发数据加载
  useEffect(() => {
    // 仅在以下情况触发数据加载：
    // 1. 手动搜索触发（searchTrigger变化）
    // 2. 页码变化（加载更多）
    if (searchTrigger > 0 || currentPage > 0) {
      // 使用函数式更新，避免依赖 tokens
      fetchTokens(currentPage > 0);
    }
    // 移除 fetchTokens 依赖，使用 eslint-disable 防止警告
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTrigger, currentPage]);

  // 首次加载
  useEffect(() => {
    // 组件挂载时执行首次加载
    setSearchTrigger(1);
  }, []);

  // 处理搜索输入变化
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setKeyword(value);
  };

  // 搜索处理
  const handleSearch = () => {
    const trimmedKeyword = keyword.trim();

    // 空关键词处理
    if (!trimmedKeyword) {
      handleCancelSearch();
      return;
    }

    // 设置搜索状态
    setSearching(true);
    setCurrentPage(0);
    setTokens([]);
    setHasMore(true);
    setSearchKeyword(trimmedKeyword);
    setSearchTrigger((prev) => prev + 1); // 手动触发搜索
  };

  // 取消搜索
  const handleCancelSearch = () => {
    if (!searching) return;

    // 重置搜索相关状态
    setKeyword("");
    setSearchKeyword("");
    setSearching(false);
    setCurrentPage(0);
    setTokens([]);
    setHasMore(true);
    setSearchTrigger((prev) => prev + 1); // 强制触发数据加载
  };

  // 监听内部滚动元素的滚动事件来加载更多
  useEffect(() => {
    // 如果没有更多数据或正在加载中，则不设置观察器
    if (!hasMore || loading || loadingMore) return;

    // 移除之前的观察器
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    // 创建新的观察器
    const observer = new IntersectionObserver(
      (entries) => {
        // 如果加载更多的元素进入视野，且有更多数据，则加载下一页
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          setCurrentPage((prev) => prev + 1);
        }
      },
      { threshold: 0.5 } // 当50%的元素可见时触发
    );

    // 观察加载更多的元素
    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    observerRef.current = observer;

    return () => {
      observer.disconnect();
    };
  }, [hasMore, loading, loadingMore]);

  // 格式化日期
  const formatDate = (dateString: string) => {
    if (!dateString) return "-";

    try {
      // 假设后端返回的是ISO格式的字符串或时间戳
      const date = new Date(dateString);

      // 检查是否是有效日期
      if (isNaN(date.getTime())) {
        console.error("Invalid date:", dateString);
        return "-";
      }

      return date.toLocaleString("zh-CN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      });
    } catch (error) {
      console.error("Date formatting error:", error);
      return "-";
    }
  };

  // 获取代币的图片URL
  const getTokenImageUrl = (token: TokenVO): string | undefined => {
    if (token.logoUrl) {
      return token.logoUrl;
    } else if (token.ipfsCid) {
      // 检查是否已经是标准IPFS CID
      if (token.ipfsCid.startsWith("Qm") || token.ipfsCid.startsWith("baf")) {
        // 使用公共IPFS网关
        return `https://ipfs.io/ipfs/${token.ipfsCid}`;
      } else {
        // 使用Filebase S3 URL
        return `https://${process.env.NEXT_PUBLIC_FILEBASE_BUCKET}.s3.filebase.com/${token.ipfsCid}`;
      }
    }
    return undefined;
  };

  // 截断地址
  const shortenAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(
      address.length - 4
    )}`;
  };

  // 阻止Token列表滚动事件冒泡到主页
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    e.stopPropagation();
  };

  // 处理右键点击
  const handleContextMenu = (e: React.MouseEvent, token: TokenVO) => {
    e.preventDefault();
    e.stopPropagation();
    const { clientX, clientY } = e;

    // 调整菜单位置，确保不会超出屏幕
    const menuX = Math.min(clientX, window.innerWidth - 200);
    const menuY = Math.min(clientY, window.innerHeight - 100);

    setContextMenu({
      x: menuX,
      y: menuY,
      token,
      visible: true,
    });
  };

  // 处理复制地址
  const handleCopyAddress = async () => {
    if (!contextMenu.token) return;

    try {
      await navigator.clipboard.writeText(contextMenu.token.tokenAddress);
      setShowCopySuccess(true);
      setTimeout(() => setShowCopySuccess(false), 2000);
    } catch (err) {
      console.error("复制失败:", err);
    }
    setContextMenu((prev) => ({ ...prev, visible: false }));
  };

  // 处理移动端长按
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(
    null
  );

  const handleTouchStart = (e: React.TouchEvent, token: TokenVO) => {
    if (!isMobile) return;

    const timer = setTimeout(() => {
      const touch = e.touches[0];
      const rect = (e.target as HTMLElement).getBoundingClientRect();

      handleContextMenu(
        {
          preventDefault: () => {},
          stopPropagation: () => {},
          clientX: touch.clientX,
          clientY: touch.clientY + rect.top,
        } as React.MouseEvent,
        token
      );
    }, 500);

    setLongPressTimer(timer);
  };

  const handleTouchMove = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  const handleTouchEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  // 点击其他地方关闭菜单
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (contextMenu.visible) {
        setContextMenu((prev) => ({ ...prev, visible: false }));
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [contextMenu.visible]);

  // 复制成功提示窗口
  const CopySuccessWindow = () => {
    if (!showCopySuccess) return null;

    return (
      <Window
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 10000,
          width: "300px",
        }}
      >
        <WindowHeader>
          <span>提示</span>
        </WindowHeader>
        <WindowContent>
          <div style={{ textAlign: "center", padding: "1rem" }}>
            <span
              role="img"
              aria-label="success"
              style={{
                fontSize: "24px",
                marginBottom: "8px",
                display: "block",
              }}
            >
              ✅
            </span>
            <p>地址已复制到剪贴板</p>
          </div>
        </WindowContent>
      </Window>
    );
  };

  // 右键菜单组件
  const ContextMenu = () => {
    if (!contextMenu.visible || !contextMenu.token) return null;

    return (
      <div
        style={{
          position: "fixed",
          top: contextMenu.y,
          left: contextMenu.x,
          zIndex: 9999,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <MenuList>
          <MenuListItem onClick={handleCopyAddress}>
            <span role="img" aria-label="copy" style={{ marginRight: "8px" }}>
              📋
            </span>
            复制代币合约地址
          </MenuListItem>
        </MenuList>
      </div>
    );
  };

  // 在 renderTokenItem 中添加触摸事件
  const renderTokenItem = (token: TokenVO, isMobileView: boolean) => {
    const commonProps = {
      key: token.id,
      onClick: () => onTokenSelect?.(token),
      onContextMenu: (e: React.MouseEvent) => handleContextMenu(e, token),
      onTouchStart: (e: React.TouchEvent) => handleTouchStart(e, token),
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
      style: {
        cursor: "pointer",
        marginBottom: isMobileView ? "12px" : undefined,
        // ... 其他样式
      },
    };

    if (isMobileView) {
      return (
        <Window {...commonProps}>
          <WindowHeader style={{ fontSize: "14px" }}>{token.name}</WindowHeader>
          <WindowContent>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: "12px",
                gap: "12px",
              }}
            >
              {getTokenImageUrl(token) ? (
                <img
                  src={getTokenImageUrl(token)}
                  alt={token.name}
                  style={{
                    width: "48px",
                    height: "48px",
                  }}
                />
              ) : (
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    backgroundColor: "#c3c7cb",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {token.symbol?.substring(0, 2)}
                </div>
              )}
              <div>
                <div style={{ fontWeight: "bold" }}>{token.symbol}</div>
                <span
                  style={{
                    color: "#222",
                    fontSize: "14px",
                    marginRight: "8px",
                  }}
                >
                  <div>
                    创建于{" "}
                    {(() => {
                      console.log("Raw createdAt:", token.createdAt); // 添加日志
                      return formatDate(token.createdAt);
                    })()}
                  </div>
                </span>
              </div>
            </div>
            <div
              style={{
                background: "#ffffff",
                border: "2px solid #c3c7cb",
                padding: "12px",
                fontSize: "14px",
                color: "#222",
                lineHeight: "1.5",
              }}
            >
              {token.description || "暂无描述"}
            </div>
            <div
              style={{
                marginTop: "12px",
                fontSize: "14px",
                wordBreak: "break-all",
              }}
            >
              合约地址: {shortenAddress(token.tokenAddress)}
            </div>
          </WindowContent>
        </Window>
      );
    }

    return (
      <div
        {...commonProps}
        className="token-item-hover"
        style={{
          ...commonProps.style,
          border: "2px solid #c3c7cb",
          padding: "20px",
          background: "#ffffff",
          borderRadius: "0",
          boxShadow: "2px 2px 4px rgba(0, 0, 0, 0.1)",
          transition: "all 0.2s ease",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: "16px",
            gap: "16px",
          }}
        >
          {getTokenImageUrl(token) ? (
            <img
              src={getTokenImageUrl(token)}
              alt={token.name}
              style={{
                width: "64px",
                height: "64px",
                borderRadius: "0",
              }}
            />
          ) : (
            <div
              style={{
                width: "64px",
                height: "64px",
                backgroundColor: "#c3c7cb",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "24px",
              }}
            >
              {token.symbol?.substring(0, 2)}
            </div>
          )}
          <div>
            <strong
              style={{
                fontSize: "18px",
                display: "block",
                marginBottom: "4px",
              }}
            >
              {token.name}
            </strong>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <span
                style={{
                  backgroundColor: "#e0e0e0",
                  padding: "2px 6px",
                  borderRadius: "4px",
                  fontSize: "12px",
                }}
              >
                {token.symbol}
              </span>
            </div>
          </div>
        </div>
        <div
          style={{
            background: "#f0f0f0",
            padding: "16px",
            fontSize: "14px",
            color: "#444",
            lineHeight: "1.6",
            height: "80px",
            overflow: "hidden",
            textOverflow: "ellipsis",
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical",
          }}
        >
          {token.description || "暂无描述"}
        </div>
        <div
          style={{
            marginTop: "12px",
            fontSize: "12px",
            color: "#666",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <div>创建于 {formatDate(token.createdAt)}</div>
          <div>{shortenAddress(token.tokenAddress)}</div>
        </div>
      </div>
    );
  };

  const renderMobileView = () => (
    <div className="token-list-container">
      {/* 搜索区域 */}
      <div style={{ marginBottom: "20px", padding: "0 16px" }}>
        <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
          <TextField
            placeholder="搜索代币名称或地址..."
            value={keyword}
            onChange={handleSearchChange}
            style={{ flex: 1 }}
            onKeyPress={(e) => {
              if (e.key === "Enter") {
                handleSearch();
              }
            }}
          />
          <Button onClick={handleSearch}>搜索</Button>
          {searching && <Button onClick={handleCancelSearch}>取消</Button>}
        </div>
      </div>

      {loading && tokens.length === 0 ? (
        <div style={{ textAlign: "center", padding: "20px" }}>
          <div style={{ marginBottom: "10px" }}>
            <ProgressBar style={{ width: "100%" }} />
          </div>
          <div>加载中...</div>
        </div>
      ) : error ? (
        <div style={{ textAlign: "center", padding: "20px", color: "red" }}>
          {error}
        </div>
      ) : tokens.length === 0 ? (
        <div style={{ textAlign: "center", padding: "20px" }}>
          没有找到符合条件的代币
        </div>
      ) : (
        <ScrollView>
          <div style={{ padding: "8px" }}>
            {tokens.map((token) => renderTokenItem(token, true))}

            {/* 加载更多指示器 */}
            <div
              ref={loadMoreRef}
              style={{
                padding: "16px",
                textAlign: "center",
                height: "60px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "column",
              }}
            >
              {loadingMore ? (
                <div>
                  <ProgressBar
                    value={50}
                    style={{ width: "200px", margin: "0 auto 8px" }}
                  />
                  <div style={{ fontSize: "14px" }}>加载更多...</div>
                </div>
              ) : hasMore ? (
                <div style={{ color: "#888", fontSize: "14px" }}>
                  向下滑动加载更多 (第{currentPage + 1}/{totalPages}页)
                </div>
              ) : (
                <div style={{ color: "#888", fontSize: "14px" }}>
                  没有更多数据了 (已加载 {tokens.length} 条)
                </div>
              )}
            </div>
          </div>
        </ScrollView>
      )}
    </div>
  );

  const renderDesktopView = () => (
    <div className="token-list-container">
      {/* 搜索区域 */}
      <div style={{ marginBottom: "16px", padding: "0 16px" }}>
        <div style={{ display: "flex", gap: "16px" }}>
          <TextField
            placeholder="搜索代币名称或地址..."
            value={keyword}
            onChange={handleSearchChange}
            style={{ flex: 1 }}
            onKeyPress={(e) => {
              if (e.key === "Enter") {
                handleSearch();
              }
            }}
          />
          <Button onClick={handleSearch}>搜索</Button>
          {searching && <Button onClick={handleCancelSearch}>取消</Button>}
        </div>
      </div>

      {loading && tokens.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px" }}>
          <div style={{ marginBottom: "20px" }}>
            <ProgressBar
              value={33}
              style={{ width: "300px", margin: "0 auto" }}
            />
          </div>
          <div>加载中...</div>
        </div>
      ) : error ? (
        <div style={{ textAlign: "center", padding: "40px", color: "red" }}>
          {error}
        </div>
      ) : tokens.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px" }}>
          没有找到符合条件的代币
        </div>
      ) : (
        <ScrollView>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)", // 固定为2列
              gap: "16px",
              padding: "8px",
              paddingBottom: "50px",
            }}
          >
            {tokens.map((token) => renderTokenItem(token, false))}

            {/* 加载更多指示器 */}
            <div
              ref={loadMoreRef}
              style={{
                padding: "24px",
                textAlign: "center",
                height: "60px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "column",
                gridColumn: "1 / -1", // 确保指示器占据整行
              }}
            >
              {loadingMore ? (
                <div>
                  <ProgressBar
                    style={{ width: "300px", margin: "0 auto 12px" }}
                  />
                  <div style={{ fontSize: "16px" }}>加载更多...</div>
                </div>
              ) : hasMore ? (
                <div style={{ color: "#888", fontSize: "16px" }}>
                  向下滑动加载更多 (第{currentPage + 1}/{totalPages}页)
                </div>
              ) : (
                <div style={{ color: "#888", fontSize: "16px" }}>
                  没有更多数据了 (已加载 {tokens.length} 条)
                </div>
              )}
            </div>
          </div>
        </ScrollView>
      )}
    </div>
  );

  const inlineStyle = `
    .token-item-hover:hover {
      box-shadow: 3px 3px 6px rgba(0, 0, 0, 0.15);
      transform: translateY(-2px);
    }
    
    /* 添加全局底部边距 */
    .token-list-container {
      position: relative;
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
    }
    
    /* 确保token-list-container中的ScrollView占据剩余空间 */
    .token-list-container > div[class*="ScrollView__StyledScrollView"] {
      flex: 1;
      width: 100% !important;
      min-height: 0; /* 这很重要，确保flex子元素可以收缩 */
    }
    
    /* 防止任何其他元素产生滚动条，只保留ScrollView的滚动 */
    div[class*="WindowContent__StyledWindowContent"],
    div[class*="Window__StyledWindow"] {
      overflow: hidden !important;
    }
  `;

  // 设置主体不可滚动
  useEffect(() => {
    document.body.classList.add("body-no-scroll");
    return () => {
      document.body.classList.remove("body-no-scroll");
    };
  }, []);

  return (
    <>
      <style>{inlineStyle}</style>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
          width: "100%",
          position: "relative",
        }}
      >
        {isMobile ? renderMobileView() : renderDesktopView()}
        <ContextMenu />
        <CopySuccessWindow />
      </div>
    </>
  );
};
