<template>
  <main class="expert-center">
    <section class="expert-recommend-grid">
      <article
        v-for="section in recommendationSections"
        :key="section.title"
        class="expert-recommend-card"
        :class="`expert-recommend-card--${section.theme}`"
      >
        <div class="expert-recommend-card__header">
          <h2>{{ section.title }}</h2>
          <p>{{ section.subtitle }}</p>
        </div>
        <ul class="expert-rank-list">
          <li v-for="(item, index) in section.items" :key="`${section.title}-${item.name}`">
            <span class="expert-rank-number" :class="`expert-rank-number--${index + 1}`">
              {{ index + 1 }}
            </span>
            <span class="expert-rank-icon" :class="`expert-rank-icon--${item.color}`">
              {{ item.icon }}
            </span>
            <span class="expert-rank-name">{{ item.name }}</span>
          </li>
        </ul>
      </article>
    </section>

    <section class="expert-toolbar">
      <div class="expert-toolbar__left">
        <span class="expert-toolbar__label">部门分类：</span>
        <div class="expert-category-list">
          <button
            v-for="category in categories"
            :key="category"
            class="expert-category"
            :class="{ 'expert-category--active': selectedCategory === category }"
            type="button"
            @click="selectedCategory = category"
          >
            {{ category }}
          </button>
        </div>
      </div>
      <div class="expert-search">
        <svg class="expert-search__icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input v-model="searchKeyword" type="text" placeholder="搜索专家、团队或技能..." />
      </div>
    </section>

    <section class="expert-section">
      <div class="expert-section__header">
        <h3>核心专家岗位</h3>
        <button class="expert-more" type="button" @click="expertExpanded = !expertExpanded">
          {{ expertExpanded ? '收起' : '查看更多' }}
          <svg class="expert-more__icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <div v-if="visibleExperts.length" class="expert-grid">
        <article v-for="item in visibleExperts" :key="item.id" class="expert-card">
          <span class="expert-status" :class="`expert-status--${item.statusType}`">
            {{ item.status }}
          </span>
          <div>
            <div class="expert-icon" :class="`expert-icon--${item.accent}`">
              <component :is="item.icon" />
            </div>
            <h4>{{ item.name }}</h4>
            <p>{{ item.description }}</p>
            <div class="expert-tags">
              <span v-for="tag in item.tags" :key="tag">{{ tag }}</span>
            </div>
          </div>
          <div class="expert-card__footer">
            <span>{{ item.usage }} 次调用</span>
            <button class="expert-use" type="button" @click="useExpert(item)">立即使用</button>
          </div>
        </article>
      </div>
      <div v-else class="expert-empty">暂无匹配专家</div>
    </section>

    <section class="expert-section">
      <div class="expert-section__header">
        <h3>专项作战团队</h3>
        <button class="expert-more" type="button" @click="teamExpanded = !teamExpanded">
          {{ teamExpanded ? '收起' : '查看更多' }}
          <svg class="expert-more__icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <div v-if="visibleTeams.length" class="expert-grid expert-grid--teams">
        <article v-for="item in visibleTeams" :key="item.id" class="expert-card">
          <span class="expert-status" :class="`expert-status--${item.statusType}`">
            {{ item.status }}
          </span>
          <div>
            <div class="expert-icon" :class="`expert-icon--${item.accent}`">
              <component :is="item.icon" />
            </div>
            <h4>{{ item.name }}</h4>
            <p>{{ item.description }}</p>
            <div class="expert-tags">
              <span v-for="tag in item.tags" :key="tag">{{ tag }}</span>
            </div>
          </div>
          <div class="expert-card__footer">
            <div class="expert-team-members">
              <div class="expert-avatar-list">
                <span v-for="member in item.members" :key="member">{{ member }}</span>
              </div>
              <em>等 {{ item.memberCount }}名成员</em>
            </div>
            <span class="expert-views">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
              {{ item.views }}
            </span>
          </div>
        </article>
      </div>
      <div v-else class="expert-empty">暂无匹配团队</div>
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, ref } from 'vue'
import { ElMessage } from 'element-plus'

