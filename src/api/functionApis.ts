import type { FunctionApiConfig } from '@/types/api'

// 功能API配置
// 注意：Authorization token需要从环境变量或配置文件中获取
export const functionApiConfigs: Record<string, FunctionApiConfig> = {
  ctfx: {
    id: 'ctfx',
    label: '穿透分析',
    url: `${import.meta.env.VITE_FUNCTION_API_BASE}/dify_new`,
    auth: `${import.meta.env.VITE_DIFY_CTFX_TOKEN}`,
    inputs: (message: string) => ({ qbxx: message }),
    description: '情报线索穿透分析',
  },
  xsyp: {
    id: 'xsyp',
    label: '形势研判',
    url: `${import.meta.env.VITE_FUNCTION_API_BASE}/dify_new`,
    auth: `${import.meta.env.VITE_DIFY_XSYP_TOKEN}`,
    inputs: (message: string) => ({ keyword: message }),
    description: '形势研判分析',
  },
  ztfx: {
    id: 'ztfx',
    label: '专题分析',
    url: `${import.meta.env.VITE_FUNCTION_API_BASE}/dify_new`,
    auth: `${import.meta.env.VITE_DIFY_ZTFX_TOKEN}`,
    inputs: (message: string) => ({ query: message }),
    description: '两欠/安全稳定专题分析',
    hidden: true, // ✅ 不在功能按钮栏显示，仅通过关键词智能路由调用
  },
  jqaj: {
    id: 'jqaj',
    label: '警情案件',
    url: `${import.meta.env.VITE_FUNCTION_API_BASE}/dify_new`,
    auth: `${import.meta.env.VITE_DIFY_JQFX_TOKEN}`,
    inputs: (message: string) => ({
      keyword: message,
      requestId: Date.now() + Math.random().toString(36).substr(2, 9),
    }),
    description: '警情案件分析',
  },
  qtff: {
    id: 'qtff',
    label: '群体防范',
    url: `${import.meta.env.VITE_FUNCTION_API_BASE}/dify_new`,
    auth: `${import.meta.env.VITE_DIFY_QTFF_TOKEN}`,
    inputs: (message: string) => ({ content: message }),
    description: '群体性事件防范',
  },
  zbyq: {
    id: 'zbyq',
    label: '值班要情',
    url: `${import.meta.env.VITE_FUNCTION_API_BASE}/dify_new`,
    auth: `${import.meta.env.VITE_DIFY_ZBYQ_TOKEN}`,
    inputs: (message: string) => ({ scrq: message }),
    description: '值班要情报告',
  },
  ryda: {
    id: 'ryda',
    label: '人员档案',
    url: `${import.meta.env.VITE_FUNCTION_API_BASE}/dify_new`,
    auth: `${import.meta.env.VITE_DIFY_RYDA_TOKEN || 'dify_ryda_token'}`,
    inputs: (message: string) => ({ sfzh: message }),
    description: '人员档案查询',
  },
  qtjj: {
    id: 'qtjj',
    label: '群体聚集',
    url: `${import.meta.env.VITE_FUNCTION_API_BASE}/dify_new`,
    auth: `${import.meta.env.VITE_DIFY_QTJJ_TOKEN || 'dify_qtjj_token'}`,
    inputs: (message: string) => ({ content: message }),
    description: '群体聚集分析',
    hidden: true, // ✅ 不在功能按钮栏显示
  },
  xstj: {
    id: 'xstj',
    label: '线索统计',
    url: `${import.meta.env.VITE_FUNCTION_API_BASE}/AI/xstj/search`,
    auth: '', // 该接口可能不需要 Authorization，或从环境变量获取
    inputs: (message: string) => ({ query: message }),
    description: '线索统计分析',
    hidden: true, // ✅ 不在功能按钮栏显示
  },
  // zndd: {
  //   id: 'zndd',
  //   label: '智能调度',
  //   url: `${import.meta.env.VITE_DIFY_API_BASE}`,
  //   auth: `${import.meta.env.VITE_DIFY_ZNDD_TOKEN || 'dify_zndd_token'}`,
  //   inputs: (message: string) => ({ content: message }),
  //   description: '智能调度预案',
  // },
}

// 根据ID获取API配置
export const getApiConfig = (id: string): FunctionApiConfig | undefined => {
  return functionApiConfigs[id]
}
