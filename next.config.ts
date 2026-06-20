import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.29.5", "localhost", "192.168.1.0/24", "192.168.29.0/24"],
};

export default nextConfig;
