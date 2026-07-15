import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import App from './App.vue'
import router from './router'
import { initTheme, refreshTheme } from '@/composables/useTheme'
import { initEmojiFallbackHandler } from '@/utils/emojiConverter'
import 'element-plus/dist/index.css'
import 'element-plus/theme-chalk/dark/css-vars.css'
import './assets/main.css'

const app = createApp(App)
const pinia = createPinia()

for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

initEmojiFallbackHandler()
initTheme()
// 生产环境过滤 ElementPlus 的控制台警告
if (import.meta.env.PROD) {
  app.config.warnHandler = () => {}
  app.config.errorHandler = () => {}
}

app.use(pinia)
app.use(router)
app.use(ElementPlus, { locale: zhCn })

app.mount('#app')
refreshTheme()