type ExpertItemType = 'expert' | 'team'
type StatusType = 'online' | 'standby'

interface ExpertCenterItem {
  id: string
  type: ExpertItemType
  name: string
  department: string
  description: string
  tags: string[]
  status: string
  statusType: StatusType
  accent: 'blue' | 'orange' | 'green' | 'indigo' | 'teal'
  icon: ReturnType<typeof createSvgIcon>
  usage?: string
  views?: string
  members?: string[]
  memberCount?: number
}

const createSvgIcon = (path: string) =>
  defineComponent({
    setup() {
      return () =>
        h('svg', { fill: 'currentColor', viewBox: '0 0 24 24' }, [
          h('path', { d: path }),
        ])
    },
  })

const schoolIcon = createSvgIcon(
  'M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3zm6.82 6L12 12.72 5.18 9 12 5.28 18.82 9zM17 15.99l-5 2.73-5-2.73v-3.72L12 15l5-2.73v3.72z',
)
const documentIcon = createSvgIcon(
  'M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z',
)
const taskIcon = createSvgIcon(
  'M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm-2 14l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z',
)
const messageIcon = createSvgIcon(
  'M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z',
)
const chartIcon = createSvgIcon(
  'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z',
)

const categories = ['全部', '情报指挥', '刑侦支队', '网安大队', '治安管理', '交通管理']
const selectedCategory = ref('全部')
const searchKeyword = ref('')
const expertExpanded = ref(false)
const teamExpanded = ref(false)
const initialVisibleCount = 3
const recommendationSections = [
  {
    title: '为你推荐',
    subtitle: 'Personalized Selection',
    theme: 'red',
    items: [
      { name: '舆情导控专班', icon: '👨‍✈️', color: 'blue' },
      { name: '舆情导控专班', icon: '🤖', color: 'green' },
      { name: '情报研判专家', icon: '🎯', color: 'red' },
    ],
  },
  {
    title: '热门精选',
    subtitle: 'Popular Now',
    theme: 'yellow',
    items: [
      { name: '指令下发专员', icon: '📈', color: 'blue-soft' },
      { name: '反诈资金流研判组', icon: '资', color: 'gray' },
      { name: '情报研判专家', icon: '🏢', color: 'indigo' },
    ],
  },
  {
    title: '最近上新',
    subtitle: 'New Arrivals',
    theme: 'blue',
    items: [
      { name: '警情分析师', icon: '🚨', color: 'red-soft' },
      { name: '舆情导控专班', icon: '🧬', color: 'purple' },
      { name: '任务盯办助手', icon: '📄', color: 'gray' },
    ],
  },
]

