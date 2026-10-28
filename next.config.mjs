/** @type {import('next').NextConfig} */
if (!process.env.NEXT_TEST_WASM_DIR) {
  process.env.NEXT_TEST_WASM_DIR = 'node_modules/@next/swc-wasm-nodejs';
}

const nextConfig = {
  reactStrictMode: false,
};

export default nextConfig;
