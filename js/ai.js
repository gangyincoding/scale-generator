/**
 * AI服务模块
 */

const AI = {
    // 服务商配置
    providers: {
        deepseek: {
            name: 'DeepSeek',
            baseUrl: 'https://api.deepseek.com/v1',
            model: 'deepseek-chat'
        },
        glm: {
            name: 'GLM-5 (智谱AI)',
            baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
            model: 'glm-4-flash'
        }
    },

    // 默认配置
    config: {
        provider: 'deepseek',
        model: 'deepseek-chat',
        apiKey: '',
        baseUrl: 'https://api.deepseek.com/v1'
    },

    /**
     * 初始化配置
     */
    init(config = {}) {
        this.config = { ...this.config, ...config };
    },

    /**
     * 从本地存储加载配置
     */
    loadConfig() {
        const saved = Utils.storage.get('ai_config');
        if (saved) {
            this.config = { ...this.config, ...saved };
        }
        return this.config;
    },

    /**
     * 保存配置到本地存储
     */
    saveConfig() {
        Utils.storage.set('ai_config', this.config);
    },

    /**
     * 清除本机保存的配置
     */
    clearStoredConfig() {
        Utils.storage.remove('ai_config');
        this.config = {
            provider: 'deepseek',
            model: 'deepseek-chat',
            apiKey: '',
            baseUrl: 'https://api.deepseek.com/v1'
        };
    },

    /**
     * 调用AI解析量表结构
     * @param {string} content - 文档内容
     * @param {Object} context - 已知上下文（题目数/选项类型等）
     * @returns {Promise<Object>} - 解析结果
     */
    async parseScale(content, context = {}) {
        if (!this.config.apiKey) {
            throw new Error('请先在设置中配置API Key');
        }

        const prompt = this.buildPrompt(content, context);

        try {
            let response;
            if (this.config.provider === 'claude') {
                response = await this.callClaude(prompt);
            } else {
                response = await this.callOpenAI(prompt);
            }

            return this.parseResponse(response);
        } catch (error) {
            console.error('AI解析失败:', error);
            throw new Error('AI解析失败: ' + error.message);
        }
    },

    /**
     * 构建提示词
     */
    buildPrompt(content, context = {}) {
        const optionType = context.optionType || '';
        const questionCount = Number.isFinite(context.questionCount) ? context.questionCount : '';
        const titleHint = context.title ? String(context.title) : '';

        return `你是一个心理量表解析专家。请分析以下量表文档内容，提取出结构化信息。

要求：
1. 量表名称：通常是文档开头包含"量表"、"问卷"等关键词的标题
2. 量表描述：1-2句话简要描述该量表的用途
3. 所有题目：按顺序编号提取，不要遗漏
4. 选项类型：根据文档内容判断（是/否、4级评分、5级评分等）
5. 计分规则：如果有提到计分方式、反向题、维度划分，请提取
6. 结果解读：如果有提到分数区间对应的结果，请提取

已知信息（来自程序预解析，可能为空）：
- 题目数量(预估)：${questionCount}
- 选项类型(预估)：${optionType}
- 标题提示(预估)：${titleHint}

重要：如果文档中**没有**明确“计分规则/分数区间/结果解读”，请你基于以下原则**生成一套可用的建议方案**（用于页面展示，后续可人工编辑）：
1) scoring.method 默认用 sum
2) 若选项类型为 scale4，每题分值 1-4；scale5 为 1-5；yesno 为 0/1（是=1 否=0）
3) 生成 3-5 个结果区间（results 数组），必须覆盖完整得分范围，并保证区间连续不重叠
4) 每个区间提供 type/description/tags，并给出 analysis（数组，至少 3 条：得分说明/核心解读/建议）
5) 生成的内容需贴合量表主题，但避免医学诊断性质的表述（仅做自测参考建议）
6) 常规方向：得分越高表示该特质/困扰程度越高（更需要关注），请按此方向编写区间类型与建议文案

请严格按照以下JSON格式输出，不要添加任何其他文字：

{
  "meta": {
    "title": "量表名称",
    "description": "量表描述",
    "questionCount": 题目数量
  },
  "questions": [
    {
      "id": 1,
      "text": "题目内容"
    }
  ],
  "optionType": "yesno 或 scale4 或 scale5",
  "scoring": {
    "method": "sum 或 avg 或 formula",
    "dimensions": [
      {
        "name": "维度名称",
        "questions": [题号数组],
        "maxScore": 满分
      }
    ],
    "reverseQuestions": [反向计分的题号数组],
    "formula": "计算公式（如果有）"
  },
  "results": [
    {
      "minScore": 最小分数(数字),
      "maxScore": 最大分数(数字),
      "type": "结果类型",
      "tags": ["标签1", "标签2"],
      "description": "结果描述",
      "analysis": [
        { "label": "得分说明", "text": "..." },
        { "label": "核心解读", "text": "..." },
        { "label": "建议", "text": "..." }
      ]
    }
  ]
}

文档内容：
${content}`;
    },

    /**
     * 调用OpenAI API
     */
    async callOpenAI(prompt) {
        const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.config.apiKey}`
            },
            body: JSON.stringify({
                model: this.config.model || 'gpt-4',
                messages: [
                    {
                        role: 'system',
                        content: '你是一个专业的心理量表解析助手，请严格按照JSON格式输出结果。'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.3
            })
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error?.message || `API请求失败: ${response.status}`);
        }

        const data = await response.json();
        return data.choices[0]?.message?.content || '';
    },

    /**
     * 调用Claude API
     */
    async callClaude(prompt) {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': this.config.apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: this.config.model || 'claude-3-sonnet-20240229',
                max_tokens: 4096,
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ]
            })
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error?.message || `API请求失败: ${response.status}`);
        }

        const data = await response.json();
        return data.content[0]?.text || '';
    },

    /**
     * 解析AI响应
     */
    parseResponse(response) {
        try {
            // 尝试提取JSON
            let jsonStr = response;

            // 如果响应包含```json```代码块，提取其中的内容
            const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
            if (jsonMatch) {
                jsonStr = jsonMatch[1].trim();
            }

            // 尝试找到JSON对象的开始和结束
            const startIndex = jsonStr.indexOf('{');
            const lastIndex = jsonStr.lastIndexOf('}');
            if (startIndex !== -1 && lastIndex !== -1) {
                jsonStr = jsonStr.substring(startIndex, lastIndex + 1);
            }

            return JSON.parse(jsonStr);
        } catch (error) {
            console.error('JSON解析失败:', error);
            throw new Error('AI返回的数据格式不正确，请重试');
        }
    }
};

// 导出
window.AI = AI;