const items: ExpertCenterItem[] = [
  {
    id: 'intelligence-analysis',
    type: 'expert',
    name: '情报研判专家',
    department: '情报指挥',
    description: '多源数据融合分析，自动关联人、车、案、物线索，生成研判报告。',
    tags: ['情报分析', '关联图谱'],
    status: '在线',
    statusType: 'online',
    accent: 'blue',
    icon: schoolIcon,
    usage: '12.5k',
  },
  {
    id: 'command-dispatch',
    type: 'expert',
    name: '指令下发专员',
    department: '情报指挥',
    description: '根据预案自动生成调度指令，精准触达一线警力，追踪反馈闭环。',
    tags: ['指挥调度', '自动化'],
    status: '在线',
    statusType: 'online',
    accent: 'orange',
    icon: documentIcon,
    usage: '12.5k',
  },
  {
    id: 'task-supervision',
    type: 'expert',
    name: '任务盯办助手',
    department: '情报指挥',
    description: '全流程监控任务进度，智能预警超期风险，督促事项落地。',
    tags: ['督办', '进度管理'],
    status: '在线',
    statusType: 'online',
    accent: 'green',
    icon: taskIcon,
    usage: '12.5k',
  },
  {
    id: 'case-clue',
    type: 'expert',
    name: '案件线索串并专家',
    department: '刑侦支队',
    description: '对案事件、人员轨迹和物证信息进行聚合比对，辅助发现串并案关系。',
    tags: ['刑侦', '线索串并'],
    status: '在线',
    statusType: 'online',
    accent: 'indigo',
    icon: chartIcon,
    usage: '8.9k',
  },
  {
    id: 'traffic-risk',
    type: 'expert',
    name: '交通风险研判员',
    department: '交通管理',
    description: '围绕事故、拥堵和重点车辆运行态势，输出风险预警与治理建议。',
    tags: ['交通', '风险预警'],
    status: '待命',
    statusType: 'standby',
    accent: 'teal',
    icon: chartIcon,
    usage: '6.2k',
  },
  {
    id: 'anti-fraud-fund',
    type: 'team',
    name: '反诈资金流研判组',
    department: '刑侦支队',
    description: '整合银行流水与第三方支付数据，穿透多层级洗钱网络，锁定嫌疑人。',
    tags: ['经侦', '资金穿透', '反诈'],
    status: '待命',
    statusType: 'standby',
    accent: 'indigo',
    icon: schoolIcon,
    views: '28.5k',
    members: ['经', '侦', '数'],
    memberCount: 4,
  },
  {
    id: 'public-opinion',
    type: 'team',
    name: '舆情导控专班',
    department: '治安管理',
    description: '实时监测全网涉警舆情，分析情感倾向，生成引导策略与回应口径。',
    tags: ['舆情', '公关'],
    status: '在线',
    statusType: 'online',
    accent: 'blue',
    icon: messageIcon,
    views: '28.5k',
    members: ['舆', '情', '控'],
    memberCount: 4,
  },
  {
    id: 'digital-forensics',
    type: 'team',
    name: '电子取证分析组',
    department: '网安大队',
    description: '手机、电脑硬盘数据快速恢复与提取，关键证据随录与证据链固定。',
    tags: ['网安', '取证'],
    status: '在线',
    statusType: 'online',
    accent: 'teal',
    icon: chartIcon,
    views: '28.5k',
    members: ['网', '证', '析'],
    memberCount: 4,
  },
]

const matchesFilters = (item: ExpertCenterItem) => {
  const keyword = searchKeyword.value.trim().toLowerCase()
  const categoryMatched = selectedCategory.value === '全部' || item.department === selectedCategory.value
  const keywordMatched =
    !keyword ||
    [item.name, item.department, item.description, ...item.tags].join(' ').toLowerCase().includes(keyword)

  return categoryMatched && keywordMatched
}

const filteredExperts = computed(() =>
  items.filter((item) => item.type === 'expert' && matchesFilters(item)),
)
const filteredTeams = computed(() =>
  items.filter((item) => item.type === 'team' && matchesFilters(item)),
)
const visibleExperts = computed(() =>
  expertExpanded.value ? filteredExperts.value : filteredExperts.value.slice(0, initialVisibleCount),
)
const visibleTeams = computed(() =>
  teamExpanded.value ? filteredTeams.value : filteredTeams.value.slice(0, initialVisibleCount),
)

const useExpert = (item: ExpertCenterItem) => {
  ElMessage.success(`已选择“${item.name}”`)
}
</script>

<style scoped>
.expert-center {
  /* 本地变量 → 全局令牌映射 */
  --ex-bg: var(--app-bg);
  --ex-card: var(--app-panel);
  --ex-card-border: var(--app-border);
  --ex-input: var(--app-panel-muted);
  --ex-input-border: var(--app-border);
  --ex-text: var(--app-text);
  --ex-text-secondary: var(--app-text-muted);
  --ex-text-muted: var(--app-text-subtle);
  --ex-primary: var(--app-primary);
  --ex-primary-hover: var(--app-primary-strong);
  --ex-success: var(--app-success);
  --ex-warning: var(--tc-amber);
  --ex-scrollbar: var(--app-scrollbar);
  --ex-scrollbar-hover: var(--app-scrollbar-hover);

  width: 100%;
  height: 100vh;
  padding: 32px;
  overflow-y: auto;
  color: var(--ex-text);
  background: var(--ex-bg);
  font-family:
    Inter,
    system-ui,
    -apple-system,
    sans-serif;
}

