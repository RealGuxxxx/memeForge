/** @type {import('next').NextConfig} */
const nextConfig = {
  /* 配置选项 */
  reactStrictMode: true,
  compiler: {
    styledComponents: true,
  },
  async rewrites() {
    // 为 API URL 提供默认值，防止未定义时出错
    const userApiBaseUrl =
      process.env.NEXT_PUBLIC_USER_API_BASE_URL || "http://43.163.81.86:8081";
    const tokenApiBaseUrl =
      process.env.NEXT_PUBLIC_TOKEN_API_BASE_URL ||
      "http://43.163.81.86:8082";
    const transactionApiBaseUrl =
      process.env.NEXT_PUBLIC_TRANSACTION_API_BASE_URL ||
      "http://43.163.81.86:8083";

    console.log("API URLs:", {
      userApiBaseUrl,
      tokenApiBaseUrl,
      transactionApiBaseUrl,
    });

    return [
      {
        source: "/api/user/:path*",
        destination: `${userApiBaseUrl}/:path*`,
      },
      {
        source: "/api/token/:path*",
        destination: `${tokenApiBaseUrl}/:path*`,
      },
      {
        source: "/api/transaction/:path*",
        destination: `${transactionApiBaseUrl}/:path*`,
      },
    ];
  },
  images: {
    domains: ["43.163.81.86"],
  },
};

module.exports = nextConfig;
