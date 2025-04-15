"use client";

import { Window, WindowHeader, WindowContent, Panel } from "react95";
import { WalletConnectButton } from "./WalletConnectButton";

interface ConnectWalletPromptProps {
  title?: string;
  message?: string;
  description?: string;
}

export const ConnectWalletPrompt = ({
  title = "连接钱包",
  message = "请先连接钱包以访问功能",
  description = "连接钱包后，您可以创建自己的代币并参与交易",
}: ConnectWalletPromptProps) => {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "calc(100vh - 60px)", // 减去顶部导航栏的高度
        width: "100%",
        padding: "0 16px",
      }}
    >
      <Window
        style={{
          width: "100%",
          maxWidth: "500px",
          boxShadow: "0 4px 10px rgba(0, 0, 0, 0.2)",
        }}
      >
        <WindowHeader
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "#000080",
            color: "white",
          }}
        >
          <span style={{ fontSize: "15px", fontWeight: "bold" }}>{title}</span>
          <div style={{ display: "flex", gap: "4px" }}>
            <div
              style={{
                width: "12px",
                height: "12px",
                background: "#dfdfdf",
                border: "1px solid #858585",
              }}
            ></div>
            <div
              style={{
                width: "12px",
                height: "12px",
                background: "#dfdfdf",
                border: "1px solid #858585",
              }}
            ></div>
            <div
              style={{
                width: "12px",
                height: "12px",
                background: "#dfdfdf",
                border: "1px solid #858585",
              }}
            ></div>
          </div>
        </WindowHeader>
        <WindowContent style={{ padding: "24px", backgroundColor: "#efefef" }}>
          <Panel
            variant="well"
            style={{
              padding: "24px",
              textAlign: "center",
              marginBottom: "20px",
              backgroundColor: "#f0f0f0",
              border: "1px solid #aaa",
            }}
          >
            <div style={{ fontSize: "18px", marginBottom: "16px" }}>
              {message}
            </div>
            <div
              style={{
                fontSize: "14px",
                color: "#555",
                marginBottom: "24px",
              }}
            >
              {description}
            </div>
            <WalletConnectButton />
          </Panel>
        </WindowContent>
      </Window>
    </div>
  );
};