.expert-center::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.expert-center::-webkit-scrollbar-track {
  background: transparent;
}

.expert-center::-webkit-scrollbar-thumb {
  background: var(--ex-scrollbar);
  border-radius: 3px;
}

.expert-center::-webkit-scrollbar-thumb:hover {
  background: var(--ex-scrollbar-hover);
}

.expert-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 32px;
}

.expert-recommend-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 24px;
  margin-bottom: 32px;
}

.expert-recommend-card {
  padding: 20px;
  border: 1px solid transparent;
  border-radius: 16px;
  overflow: hidden;
}

.expert-recommend-card--red {
  border-color: #fef2f2;
  background: #fff5f4;
}

.expert-recommend-card--yellow {
  border-color: #fefce8;
  background: #fffdf2;
}

.expert-recommend-card--blue {
  border-color: #eff6ff;
  background: #f0f8ff;
}

.expert-recommend-card__header {
  margin-bottom: 16px;
}

.expert-recommend-card__header h2 {
  margin: 0;
  color: var(--ex-text);
  font-size: 18px;
  font-weight: 700;
  line-height: 1.5;
}

.expert-recommend-card__header p {
  margin: 0;
  color: var(--ex-text-secondary);
  font-size: 12px;
}

.expert-rank-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.expert-rank-list li {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 12px;
}

.expert-rank-number {
  width: 20px;
  height: 20px;
  flex: 0 0 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
}

.expert-rank-number--1 {
  color: #ca8a04;
  background: #fef9c3;
}

.expert-rank-number--2 {
  color: #4b5563;
  background: var(--ex-input-border);
}

.expert-rank-number--3 {
  color: #ea580c;
  background: #ffedd5;
}

.expert-rank-icon {
  width: 24px;
  height: 24px;
  flex: 0 0 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  font-size: 16px;
  font-weight: 700;
  line-height: 1;
}

.expert-rank-icon--blue {
  background: #dbeafe;
}

.expert-rank-icon--green {
  background: #dcfce7;
}

.expert-rank-icon--red {
  background: #fee2e2;
}

.expert-rank-icon--blue-soft {
  background: #eff6ff;
}

.expert-rank-icon--gray {
  background: var(--ex-card-border);
}

.expert-rank-icon--indigo {
  background: #eef2ff;
}

.expert-rank-icon--red-soft {
  background: #fef2f2;
}

.expert-rank-icon--purple {
  background: #faf5ff;
}

.expert-rank-name {
  min-width: 0;
  overflow: hidden;
  color: var(--ex-text);
  font-size: 14px;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.expert-toolbar__left {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 16px;
}

.expert-toolbar__label {
  flex: 0 0 auto;
  color: var(--ex-text);
  font-size: 14px;
  font-weight: 600;
}

.expert-category-list {
  display: flex;
  align-items: center;
  gap: 8px;
  overflow-x: auto;
}

.expert-category {
  flex: 0 0 auto;
  padding: 6px 16px;
  border: 0;
  border-radius: 999px;
  color: var(--ex-text-secondary);
  background: transparent;
  cursor: pointer;
  font: inherit;
  font-size: 14px;
  font-weight: 500;
  transition:
    color 0.15s ease,
    background 0.15s ease;
}

.expert-category:hover {
  color: var(--ex-text);
}

.expert-category--active {
  color: #ffffff;
  background: var(--ex-primary-hover);
}

.expert-category--active:hover {
  color: #ffffff;
}

.expert-search {
  position: relative;
  width: 256px;
  flex: 0 0 256px;
}

.expert-search__icon {
  position: absolute;
  top: 50%;
  left: 16px;
  width: 16px;
  height: 16px;
  color: var(--ex-text-muted);
  transform: translateY(-50%);
  pointer-events: none;
}

.expert-search input {
  width: 100%;
  height: 38px;
  padding: 8px 16px 8px 40px;
  border: 1px solid var(--ex-input-border);
  border-radius: 999px;
  outline: none;
  color: var(--ex-text);
  background: var(--ex-input);
  font: inherit;
  font-size: 14px;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease;
}

.expert-search input:focus {
  border-color: var(--ex-primary);
  box-shadow: 0 0 0 1px var(--ex-primary);
}

.expert-section {
  margin-bottom: 40px;
}

.expert-section__header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}

