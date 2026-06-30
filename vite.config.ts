// vite.config.ts
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig(({ mode }) => {
  // 加载环境变量
  const env = loadEnv(mode, process.cwd(), '')

  return {
    publicDir: 'public', // 确保这个配置存在
    plugins: [
      vue({
        template: {
          compilerOptions: {
            isCustomElement: (tag) => tag === 'micro-app',
          },
        },
      }),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    build: {
      // ✅ 关键配置：禁用 base64 内联，所有图片资源都作为独立文件打包
      // 原因：避免内网环境中 base64 导致的兼容性问题、JS 文件体积过大和缓存策略失效
      assetsInlineLimit: 0,

      // ✅ 确保静态资源输出到独立目录
      assetsDir: 'assets',

      // ✅ 生成稳定的文件名（包含 hash）
      rollupOptions: {
        output: {
          assetFileNames: 'assets/[name].[hash][extname]',
        },
      },
    },
    server: {
      port: 5173,
      proxy: {
        // 🔑 关键：使用正则表达式 + 精确匹配（避免 /apiaixxx 误匹配）
        '^/apiAI(/.*)?$': {
          target: env.VITE_CHAT_API_BASE || 'http://192.168.124.7:18789',
          changeOrigin: true,
          secure: false,
          // ✨ 重写逻辑：保留单斜杠，避免空路径问题
          rewrite: (path) => path.replace(/^\/apiAI(?:\/|$)/, '/'),
        },
        // ✅ 新增：聊天 API 代理
        '^/chatApi(/.*)?$': {
          target: 'http://10.32.71.223:19000',
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/chatApi/, ''),
        },
        // ✅ 本地 API 代理（用于登录等接口）
        '^/localApi(/.*)?$': {
          target: 'http://192.168.124.6:19000',
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/localApi/, ''),
        },
        '^/qbpt(/.*)?$': {
          target: env.VITE_QBPT_PROXY_TARGET || 'https://50.18.22.180:815',
          changeOrigin: true,
          secure: false,
        },
        '^/authApi(/.*)?$': {
          target: 'http://10.32.71.224:8080',
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/authApi/, ''),
        },
      },
    },
  }
})
