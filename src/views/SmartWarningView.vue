<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import iconNavZndc from '@/assets/icons/nav/icon-nav-zndc.png'

const router = useRouter()
const isEmbedded = computed(() => window.self !== window.top)

const goBack = () => {
  router.push('/')
}

type AlertLevel = 'high' | 'medium' | 'low'
type AlertStatus = 'pending' | 'processing' | 'completed'

interface AlertItem {
  id: string
  level: AlertLevel
  title: string
  content: string
  time: string
  source: string
  status: AlertStatus
  location: string
}

interface RingData {
  label: string
  count: number
  percent: number
  color: string
}

interface BarData {
  label: string
  count: number
  width: number
  colorClass: string
  dotColor: string
}

const stats = [
  { label: '今日预警', value: 47, color: 'red', trend: '较昨日 +8' },
  { label: '高危预警', value: 6, color: 'orange', sub: '需立即处置', subColor: 'danger' },
  { label: '处置中', value: 12, color: 'blue', sub: '平均响应 3.2分钟' },
  { label: '已处置', value: 29, color: 'green', sub: '处置率 97.8%' },
]

const alerts = ref<AlertItem[]>([
  { id: 'a1', level: 'high', title: '群体性事件预警', content: '检测到XX区万达广场周边人群密度异常聚集，较常态增长340%，疑似未报备群体性活动', time: '3分钟前', source: '视频监控平台', status: 'pending', location: 'XX区万达广场' },
  { id: 'a2', level: 'high', title: '涉恐线索预警', content: '重点监控人员阿某今日出现在火车站区域，与已知涉恐关联人员有通话记录', time: '8分钟前', source: '公安大数据', status: 'pending', location: '火车站' },
  { id: 'a3', level: 'medium', title: '诈骗资金异动', content: '辖区居民李某账户向境外账户累计转账82万元，符合电信诈骗资金流特征', time: '15分钟前', source: '反诈系统', status: 'processing', location: '新城区' },
  { id: 'a4', level: 'high', title: '暴力犯罪预警', content: '有前科人员张某近日频繁出入XX小区，与该小区近期入室盗窃案时空重叠', time: '22分钟前', source: '公安大数据', status: 'pending', location: 'XX小区' },
  { id: 'a5', level: 'medium', title: '舆情风险预警', content: '微博/抖音平台出现"XX路执法冲突"相关话题，2小时内传播量超5万', time: '35分钟前', source: '舆情监测', status: 'processing', location: '线上' },
  { id: 'a6', level: 'low', title: '交通拥堵预警', content: '早高峰XX大道与XX路交汇口拥堵指数8.2，预计持续至9:30', time: '42分钟前', source: '高德地图', status: 'completed', location: 'XX大道' },
])

const filterLevel = ref<string>('high')
const filteredAlerts = computed(() => {
  if (filterLevel.value === 'all') return alerts.value
  return alerts.value.filter((a) => a.level === filterLevel.value)
})

const levelBadge: Record<AlertLevel, string> = { high: '高危', medium: '中危', low: '低危' }
const statusText: Record<AlertStatus, string> = { pending: '未处置', processing: '处置中', completed: '已处置' }

const ringData: RingData[] = [
  { label: '高危', count: 6, percent: 12.8, color: '#EF4444' },
  { label: '中危', count: 18, percent: 38.3, color: '#F59E0B' },
  { label: '低危', count: 23, percent: 48.9, color: '#3B82F6' },
]

const barData: BarData[] = [
  { label: '治安预警', count: 15, width: 31.9, colorClass: 'blue', dotColor: '#3B82F6' },
  { label: '刑事预警', count: 8, width: 17.0, colorClass: 'red', dotColor: '#EF4444' },
  { label: '交通预警', count: 10, width: 21.3, colorClass: 'orange', dotColor: '#F59E0B' },
  { label: '舆情预警', count: 9, width: 19.1, colorClass: 'purple', dotColor: '#8B5CF6' },
  { label: '反诈预警', count: 5, width: 10.6, colorClass: 'cyan', dotColor: '#06B6D4' },
]

const iconPaths: Record<string, string> = {
  bell: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9',
  warning: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
  clock: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
  check: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  location: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z',
  video: 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z',
  database: 'M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4',
  globe: 'M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9',
  map: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7',
  shield: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
  wifi: 'M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 011.06 0z',
  swap: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4',
  people: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
  money: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
}

const totalDots: [number, number][] = [[70,190],[170,155],[270,175],[370,100],[470,130],[570,85],[670,60]]
const highDots: [number, number][] = [[70,255],[170,245],[270,250],[370,225],[470,235],[570,220],[670,210]]

