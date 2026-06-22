# ASR语音识别功能实现说明

## 功能概述
在聊天输入框左侧添加了麦克风图标，支持语音转文字功能，基于FunASR WebSocket服务实现。

## 技术实现

### 1. 核心文件
- `src/composables/useASR.ts` - ASR语音识别composable
- `src/views/HomeView.vue` - 集成ASR功能的主界面
- `src/views/styles/HomeView.css` - 麦克风按钮样式

### 2. 功能特性

#### 1. 2pass 双通道识别模式

FunASR 的 2pass 模式会返回两种类型的结果：

##### 🌊 实时流式结果（online）
- **特点**：说话过程中持续推送，响应快但不准确
- **用途**：提供实时反馈，让用户看到识别进度
- **显示**：灰色或浅色文字（可选）

##### 🔧 离线纠错结果（offline / 2pass-offline）
- **特点**：说完一句话后触发，使用 Ngram 语言模型纠错，更准确
- **用途**：替换实时结果，提供最终准确文本
- **显示**：黑色正式文字

##### ✅ 最终结果（is_final: true）
- **特点**：整段识别完毕，包含完整的时间戳信息
- **用途**：锁定文本，触发后续业务逻辑（存库、分析等）

#### 2. 智能纠错流程

```
用户说话中：
  └── online 结果 → 实时显示在输入框（可能有误差）
  
说完一句后：
  └── offline 纠错结果 → 自动替换为更准确的文本
  
整段结束（is_final=true）：
  └── 最终结果锁定 → 可触发保存/发送操作
```

#### 3. 示例场景

**场景**：用户说"今天天气真不错，明天应该也不会差"

| 时间 | 模式 | 返回文本 | 输入框显示 |
|------|------|---------|-----------|
| T1 | online | "今天天" | "请帮我：今天天" |
| T2 | online | "今天天气" | "请帮我：今天天气" |
| T3 | online | "今天天气真不" | "请帮我：今天天气真不" |
| T4 | online | "今天天气真不错" | "请帮我：今天天气真不错" |
| T5 | offline | "今天天气真不错。" | "请帮我：今天天气真不错。" ← **纠错后** |
| T6 | offline | "今天天气真不错，明天应该也不会差。" | "请帮我：今天天气真不错，明天应该也不会差。" ← **最终结果** |

#### 4. 技术实现

**useASR.ts 中的处理逻辑**：

```typescript
ws.value.onmessage = (event) => {
  const result = JSON.parse(event.data)
  
  if (result.mode === 'online') {
    // 实时流式结果
    streamingText.value = result.text
    currentText.value = result.text
  } else if (result.mode === 'offline' || result.mode === '2pass-offline') {
    // 离线纠错结果（更准确）
    correctedText.value = result.text
    currentText.value = result.text  // 替换为纠错后的文本
  }
  
  onResult?.(result)
}
```

**HomeView.vue 中的使用**：

```typescript
await startASR({ mode: '2pass', ... }, (result) => {
  if (result.text) {
    // 直接拼接：前缀 + 当前识别结果（已包含纠错）
    currentInput.value = inputPrefix + result.text
  }
})
```

#### 状态管理
- **未连接状态**: 显示普通麦克风图标
- **连接中状态**: 显示旋转的loading动画
- **录音中状态**: 显示红色脉冲动画的麦克风图标

#### 交互逻辑
1. 点击麦克风图标 → 连接WebSocket并启动录音
2. 实时接收识别结果并**追加**到输入框（保留原有内容）
3. 再次点击麦克风图标 → 停止录音并断开连接
4. 用户手动输入文字 → 自动断开ASR连接（避免冲突）

#### 音频处理
- 采样率: 16kHz
- 位深度: 16bit
- 声道: 单声道
- 格式: 裸PCM（无WAV头）
- Float32转Int16转换

#### FunASR协议
- **配置帧**: JSON格式，包含mode、chunk_size等参数
- **音频帧**: 二进制ArrayBuffer，PCM数据
- **结束帧**: JSON格式 `{"is_speaking": false}`
- **返回结果**: 
  - online模式: 实时流式结果
  - offline模式: 离线纠错结果（更准确）
  - is_final: true表示最终结果

### 3. UI设计

#### 麦克风按钮位置
```
[麦克风] [输入框] [上传文件] [发送]
```

#### 动画效果
- **连接中**: Loading图标持续旋转（360度/秒）
- **录音中**: 红色脉冲效果（缩放+透明度变化）

### 4. 错误处理
- WebSocket连接失败提示
- 麦克风权限拒绝提示
- 音频采集失败处理
- 自动清理资源（组件卸载时）

## 使用示例

```typescript
// 在组件中使用
import { useASR } from '@/composables/useASR'

const { 
  isConnected, 
  isConnecting, 
  isRecording, 
  currentText,
  start,
  stop,
  disconnect,
} = useASR()

// 开始录音
await start({
  mode: '2pass',
  chunkSize: [5, 10, 5],
  chunkInterval: 10,
  itn: true,
}, (result) => {
  console.log('识别结果:', result.text)
})

// 停止录音
stop()
```

## 注意事项

1. **浏览器兼容性**: 需要支持Web Audio API和getUserMedia
2. **权限要求**: 首次使用需要授予麦克风权限
3. **网络要求**: 确保内网可访问FunASR服务（ws://10.32.71.16:10095）
4. **环境要求**: 建议在安静环境下使用以获得更好的识别效果

## 后续优化方向

1. 添加热词自定义配置
2. 支持多种语言识别
3. 添加音量可视化反馈
4. 支持离线识别模式
5. 添加识别历史记录
