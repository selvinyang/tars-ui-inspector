import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Stable unpacked-extension ID used by the local CSS collector. Vinext blocks
  // every non-local dev origin by default, so only this extension is allowed.
  allowedDevOrigins: ["mkkmglbjagilaopdopnockajmiafbcdp"],
};

export default nextConfig;