const getAlertIcon = (title: string): string => {
  if (title.includes('群体') || title.includes('聚集')) return iconPaths.people
  if (title.includes('涉恐')) return iconPaths.shield
  if (title.includes('诈骗') || title.includes('资金')) return iconPaths.money
  if (title.includes('暴力') || title.includes('犯罪')) return iconPaths.warning
  if (title.includes('舆情')) return iconPaths.globe
  if (title.includes('交通')) return iconPaths.swap
  return iconPaths.bell
}

const getSourceIcon = (source: string): string => {
  if (source.includes('视频')) return iconPaths.video
  if (source.includes('大数据') || source.includes('公安')) return iconPaths.database
  if (source.includes('舆情')) return iconPaths.globe
  if (source.includes('高德') || source.includes('地图')) return iconPaths.map
  if (source.includes('反诈')) return iconPaths.shield
  return iconPaths.database
}
</script>

<template>
  <div class="smart-warning-page">
    <!-- 页面头部 -->
    <header class="page-header">
      <div class="page-header-left">
        <button v-if="!isEmbedded" class="back-btn" type="button" @click="goBack">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
          <span>返回</span>
        </button>
        <div class="page-title-group">
          <span
            class="page-title-icon"
            :style="{ '--warning-icon': `url(${iconNavZndc})` }"
            aria-hidden="true"
          >
            <span class="page-title-icon-inner"></span>
          </span>
          <div>
            <h1 class="page-title">智能预警</h1>
            <p class="page-subtitle">实时监控预警信息，快速响应处置</p>
          </div>
        </div>
      </div>
    </header>

    <!-- 统计卡片 -->
    <section class="stats-section">
      <div class="stats-grid">
        <div v-for="(stat, i) in stats" :key="stat.label" class="stat-card" :style="{ animationDelay: `${(i + 1) * 0.1}s` }">
          <div class="stat-icon" :class="stat.color">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path v-if="stat.color === 'red'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="iconPaths.bell" />
              <path v-else-if="stat.color === 'orange'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="iconPaths.warning" />
              <path v-else-if="stat.color === 'blue'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="iconPaths.clock" />
              <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="iconPaths.check" />
            </svg>
            <span v-if="stat.color === 'red'" class="pulse-dot"></span>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stat.value }}</div>
            <div class="stat-label">{{ stat.label }}</div>
            <div v-if="stat.trend" class="stat-trend up">{{ stat.trend }}</div>
            <div v-if="stat.sub" class="stat-sub" :class="stat.subColor">{{ stat.sub }}</div>
          </div>
        </div>
      </div>
    </section>

    <!-- 预警流与态势概览 -->
    <section class="alert-overview-section">
      <div class="alert-overview-grid">
        <!-- 实时预警流 -->
        <div class="alert-stream">
          <div class="section-header">
            <h2 class="section-title">实时预警</h2>
            <div class="section-header-right">
              <div class="filter-tags">
                <span class="filter-tag" :class="{ active: filterLevel === 'all' }" @click="filterLevel = 'all'">全部</span>
                <span class="filter-tag danger" :class="{ active: filterLevel === 'high' }" @click="filterLevel = 'high'">高危</span>
                <span class="filter-tag warning" :class="{ active: filterLevel === 'medium' }" @click="filterLevel = 'medium'">中危</span>
                <span class="filter-tag info" :class="{ active: filterLevel === 'low' }" @click="filterLevel = 'low'">低危</span>
              </div>
            </div>
          </div>
          <div class="alert-list">
            <div
              v-for="(alert, i) in filteredAlerts"
              :key="alert.id"
              class="alert-card-item"
              :class="alert.level"
              :style="{ animationDelay: `${(i + 1) * 0.05}s` }"
            >
              <div class="alert-card-header">
                <div class="alert-type-info">
                  <div class="alert-type-icon" :class="alert.level">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="getAlertIcon(alert.title)" />
                    </svg>
                  </div>
                  <span class="alert-title">{{ alert.title }}</span>
                </div>
                <span class="alert-level-badge" :class="alert.level">{{ levelBadge[alert.level] }}</span>
              </div>
              <p class="alert-content">{{ alert.content }}</p>
              <div class="alert-meta">
                <span class="alert-meta-item">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="iconPaths.clock" /></svg>
                  {{ alert.time }}
                </span>
                <span class="alert-meta-item">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="getSourceIcon(alert.source)" /></svg>
                  {{ alert.source }}
                </span>
                <span class="alert-status" :class="alert.status">{{ statusText[alert.status] }}</span>
              </div>
              <div class="alert-footer">
                <span class="alert-location">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="iconPaths.location" /></svg>
                  {{ alert.location }}
                </span>
                <button class="alert-action-btn" :disabled="alert.status !== 'pending'">
                  {{ alert.status === 'completed' ? '已完成' : alert.status === 'processing' ? '处置中' : '立即处置' }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- 预警态势概览 -->
        <div class="alert-situation">
          <!-- 预警等级分布 -->
          <div class="situation-card">
            <div class="situation-card-header">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
              </svg>
              预警等级分布
            </div>
            <div class="ring-distribution">
              <div v-for="ring in ringData" :key="ring.label" class="ring-item">
                <div class="ring-chart">
                  <div class="ring-bg"></div>
                  <div class="ring-fill" :style="{ background: `conic-gradient(${ring.color} ${ring.percent}%, transparent ${ring.percent}%)` }"></div>
                  <div class="ring-center">
                    <span class="ring-value">{{ ring.count }}</span>
                    <span class="ring-label">条</span>
                  </div>
                </div>
                <div class="ring-info">
                  <div class="ring-info-title">{{ ring.label }}</div>
                  <div class="ring-info-percent">{{ ring.percent }}%</div>
                </div>
              </div>
            </div>
          </div>

          <!-- 预警类型分布 -->
          <div class="situation-card">
            <div class="situation-card-header">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              预警类型分布
            </div>
            <div class="bar-distribution">
              <div v-for="bar in barData" :key="bar.label" class="bar-item">
                <div class="bar-item-header">
                  <span class="bar-item-label">
                    <span class="bar-item-dot" :style="{ background: bar.dotColor }"></span>
                    {{ bar.label }}
                  </span>
                  <span class="bar-item-value">{{ bar.count }}条</span>
                </div>
                <div class="bar-item-track">
                  <div class="bar-item-fill" :class="bar.colorClass" :style="{ width: bar.width + '%' }"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 预警趋势分析 -->
    <section class="trend-section">
      <div class="section-header">
        <h2 class="section-title">预警趋势</h2>
        <div class="time-range-switch">
          <button class="time-range-btn">今日</button>
          <button class="time-range-btn active">7天</button>
          <button class="time-range-btn">30天</button>
        </div>
      </div>
      <div class="chart-container">
        <div class="trend-chart-area">
          <svg viewBox="0 0 720 320" preserveAspectRatio="xMidYMid meet">
            <defs>
              <linearGradient id="areaGradTotal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#3B82F6" stop-opacity="0.25" />
                <stop offset="100%" stop-color="#3B82F6" stop-opacity="0.02" />
              </linearGradient>
              <linearGradient id="areaGradHigh" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#EF4444" stop-opacity="0.15" />
                <stop offset="100%" stop-color="#EF4444" stop-opacity="0.02" />
              </linearGradient>
            </defs>
            <!-- Grid lines -->
            <line v-for="i in 5" :key="'g'+i" class="trend-grid-line" x1="50" x2="690" :y1="30 + (i-1)*55" :y2="30 + (i-1)*55" />
            <!-- Y labels -->
            <text v-for="(val, i) in ['50', '40', '30', '20', '10', '0']" :key="'y'+i" class="trend-axis-label" x="42" :y="35 + i*53" text-anchor="end">{{ val }}</text>
            <!-- Total area fill -->
            <path class="trend-area-total" d="M70,190 L170,155 L270,175 L370,100 L470,130 L570,85 L670,60 L670,290 L70,290 Z" fill="url(#areaGradTotal)" />
            <!-- High area fill -->
            <path class="trend-area-high" d="M70,255 L170,245 L270,250 L370,225 L470,235 L570,220 L670,210 L670,290 L70,290 Z" fill="url(#areaGradHigh)" />
            <!-- Total trend line -->
            <polyline class="trend-line-total" points="70,190 170,155 270,175 370,100 470,130 570,85 670,60" />
            <!-- High trend line -->
            <polyline class="trend-line-high" points="70,255 170,245 270,250 370,225 470,235 570,220 670,210" />
            <!-- Total dots -->
            <circle v-for="(pt, i) in totalDots" :key="'dt'+i" class="trend-dot-total" :cx="pt[0]" :cy="pt[1]" />
            <!-- High dots -->
            <circle v-for="(pt, i) in highDots" :key="'dh'+i" class="trend-dot-high" :cx="pt[0]" :cy="pt[1]" />
            <!-- X labels -->
            <text v-for="(label, i) in ['5/24', '5/25', '5/26', '5/27', '5/28', '5/29', '今日']" :key="'x'+i" class="trend-x-label" :class="{ 'today-label': label === '今日' }" :x="70 + i*100" y="312" text-anchor="middle">{{ label }}</text>
          </svg>
        </div>
        <div class="chart-legend">
          <div class="legend-item">
            <span class="legend-dot total"></span>
            总预警数
          </div>
          <div class="legend-item">
            <span class="legend-dot high"></span>
            高危预警
          </div>
        </div>
      </div>
    </section>

    <!-- 预警处置跟踪 -->
    <section class="tracking-section">
      <div class="section-header">
        <h2 class="section-title">预警处置跟踪</h2>
      </div>
      <div class="tracking-grid">
        <div v-for="(item, i) in [
          { title: '群体性事件预警', badge: '处理中', badgeClass: 'processing', steps: ['预警', '派发', '处置', '反馈'], activeStep: 2, officer: '王警官', time: '已处理 12分钟' },
          { title: '涉恐线索预警', badge: '处理中', badgeClass: 'processing', steps: ['预警', '派发', '处置', '反馈'], activeStep: 1, officer: '张警官', time: '已处理 8分钟' },
          { title: '诈骗资金异动', badge: '已完成', badgeClass: 'completed', steps: ['预警', '派发', '处置', '反馈'], activeStep: 4, officer: '李警官', time: '已完成 25分钟' },
          { title: '交通拥堵预警', badge: '已完成', badgeClass: 'completed', steps: ['预警', '派发', '处置', '反馈'], activeStep: 4, officer: '赵警官', time: '已完成 15分钟' },
        ]" :key="i" class="tracking-card" :style="{ animationDelay: `${(i + 1) * 0.1}s` }">
          <div class="tracking-header">
            <div class="tracking-title">
              {{ item.title }}
              <span class="tracking-badge" :class="item.badgeClass">{{ item.badge }}</span>
            </div>
          </div>
          <div class="progress-steps">
            <div v-for="(step, si) in item.steps" :key="si" class="step-item" :class="{ completed: si < item.activeStep, active: si === item.activeStep - 1 }">
              <div class="step-circle">{{ si < item.activeStep ? '✓' : si + 1 }}</div>
              <span class="step-label">{{ step }}</span>
            </div>
          </div>
          <div class="tracking-footer">
            <div class="tracking-officer">
              <div class="officer-avatar">{{ item.officer.charAt(0) }}</div>
              <span class="officer-name">{{ item.officer }}</span>
            </div>
            <span class="tracking-time">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="iconPaths.clock" /></svg>
              {{ item.time }}
            </span>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style>
