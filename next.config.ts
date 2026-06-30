import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // A captured shot is a JSON pose sequence (frames × keypoints), which
      // overruns the 1 MB Server Action default for longer recordings.
      bodySizeLimit: "8mb",
    },
  },
};

export default nextConfig;