.expert-section__header h3 {
  margin: 0;
  color: var(--ex-text);
  font-size: 18px;
  font-weight: 700;
}

.expert-more {
  display: inline-flex;
  align-items: center;
  padding: 0;
  border: 0;
  color: var(--ex-primary);
  background: transparent;
  cursor: pointer;
  font: inherit;
  font-size: 12px;
  font-weight: 500;
}

.expert-more:hover {
  color: var(--ex-primary-hover);
}

.expert-more__icon {
  width: 12px;
  height: 12px;
  margin-left: 2px;
}

.expert-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 24px;
}

.expert-grid--teams {
  margin-bottom: 40px;
}

.expert-card {
  position: relative;
  display: flex;
  min-height: 236px;
  flex-direction: column;
  justify-content: space-between;
  padding: 20px;
  border: 1px solid var(--ex-card-border);
  border-radius: 16px;
  background: var(--ex-card);
  box-shadow: 0 2px 10px -4px rgba(0, 0, 0, 0.05);
  transition:
    box-shadow 0.15s ease,
    transform 0.15s ease;
}

.expert-card:hover {
  box-shadow:
    0 4px 6px -1px rgb(0 0 0 / 0.1),
    0 2px 4px -2px rgb(0 0 0 / 0.1);
  transform: translateY(-1px);
}

.expert-status {
  position: absolute;
  top: 20px;
  right: 20px;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 500;
}

.expert-status--online {
  color: var(--ex-success);
  background: #f0fdf4;
}

.expert-status--standby {
  color: var(--ex-text-secondary);
  background: var(--ex-card-border);
}

.expert-icon {
  width: 40px;
  height: 40px;
  flex: 0 0 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
  border-radius: 12px;
  overflow: hidden;
}

.expert-icon :deep(svg) {
  width: 24px;
  height: 24px;
  flex: 0 0 24px;
  display: block;
}

.expert-icon--blue {
  color: var(--ex-primary-hover);
  background: #eff6ff;
}

.expert-icon--orange {
  color: #f97316;
  background: #fff7ed;
}

.expert-icon--green {
  color: var(--ex-success);
  background: #f0fdf4;
}

.expert-icon--indigo {
  color: #6366f1;
  background: #eef2ff;
}

.expert-icon--teal {
  color: #14b8a6;
  background: #f0fdfa;
}

.expert-card h4 {
  max-width: calc(100% - 72px);
  margin: 0 0 8px;
  overflow: hidden;
  color: var(--ex-text);
  font-size: 16px;
  font-weight: 700;
  line-height: 1.5;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.expert-card p {
  max-width: 100%;
  height: 32px;
  margin: 0 0 16px;
  overflow: hidden;
  display: -webkit-box;
  color: var(--ex-text-secondary);
  font-size: 12px;
  line-height: 1.625;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
}

.expert-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 24px;
}

.expert-tags span {
  padding: 4px 8px;
  border-radius: 4px;
  color: var(--ex-primary-hover);
  background: #eff6ff;
  font-size: 10px;
}

.expert-card__footer {
  min-height: 41px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid var(--ex-input);
  color: var(--ex-text-muted);
  font-size: 12px;
}

.expert-use {
  padding: 6px 16px;
  border: 0;
  border-radius: 6px;
  color: #ffffff;
  background: #1e293b;
  cursor: pointer;
  font: inherit;
  font-size: 12px;
  font-weight: 500;
  transition: background 0.15s ease;
}

.expert-use:hover {
  background: var(--ex-text);
}

.expert-team-members {
  min-width: 0;
  display: flex;
  align-items: center;
}

.expert-avatar-list {
  display: flex;
  flex-shrink: 0;
}

.expert-avatar-list span {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: -8px;
  border: 2px solid var(--ex-card);
  border-radius: 999px;
  color: #ffffff;
  background: var(--ex-primary-hover);
  font-size: 10px;
  font-weight: 700;
}