html, body {
  height: 100%;
  margin: 0;
  overflow: hidden;
}
</style>

<style scoped>
.smart-warning-page {
  padding: 24px 32px;
  height: 100vh;
  overflow-y: auto;
  background: var(--app-bg-gradient);
}

/* ==================== 页面头部 ==================== */
.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 16px;
}
.page-header-left {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: var(--app-panel);
  color: var(--app-text-muted);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}
.back-btn:hover {
  background: var(--app-primary-softer);
  border-color: var(--app-border-hover);
  color: #3b82f6;
}
.back-btn svg {
  width: 16px;
  height: 16px;
}
.page-title-group {
  display: flex;
  align-items: center;
  gap: 10px;
}
.page-title-icon {
  width: 42px;
  height: 42px;
  display: grid;
  flex: 0 0 42px;
  place-items: center;
  border-radius: 12px;
  color: var(--app-primary, #3b82f6);
  background: var(--app-primary-soft, rgba(79, 124, 255, 0.12));
}
.page-title-icon-inner {
  width: 22px;
  height: 22px;
  display: inline-block;
  background: currentColor;
  mask: var(--warning-icon) center / contain no-repeat;
  -webkit-mask: var(--warning-icon) center / contain no-repeat;
}
.page-title {
  font-size: 22px;
  font-weight: 800;
  color: var(--app-text);
  margin: 0 0 2px 0;
  letter-spacing: -0.3px;
}
.page-subtitle {
  font-size: 13px;
  color: var(--app-text-muted);
  margin: 0;
}

/* Stats */
.stats-section { margin-bottom: 32px; }
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
}
.stat-card {
  background: #fff;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
  border: 1px solid #f3f4f6;
  position: relative;
  overflow: hidden;
  display: flex;
  gap: 16px;
  align-items: flex-start;
  animation: fadeInUp 0.5s ease forwards;
  opacity: 0;
  transition: all 0.3s ease;
}
.stat-card:hover { box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); transform: translateY(-4px); }
.stat-icon {
  width: 56px; height: 56px;
  border-radius: 14px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
  position: relative;
}
.stat-icon svg { width: 28px; height: 28px; }
.stat-icon.red { background: linear-gradient(135deg, rgba(239,68,68,0.15), rgba(239,68,68,0.25)); color: #EF4444; }
.stat-icon.orange { background: linear-gradient(135deg, rgba(245,158,11,0.15), rgba(245,158,11,0.25)); color: #F59E0B; }
.stat-icon.blue { background: linear-gradient(135deg, rgba(59,130,246,0.15), rgba(59,130,246,0.25)); color: #3B82F6; }
.stat-icon.green { background: linear-gradient(135deg, rgba(16,185,129,0.15), rgba(16,185,129,0.25)); color: #10B981; }
.stat-content { flex: 1; position: relative; }
.stat-value { font-size: 32px; font-weight: 700; color: #1f2937; line-height: 1.2; }
.stat-label { font-size: 14px; color: #6b7280; margin-top: 4px; }
.stat-trend {
  position: absolute; top: 0; right: 0;
  display: flex; align-items: center; gap: 4px;
  font-size: 13px; font-weight: 600;
  padding: 4px 10px; border-radius: 20px;
}
.stat-trend.up { background: rgba(16,185,129,0.1); color: #10B981; }
.stat-sub { font-size: 12px; color: #6b7280; margin-top: 6px; }
.stat-sub.danger { color: #EF4444; font-weight: 600; }
.pulse-dot {
  position: absolute; top: 8px; right: 8px;
  width: 10px; height: 10px;
  background: #EF4444; border-radius: 50%;
}
.pulse-dot::before {
  content: ''; position: absolute;
  top: 50%; left: 50%; transform: translate(-50%,-50%);
  width: 100%; height: 100%;
  background: #EF4444; border-radius: 50%;
  animation: pulse 2s ease-in-out infinite;
}
@keyframes pulse {
  0% { transform: translate(-50%,-50%) scale(1); opacity: 1; }
  100% { transform: translate(-50%,-50%) scale(3); opacity: 0; }
}

/* Section */
.section-header {
  display: flex; align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}
.section-title { font-size: 20px; font-weight: 700; color: #1f2937; }
.section-header-right { display: flex; align-items: center; gap: 16px; }

/* Filter Tags */
.filter-tags { display: flex; gap: 8px; }
.filter-tag {
  padding: 6px 14px;
  border: 1px solid #e5e7eb;
  background: #fff;
  border-radius: 20px;
  font-size: 13px; font-weight: 500;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s;
}
.filter-tag:hover { border-color: #3B82F6; color: #3B82F6; }
.filter-tag.active { background: #3B82F6; border-color: #3B82F6; color: #fff; }
.filter-tag.danger.active { background: #EF4444; border-color: #EF4444; }
.filter-tag.warning.active { background: #F59E0B; border-color: #F59E0B; }
.filter-tag.info.active { background: #3B82F6; border-color: #3B82F6; }

/* Time Range */
.time-range-switch {
  display: flex; gap: 4px;
  background: #f3f4f6; padding: 4px;
  border-radius: 10px;
}
.time-range-btn {
  padding: 8px 16px; border: none;
  border-radius: 8px; font-size: 13px; font-weight: 500;
  cursor: pointer; transition: all 0.2s;
  background: transparent; color: #4b5563;
}
.time-range-btn:hover { color: #1f2937; }
.time-range-btn.active { background: #fff; color: #3B82F6; box-shadow: 0 2px 6px rgba(0,0,0,0.08); }

/* Alert Overview */
.alert-overview-section { margin-bottom: 36px; }
.alert-overview-grid {
  display: grid;
  grid-template-columns: 3fr 2fr;
  gap: 24px;
  align-items: start;
}

/* Alert Stream */
.alert-stream {
  background: #fff;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
  border: 1px solid #f3f4f6;
}
.alert-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-height: 497px;
}
.alert-card-item {
  background: #fff;
  border-radius: 12px;
  padding: 18px;
  border: 1px solid #f3f4f6;
  transition: all 0.3s ease;
  position: relative;
  cursor: pointer;
  animation: fadeInUp 0.5s ease forwards;
  opacity: 0;
}
.alert-card-item:hover { box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); transform: translateX(4px); }
.alert-card-item::before {
  content: ''; position: absolute;
  left: 0; top: 0; bottom: 0; width: 4px;
}
.alert-card-item.high::before { background: #EF4444; }
.alert-card-item.medium::before { background: #F59E0B; }
.alert-card-item.low::before { background: #3B82F6; }
.alert-card-item.high { animation: dangerPulse 3s ease-in-out infinite, fadeInUp 0.5s ease forwards; }
@keyframes dangerPulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0); }
  50% { box-shadow: 0 0 0 4px rgba(239,68,68,0.1); }
}

.alert-card-header {
  display: flex; align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}
.alert-type-info { display: flex; align-items: center; gap: 10px; }
.alert-type-icon {
  width: 36px; height: 36px;
  border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
}
.alert-type-icon svg { width: 20px; height: 20px; }
.alert-type-icon.high { background: rgba(239,68,68,0.1); color: #EF4444; }
.alert-type-icon.medium { background: rgba(245,158,11,0.1); color: #F59E0B; }
.alert-type-icon.low { background: rgba(59,130,246,0.1); color: #3B82F6; }
.alert-title { font-size: 15px; font-weight: 600; color: #1f2937; }
.alert-level-badge {
  padding: 4px 10px; border-radius: 12px;
  font-size: 11px; font-weight: 600;
}
.alert-level-badge.high { background: rgba(239,68,68,0.1); color: #EF4444; }
.alert-level-badge.medium { background: rgba(245,158,11,0.1); color: #F59E0B; }
.alert-level-badge.low { background: rgba(59,130,246,0.1); color: #3B82F6; }
.alert-content { font-size: 13px; color: #4b5563; line-height: 1.6; margin-bottom: 12px; }
.alert-meta { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; margin-bottom: 12px; }
.alert-meta-item {
  display: flex; align-items: center; gap: 5px;
  font-size: 12px; color: #9ca3af;
}
.alert-meta-item svg { width: 14px; height: 14px; }
.alert-status {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 3px 10px; border-radius: 12px;
  font-size: 11px; font-weight: 600;
}
.alert-status.pending { background: #f3f4f6; color: #4b5563; }
.alert-status.processing { background: rgba(59,130,246,0.1); color: #3B82F6; }
.alert-status.completed { background: rgba(16,185,129,0.1); color: #10B981; }
.alert-footer {
  display: flex; align-items: center;
  justify-content: space-between;
  padding-top: 12px;
  border-top: 1px solid #f3f4f6;
}
.alert-location {
  display: flex; align-items: center; gap: 6px;
  font-size: 13px; color: #6b7280;
}
.alert-location svg { width: 16px; height: 16px; color: #9ca3af; }
.alert-action-btn {
  padding: 6px 14px;
  background: #3B82F6; color: #fff;
  border: none; border-radius: 8px;
  font-size: 12px; font-weight: 600;
  cursor: pointer; transition: all 0.2s;
}
.alert-action-btn:hover { background: #2563EB; transform: scale(1.05); }
.alert-action-btn:disabled { background: #d1d5db; cursor: not-allowed; }

/* Situation */
.alert-situation { display: flex; flex-direction: column; gap: 20px; }
.situation-card {
  background: #fff;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
  border: 1px solid #f3f4f6;
  animation: fadeInUp 0.5s ease forwards;
  opacity: 0;
}
.situation-card:nth-child(1) { animation-delay: 0.2s; }
.situation-card:nth-child(2) { animation-delay: 0.3s; }
.situation-card-header {
  font-size: 16px; font-weight: 700;
  color: #1f2937; margin-bottom: 20px;
  display: flex; align-items: center; gap: 8px;
}
.situation-card-header svg { width: 20px; height: 20px; color: #3B82F6; }

/* Ring Charts */
.ring-distribution {
  display: flex; justify-content: space-around;
  align-items: center; gap: 16px;
}
.ring-item { display: flex; flex-direction: column; align-items: center; gap: 12px; }
.ring-chart { position: relative; width: 90px; height: 90px; }
.ring-bg {
  position: absolute; top: 0; left: 0;
  width: 100%; height: 100%;
  border-radius: 50%; background: #f3f4f6;
}
.ring-fill {
  position: absolute; top: 0; left: 0;
  width: 100%; height: 100%;
  border-radius: 50%;
  transition: all 1.5s ease;
}
.ring-center {
  position: absolute; top: 50%; left: 50%;
  transform: translate(-50%,-50%);
  width: 60px; height: 60px;
  border-radius: 50%; background: #fff;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
}
.ring-value { font-size: 18px; font-weight: 700; color: #1f2937; }
.ring-label { font-size: 10px; color: #6b7280; }
.ring-info { text-align: center; }
.ring-info-title { font-size: 14px; font-weight: 600; color: #1f2937; margin-bottom: 2px; }
.ring-info-percent { font-size: 12px; color: #6b7280; }

/* Bar Distribution */
.bar-distribution { display: flex; flex-direction: column; gap: 14px; }
.bar-item { display: flex; flex-direction: column; gap: 6px; }
.bar-item-header { display: flex; justify-content: space-between; align-items: center; }
.bar-item-label { font-size: 13px; color: #4b5563; display: flex; align-items: center; gap: 8px; }
.bar-item-dot { width: 8px; height: 8px; border-radius: 50%; }
.bar-item-value { font-size: 13px; font-weight: 600; color: #374151; }
.bar-item-track { height: 8px; background: #f3f4f6; border-radius: 4px; overflow: hidden; }
.bar-item-fill { height: 100%; border-radius: 4px; transition: width 1s ease; }
.bar-item-fill.blue { background: linear-gradient(90deg, #3B82F6, #60A5FA); }
.bar-item-fill.red { background: linear-gradient(90deg, #EF4444, #F87171); }
.bar-item-fill.orange { background: linear-gradient(90deg, #F59E0B, #FBBF24); }
.bar-item-fill.purple { background: linear-gradient(90deg, #8B5CF6, #A78BFA); }
.bar-item-fill.cyan { background: linear-gradient(90deg, #06B6D4, #22D3EE); }

/* Trend Chart */
.trend-section { margin-bottom: 36px; }
.chart-container {
  background: #fff;
  border-radius: 16px;
  padding: 24px 28px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
  border: 1px solid #f3f4f6;
}
.trend-chart-area { position: relative; height: 340px; margin-top: 8px; display: flex; align-items: center; justify-content: center; }
.trend-chart-area svg { width: 100%; height: 100%; display: block; }
.trend-grid-line { stroke: #f3f4f6; stroke-width: 1; stroke-dasharray: 4 4; }
.trend-axis-label { font-size: 11px; fill: #9ca3af; font-weight: 500; }
.trend-x-label { font-size: 12px; fill: #6b7280; font-weight: 500; }
.trend-x-label.today-label { fill: #3B82F6; font-weight: 700; }
.trend-line-total { fill: none; stroke: #3B82F6; stroke-width: 2.5; stroke-linecap: round; stroke-linejoin: round; }
.trend-line-high { fill: none; stroke: #EF4444; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; stroke-dasharray: 6 3; }
.trend-dot-total { fill: #fff; stroke: #3B82F6; stroke-width: 2.5; r: 4; }
.trend-dot-high { fill: #fff; stroke: #EF4444; stroke-width: 2; r: 3.5; }
.chart-legend {
  display: flex; justify-content: center; gap: 24px;
  margin-top: 16px; padding-top: 16px;
  border-top: 1px solid #f3f4f6;
}
.legend-item { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #4b5563; }
.legend-dot { width: 12px; height: 12px; border-radius: 4px; }
.legend-dot.total { background: linear-gradient(180deg, #3B82F6, rgba(59,130,246,0.6)); }
.legend-dot.high { background: #EF4444; }

/* Tracking */
.tracking-section { margin-bottom: 40px; }
.tracking-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
}
.tracking-card {
  background: #fff;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
  border: 1px solid #f3f4f6;
  transition: all 0.3s ease;
  animation: fadeInUp 0.5s ease forwards;
  opacity: 0;
}
.tracking-card:hover { box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); transform: translateY(-4px); }
.tracking-header {
  display: flex; align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}
.tracking-title {
  font-size: 15px; font-weight: 600; color: #1f2937;
  display: flex; align-items: center; gap: 10px;
}
.tracking-badge { padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; }
.tracking-badge.completed { background: rgba(16,185,129,0.1); color: #10B981; }
.tracking-badge.processing { background: rgba(59,130,246,0.1); color: #3B82F6; }

/* Progress Steps */
.progress-steps { display: flex; align-items: center; margin-bottom: 16px; }
.step-item {
  flex: 1; display: flex; flex-direction: column;
  align-items: center; position: relative;
}
.step-item:not(:last-child)::after {
  content: ''; position: absolute;
  top: 14px; left: 50%;
  width: 100%; height: 3px;
  background: #e5e7eb; z-index: 0;
}
.step-item.completed:not(:last-child)::after { background: #10B981; }
.step-circle {
  width: 28px; height: 28px;
  border-radius: 50%;
  background: #e5e7eb;
  display: flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 600;
  color: #6b7280;
  position: relative; z-index: 1;
  transition: all 0.3s ease;
}
.step-item.completed .step-circle { background: #10B981; color: #fff; }
.step-item.active .step-circle {
  background: #3B82F6; color: #fff;
  box-shadow: 0 0 0 4px rgba(59,130,246,0.2);
}
.step-label { margin-top: 8px; font-size: 12px; color: #6b7280; }
.step-item.completed .step-label { color: #10B981; }
.step-item.active .step-label { color: #3B82F6; font-weight: 600; }

.tracking-footer {
  display: flex; justify-content: space-between;
  align-items: center;
  padding-top: 12px;
  border-top: 1px solid #f3f4f6;
}
.tracking-officer { display: flex; align-items: center; gap: 8px; }
.officer-avatar {
  width: 28px; height: 28px;
  border-radius: 50%;
  background: linear-gradient(135deg, #3B82F6, #2563EB);
  display: flex; align-items: center; justify-content: center;
  color: #fff; font-size: 11px; font-weight: 600;
}
.officer-name { font-size: 13px; color: #374151; }
.tracking-time {
  font-size: 12px; color: #6b7280;
  display: flex; align-items: center; gap: 4px;
}
.tracking-time svg { width: 14px; height: 14px; }

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (max-width: 1400px) {
  .stats-grid { grid-template-columns: repeat(2, 1fr); }
  .alert-overview-grid { grid-template-columns: 1fr; }
}
@media (max-width: 1200px) {
  .tracking-grid { grid-template-columns: 1fr; }
}
@media (max-width: 768px) {
  .smart-warning-page { padding: 16px; }
  .stats-grid { grid-template-columns: 1fr; }
  .section-header { flex-direction: column; align-items: flex-start; gap: 12px; }
  .ring-distribution { flex-direction: column; }
}
</style>

<style>
/* ==================== 深色模式适配 ==================== */
:root[data-theme='dark'] .smart-warning-page {
  background: var(--app-bg-gradient);
}

:root[data-theme='dark'] .section-title { color: var(--app-text); }

:root[data-theme='dark'] .stat-card {
  background: var(--app-panel);
  border-color: var(--app-border);
}
:root[data-theme='dark'] .stat-value { color: var(--app-text); }
:root[data-theme='dark'] .stat-label { color: var(--app-text-muted); }

:root[data-theme='dark'] .alert-stream,
:root[data-theme='dark'] .alert-card-item {
  background: var(--app-panel);
  border-color: var(--app-border);
}
:root[data-theme='dark'] .alert-title { color: var(--app-text); }
:root[data-theme='dark'] .alert-content { color: var(--app-text-muted); }
:root[data-theme='dark'] .alert-card-item:hover { box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3); }
:root[data-theme='dark'] .alert-footer { border-top-color: var(--app-border); }
:root[data-theme='dark'] .alert-location { color: var(--app-text-muted); }
:root[data-theme='dark'] .alert-meta-item { color: var(--app-text-subtle); }
:root[data-theme='dark'] .alert-status.pending { background: var(--app-panel-muted); color: var(--app-text-muted); }

:root[data-theme='dark'] .filter-tag {
  background: var(--app-panel-muted);
  border-color: var(--app-border);
  color: var(--app-text-muted);
}

:root[data-theme='dark'] .time-range-switch { background: var(--app-panel-muted); }
:root[data-theme='dark'] .time-range-btn { color: var(--app-text-muted); }
:root[data-theme='dark'] .time-range-btn:hover { color: var(--app-text); }
:root[data-theme='dark'] .time-range-btn.active { background: var(--app-panel); color: var(--app-primary); }

:root[data-theme='dark'] .situation-card,
:root[data-theme='dark'] .chart-container {
  background: var(--app-panel);
  border-color: var(--app-border);
}
:root[data-theme='dark'] .situation-card-header { color: var(--app-text); }
:root[data-theme='dark'] .ring-bg { background: var(--app-panel-muted); }
:root[data-theme='dark'] .ring-center { background: var(--app-panel); }
:root[data-theme='dark'] .ring-value { color: var(--app-text); }
:root[data-theme='dark'] .ring-info-title { color: var(--app-text); }
:root[data-theme='dark'] .ring-info-percent { color: var(--app-text-muted); }
:root[data-theme='dark'] .bar-item-label { color: var(--app-text-muted); }
:root[data-theme='dark'] .bar-item-value { color: var(--app-text); }
:root[data-theme='dark'] .bar-item-track { background: var(--app-panel-muted); }
:root[data-theme='dark'] .trend-grid-line { stroke: var(--app-border); }
:root[data-theme='dark'] .trend-axis-label { fill: var(--app-text-subtle); }
:root[data-theme='dark'] .trend-x-label { fill: var(--app-text-muted); }
:root[data-theme='dark'] .chart-legend { border-top-color: var(--app-border); }
:root[data-theme='dark'] .legend-item { color: var(--app-text-muted); }

:root[data-theme='dark'] .tracking-card {
  background: var(--app-panel);
  border-color: var(--app-border);
}
:root[data-theme='dark'] .tracking-title { color: var(--app-text); }
:root[data-theme='dark'] .tracking-footer { border-top-color: var(--app-border); }
:root[data-theme='dark'] .officer-name { color: var(--app-text); }
:root[data-theme='dark'] .tracking-time { color: var(--app-text-muted); }
:root[data-theme='dark'] .step-circle { background: var(--app-panel-muted); color: var(--app-text-muted); }
:root[data-theme='dark'] .step-item:not(:last-child)::after { background: var(--app-border); }
:root[data-theme='dark'] .step-label { color: var(--app-text-muted); }
:root[data-theme='dark'] .alert-action-btn:disabled { background: var(--app-panel-muted); }
</style>