.expert-avatar-list span:first-child {
  margin-left: 0;
}

.expert-team-members em {
  margin-left: 8px;
  overflow: hidden;
  color: var(--ex-text-muted);
  font-size: 10px;
  font-style: normal;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.expert-views {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--ex-text-muted);
  font-size: 10px;
}

.expert-views svg {
  width: 12px;
  height: 12px;
}

.expert-empty {
  min-height: 180px;
  display: grid;
  place-items: center;
  border: 1px solid var(--ex-card-border);
  border-radius: 16px;
  color: var(--ex-text-muted);
  background: var(--ex-card);
  font-size: 14px;
}

/* ==================== 深色模式 ==================== */
:root[data-theme='dark'] .expert-recommend-card--red {
  border-color: rgba(255, 71, 87, 0.15);
  background: rgba(255, 71, 87, 0.06);
}
:root[data-theme='dark'] .expert-recommend-card--yellow {
  border-color: rgba(245, 166, 35, 0.15);
  background: rgba(245, 166, 35, 0.06);
}
:root[data-theme='dark'] .expert-recommend-card--blue {
  border-color: rgba(0, 170, 255, 0.15);
  background: rgba(0, 170, 255, 0.06);
}

:root[data-theme='dark'] .expert-rank-number--1 {
  color: var(--tc-amber);
  background: rgba(245, 166, 35, 0.2);
}
:root[data-theme='dark'] .expert-rank-number--2 {
  color: var(--app-text-muted);
  background: rgba(190, 210, 240, 0.12);
}
:root[data-theme='dark'] .expert-rank-number--3 {
  color: #f97316;
  background: rgba(249, 115, 22, 0.2);
}

:root[data-theme='dark'] .expert-rank-icon--blue { background: rgba(79, 124, 255, 0.15); }
:root[data-theme='dark'] .expert-rank-icon--green { background: rgba(46, 213, 115, 0.15); }
:root[data-theme='dark'] .expert-rank-icon--red { background: rgba(255, 71, 87, 0.15); }
:root[data-theme='dark'] .expert-rank-icon--blue-soft { background: rgba(79, 124, 255, 0.1); }
:root[data-theme='dark'] .expert-rank-icon--gray { background: rgba(190, 210, 240, 0.1); }
:root[data-theme='dark'] .expert-rank-icon--indigo { background: rgba(99, 102, 241, 0.15); }
:root[data-theme='dark'] .expert-rank-icon--red-soft { background: rgba(255, 71, 87, 0.1); }
:root[data-theme='dark'] .expert-rank-icon--purple { background: rgba(168, 85, 247, 0.15); }

:root[data-theme='dark'] .expert-icon--blue { color: var(--app-primary); background: rgba(79, 124, 255, 0.15); }
:root[data-theme='dark'] .expert-icon--orange { color: #f97316; background: rgba(249, 115, 22, 0.15); }
:root[data-theme='dark'] .expert-icon--green { color: var(--app-success); background: rgba(46, 213, 115, 0.15); }
:root[data-theme='dark'] .expert-icon--indigo { color: #6366f1; background: rgba(99, 102, 241, 0.15); }
:root[data-theme='dark'] .expert-icon--teal { color: #14b8a6; background: rgba(20, 184, 166, 0.15); }

:root[data-theme='dark'] .expert-status--online { color: var(--app-success); background: rgba(46, 213, 115, 0.15); }
:root[data-theme='dark'] .expert-status--standby { color: var(--app-text-muted); background: rgba(190, 210, 240, 0.1); }

@media (max-width: 1100px) {
  .expert-recommend-grid,
  .expert-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .expert-center {
    padding: 20px;
  }

  .expert-toolbar {
    align-items: stretch;
    flex-direction: column;
  }

  .expert-toolbar__left {
    align-items: flex-start;
    flex-direction: column;
    gap: 10px;
  }

  .expert-search {
    width: 100%;
    flex-basis: auto;
  }

  .expert-recommend-grid,
  .expert-grid {
    grid-template-columns: 1fr;
  }
}
</style>
