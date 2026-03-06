/**
 * 主应用模块
 */

const App = {
    // 应用状态
    state: {
        currentStep: 1,
        file: null,
        parsedContent: null,
        quizData: null,
        generatedHtml: null,
        activationRecords: [],
        theme: null
    },

    // 初始化
    init() {
        console.log('App.init() 开始执行...');
        try {
            this.loadActivationRecords();
            console.log('loadActivationRecords 完成');
            this.bindEvents();
            console.log('bindEvents 完成');
            this.loadSettings();
            console.log('loadSettings 完成');
            AI.loadConfig();
            console.log('AI.loadConfig 完成');
            this.updateStep(1);
            console.log('App.init() 执行完成');
        } catch (error) {
            console.error('App.init() 出错:', error);
        }
    },

    // 加载激活码记录
    loadActivationRecords() {
        // 从本地存储加载
        const saved = Utils.storage.get('activation_records');
        if (saved) {
            this.state.activationRecords = saved;
        }
    },

    // 保存激活码记录
    saveActivationRecord(record) {
        this.state.activationRecords.push(record);
        Utils.storage.set('activation_records', this.state.activationRecords);
    },

    // 绑定事件
    bindEvents() {
        // 上传区域事件
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('fileInput');

        uploadArea.addEventListener('click', () => fileInput.click());
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });
        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleFile(files[0]);
            }
        });

        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleFile(e.target.files[0]);
            }
        });

        // 移除文件按钮
        document.getElementById('removeFileBtn').addEventListener('click', () => {
            this.removeFile();
        });

        // 导航按钮
        document.getElementById('prevBtn').addEventListener('click', () => {
            this.prevStep();
        });
        const nextBtn = document.getElementById('nextBtn');
        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                this.nextStep();
            });
        } else {
            console.warn('未找到 nextBtn，无法绑定“下一步”按钮事件');
        }

        // 重新上传（重置整个流程）
        const resetBtn = document.getElementById('resetBtn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                if (!Utils.confirm('将重置当前流程并返回到“上传文档”，是否继续？')) {
                    return;
                }
                this.resetWorkflow();
            });
        }

        // 设置弹窗
        console.log('绑定 settingsBtn 事件...');
        document.getElementById('settingsBtn').addEventListener('click', () => {
            console.log('settingsBtn 被点击');
            this.showModal('settingsModal');
        });
        document.getElementById('closeSettingsBtn').addEventListener('click', () => {
            this.hideModal('settingsModal');
        });
        document.getElementById('cancelSettingsBtn').addEventListener('click', () => {
            this.hideModal('settingsModal');
        });
        document.getElementById('clearSettingsBtn').addEventListener('click', () => {
            if (!Utils.confirm('将清除本机保存的 AI 配置与 Vercel Token，是否继续？')) {
                return;
            }

            AI.clearStoredConfig();
            Utils.storage.remove('vercel_token');
            this.loadSettings();
            this.hideModal('settingsModal');
            Utils.showToast('本机配置已清除', 'success');
        });
        document.getElementById('saveSettingsBtn').addEventListener('click', () => {
            this.saveSettings();
        });

        // AI服务商切换时自动填充配置
        document.getElementById('aiProvider').addEventListener('change', (e) => {
            this.onProviderChange(e.target.value);
        });

        // 历史记录弹窗
        console.log('绑定 historyBtn 事件...');
        document.getElementById('historyBtn').addEventListener('click', () => {
            console.log('historyBtn 被点击');
            this.showHistory();
        });
        document.getElementById('closeHistoryBtn').addEventListener('click', () => {
            this.hideModal('historyModal');
        });
        document.getElementById('closeHistoryBtn2').addEventListener('click', () => {
            this.hideModal('historyModal');
        });
        document.getElementById('exportHistoryBtn').addEventListener('click', () => {
            this.exportHistory();
        });

        // 主题切换（预览刷新）
        const themeBtn = document.getElementById('themeBtn');
        if (themeBtn) {
            themeBtn.addEventListener('click', () => {
                this.rerollTheme();
            });
        }

        // 生成按钮
        document.getElementById('generateBtn').addEventListener('click', () => {
            this.generateHTML();
        });
        document.getElementById('downloadBtn').addEventListener('click', () => {
            this.downloadHTML();
        });

        // 选项类型变化
        document.getElementById('optionType').addEventListener('change', (e) => {
            this.updateOptionsPreview(e.target.value);
        });

        // 添加结果区间按钮
        document.getElementById('addResultBtn').addEventListener('click', () => {
            this.addResultItem();
        });

        // 复制按钮
        document.querySelectorAll('.copy-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const targetId = btn.dataset.copy;
                const text = document.getElementById(targetId).textContent;
                Utils.copyToClipboard(text);
                Utils.showToast('已复制到剪贴板', 'success');
            });
        });
    },

    // 处理文件上传
    async handleFile(file) {
        // 验证文件类型
        const ext = file.name.split('.').pop().toLowerCase();
        if (!['docx', 'xls', 'xlsx'].includes(ext)) {
            Utils.showToast('请上传 .docx、.xls 或 .xlsx 文件', 'error');
            return;
        }

        // 验证文件大小 (10MB)
        if (file.size > 10 * 1024 * 1024) {
            Utils.showToast('文件大小不能超过 10MB', 'error');
            return;
        }

        this.state.file = file;

        // 显示文件信息
        document.getElementById('fileName').textContent = file.name;
        document.getElementById('fileSize').textContent = Utils.formatFileSize(file.size);
        document.getElementById('uploadArea').style.display = 'none';
        document.getElementById('fileInfo').style.display = 'flex';

        // 启用下一步按钮
        document.getElementById('nextBtn').disabled = false;
    },

    // 移除文件
    removeFile() {
        this.state.file = null;
        document.getElementById('uploadArea').style.display = 'block';
        document.getElementById('fileInfo').style.display = 'none';
        document.getElementById('fileInput').value = '';
        document.getElementById('nextBtn').disabled = true;
    },

    // 更新步骤
    updateStep(step) {
        this.state.currentStep = step;

        // 更新步骤指示器
        document.querySelectorAll('.step').forEach((el, index) => {
            el.classList.remove('active', 'completed');
            if (index + 1 < step) {
                el.classList.add('completed');
            } else if (index + 1 === step) {
                el.classList.add('active');
            }
        });

        // 更新页面显示
        document.querySelectorAll('.page-section').forEach((section, index) => {
            section.classList.remove('active');
            if (index + 1 === step) {
                section.classList.add('active');
            }
        });

        // 更新导航按钮
        document.getElementById('prevBtn').disabled = step <= 1;
        const resetBtn = document.getElementById('resetBtn');
        if (resetBtn) {
            resetBtn.style.display = step >= 3 ? 'inline-flex' : 'none';
        }
    },

    // 上一步
    prevStep() {
        if (this.state.currentStep > 1) {
            const newStep = this.state.currentStep - 1;
            this.updateStep(newStep);
        }
    },

    // 重置整个工作流程
    resetWorkflow() {
        // 清空状态
        this.state.file = null;
        this.state.parsedContent = null;
        this.state.quizData = null;
        this.state.generatedHtml = null;
        this.state.theme = null;

        // 重置UI
        document.getElementById('uploadArea').style.display = 'block';
        document.getElementById('fileInfo').style.display = 'none';
        document.getElementById('fileInput').value = '';
        document.getElementById('nextBtn').disabled = true;
        document.getElementById('downloadBtn').disabled = true;
        document.getElementById('resultInfo').style.display = 'none';

        // 重置步骤
        this.updateStep(1);

        console.log('工作流程已重置');
    },

    ensureTheme(refresh = false) {
        if (refresh || !this.state.theme) {
            const excludeId = this.state.theme?.id || null;
            this.state.theme = Generator.pickRandomTheme(excludeId);
        }
        return this.state.theme;
    },

    rerollTheme() {
        const theme = this.ensureTheme(true);
        this.state.generatedHtml = null;
        this.previewHTML();

        const themeEl = document.getElementById('resultTheme');
        if (themeEl) themeEl.textContent = theme.name;

        Utils.showToast(`已切换主题：${theme.name}`, 'success');
    },

    // 下一步
    async nextStep() {
        switch (this.state.currentStep) {
            case 1:
                // 上传文档 -> 开始解析
                if (!this.state.file) {
                    Utils.showToast('请先上传文件', 'error');
                    return;
                }
                this.updateStep(2);
                await this.parseDocument();
                break;

            case 2:
                // AI解析 -> 确认编辑
                this.updateStep(3);
                break;

            case 3:
                // 确认编辑 -> 生成部署
                this.updateStep(4);
                this.previewHTML();
                break;

            case 4:
                // 生成部署 -> 完成
                break;
        }
    },

    // 解析文档
    async parseDocument() {
        console.log('开始解析文档, 文件:', this.state.file?.name);
        try {
            // 确保步骤2已显示
            await new Promise(resolve => setTimeout(resolve, 300));

            // 1. 基础解析
            console.log('步骤1: 读取文档内容...');
            document.getElementById('parsingHint').textContent = '正在读取文档内容...';
            const content = await Parser.parse(this.state.file);
            this.state.parsedContent = content;
            console.log('文档内容长度:', content.length);

            // 2. 基础结构提取
            console.log('步骤2: 提取基础结构...');
            document.getElementById('parsingHint').textContent = '正在提取基础结构...';
            const basicStructure = Parser.extractBasicStructure(content);
            console.log('提取到题目数量:', basicStructure.questions.length);

            // 3. AI解析（如果配置了API Key）
            if (AI.config.apiKey) {
                console.log('步骤3: AI解析...');
                document.getElementById('parsingHint').textContent = 'AI正在理解量表结构...';
                try {
                    const aiResult = await AI.parseScale(content, {
                        optionType: basicStructure.optionType,
                        questionCount: basicStructure.questions.length,
                        title: basicStructure.title
                    });
                    this.state.quizData = this.mergeQuizData(basicStructure, aiResult);
                    console.log('AI解析完成');
                } catch (error) {
                    console.warn('AI解析失败，使用基础结构:', error);
                    document.getElementById('parsingHint').textContent = 'AI解析失败，使用基础结构...';
                    this.state.quizData = this.convertBasicToQuizData(basicStructure);
                }
            } else {
                // 使用基础结构
                console.log('未配置API Key，使用基础结构');
                document.getElementById('parsingHint').textContent = '正在整理数据...';
                await new Promise(resolve => setTimeout(resolve, 500));
                this.state.quizData = this.convertBasicToQuizData(basicStructure);
            }

            // 确保用户能看到解析过程
            await new Promise(resolve => setTimeout(resolve, 500));

            // 4. 填充编辑表单
            console.log('步骤4: 填充编辑表单...');
            this.populateEditForm();
            this.updateStep(3);
            console.log('解析完成，进入步骤3');

        } catch (error) {
            console.error('解析失败:', error);
            Utils.showToast('解析失败: ' + error.message, 'error');
            this.updateStep(1);
        }
    },

    // 合并AI解析结果和基础结构
    mergeQuizData(basic, ai) {
        const aiResults = Array.isArray(ai.results) && ai.results.length > 0 ? ai.results : null;
        return {
            title: ai.meta?.title || basic.title || '未命名量表',
            subtitle: ai.meta?.subtitle || '',
            description: ai.meta?.description || '',
            questions: ai.questions || basic.questions,
            options: ai.options || basic.options,
            optionType: ai.optionType || basic.optionType,
            scoring: ai.scoring || {},
            results: aiResults || []
        };
    },

    // 转换基础结构为问卷数据
    convertBasicToQuizData(basic) {
        return {
            title: basic.title || '未命名量表',
            subtitle: '',
            description: '',
            questions: basic.questions,
            options: basic.options,
            optionType: basic.optionType,
            scoring: {
                method: 'sum',
                reverseQuestions: []
            },
            results: []
        };
    },

    // 填充编辑表单
    populateEditForm() {
        const data = this.state.quizData;

        document.getElementById('quizTitle').value = data.title || '';
        document.getElementById('quizDescription').value = data.description || '';
        document.getElementById('optionType').value = data.optionType || 'scale4';
        document.getElementById('scoringMethod').value = data.scoring?.method || 'sum';
        document.getElementById('reverseQuestions').value = (data.scoring?.reverseQuestions || []).join(', ');

        // 生成激活码
        const existingCodes = this.state.activationRecords.map(r => r.activationCode);
        const newCode = Utils.generateActivationCode(existingCodes);
        document.getElementById('activationCode').value = newCode;

        // 更新题目列表
        this.updateQuestionsList();

        // 更新结果设置
        this.updateResultsList();
    },

    // 更新题目列表显示
    updateQuestionsList() {
        const questions = this.state.quizData?.questions || [];
        const container = document.getElementById('questionsList');

        document.getElementById('questionCount').textContent = questions.length;

        if (questions.length === 0) {
            container.innerHTML = '<p class="empty-hint">暂无题目</p>';
            return;
        }

        container.innerHTML = questions.map((q, index) => `
            <div class="question-item">
                <span class="question-num">Q${index + 1}</span>
                <span class="question-preview">${this.truncateText(q.text || q, 50)}</span>
            </div>
        `).join('');
    },

    // 更新结果列表显示
    updateResultsList() {
        const results = this.state.quizData?.results || [];
        const container = document.getElementById('resultsList');

        if (results.length === 0) {
            container.innerHTML = '';
            return;
        }

        container.innerHTML = results.map((r, index) => `
            <div class="result-item" data-index="${index}">
                <div class="form-row">
                    <input type="text" class="form-input form-input-sm" placeholder="最小" value="${r.minScore ?? ''}">
                    <span class="form-separator">-</span>
                    <input type="text" class="form-input form-input-sm" placeholder="最大" value="${r.maxScore ?? ''}">
                    <input type="text" class="form-input" placeholder="结果类型" value="${r.type || ''}">
                </div>
                <textarea class="form-textarea" rows="2" placeholder="结果描述">${r.description || ''}</textarea>
            </div>
        `).join('');
    },

    // 添加结果项
    addResultItem() {
        const container = document.getElementById('resultsList');
        const index = container.children.length;

        const itemHtml = `
            <div class="result-item" data-index="${index}">
                <div class="form-row">
                    <input type="text" class="form-input form-input-sm" placeholder="最小分数">
                    <span class="form-separator">-</span>
                    <input type="text" class="form-input form-input-sm" placeholder="最大分数">
                    <input type="text" class="form-input" placeholder="结果类型">
                </div>
                <textarea class="form-textarea" rows="2" placeholder="结果描述"></textarea>
            </div>
        `;

        container.insertAdjacentHTML('beforeend', itemHtml);
    },

    // 从表单收集数据
    collectFormData() {
        const data = {
            title: document.getElementById('quizTitle').value.trim(),
            subtitle: '',
            description: document.getElementById('quizDescription').value.trim(),
            questions: this.state.quizData?.questions || [],
            options: Parser.getDefaultOptions(document.getElementById('optionType').value),
            optionType: document.getElementById('optionType').value,
            activationCode: document.getElementById('activationCode').value.trim(),
            scoring: {
                method: document.getElementById('scoringMethod').value,
                reverseQuestions: document.getElementById('reverseQuestions').value
                    .split(',')
                    .map(s => parseInt(s.trim()))
                    .filter(n => !isNaN(n))
            },
            results: []
        };

        const aiResults = Array.isArray(this.state.quizData?.results) ? this.state.quizData.results : [];

        // 收集结果设置
        document.querySelectorAll('#resultsList .result-item').forEach(item => {
            const inputs = item.querySelectorAll('input');
            const textarea = item.querySelector('textarea');
            const idx = parseInt(item.dataset.index, 10);

            const min = parseInt(inputs[0].value);
            const max = parseInt(inputs[1].value);
            const type = inputs[2].value.trim();
            const desc = textarea.value.trim();

            if (!isNaN(min) && !isNaN(max) && type) {
                const aiAnalysis = Number.isFinite(idx) ? aiResults[idx]?.analysis : null;
                const analysis = Array.isArray(aiAnalysis) && aiAnalysis.length > 0
                    ? aiAnalysis
                    : [
                        { label: '得分说明', text: `你的得分为 ${min}-${max} 分。` },
                        { label: '结果解读', text: desc || `属于${type}范围。` }
                    ];

                data.results.push({
                    condition: `total >= ${min} && total <= ${max}`,
                    type: type,
                    description: desc || `你的得分在 ${min}-${max} 分之间，属于${type}。`,
                    tags: [type],
                    analysis
                });
            }
        });

        // 如果没有设置结果，使用默认结果
        if (data.results.length === 0) {
            data.results = this.generateDefaultResults(data.questions.length, data.optionType);
        }

        return data;
    },

    // 生成默认结果
    generateDefaultResults(questionCount, optionType) {
        let minPerQuestion = 1;
        let maxPerQuestion = 4;

        if ((optionType || 'scale4') === 'yesno') {
            minPerQuestion = 0;
            maxPerQuestion = 1;
        } else {
            const options = Parser.getDefaultOptions(optionType || 'scale4');
            const numericValues = options
                .map(o => parseInt(o.value, 10))
                .filter(n => !isNaN(n));
            maxPerQuestion = numericValues.length > 0 ? Math.max(...numericValues) : 4;
            minPerQuestion = numericValues.length > 0 ? Math.min(...numericValues) : 1;
        }

        // 默认按“求和”粗略分层（不含反向题/维度），用于没有结果区间时的兜底展示
        const maxScore = questionCount * maxPerQuestion;
        const minScore = questionCount * minPerQuestion;
        const range = Math.max(0, maxScore - minScore);
        const low = Math.floor(minScore + range * 0.33);
        const mid = Math.floor(minScore + range * 0.66);

        return [
            {
                condition: `total >= ${minScore} && total <= ${low}`,
                type: '较低水平',
                description: '你的得分较低，建议继续保持观察。',
                tags: ['需要关注'],
                analysis: [
                    { label: '得分说明', text: `你的得分为 ${minScore}-${low} 分，处于较低水平。` },
                    { label: '建议', text: '建议继续保持观察，如有需要可以寻求专业帮助。' }
                ]
            },
            {
                condition: `total > ${low} && total <= ${mid}`,
                type: '中等水平',
                description: '你的得分处于中等水平，表现正常。',
                tags: ['表现正常'],
                analysis: [
                    { label: '得分说明', text: `你的得分为 ${low + 1}-${mid} 分，处于中等水平。` },
                    { label: '建议', text: '你的表现正常，继续保持良好的状态。' }
                ]
            },
            {
                condition: `total > ${mid}`,
                type: '较高水平',
                description: '你的得分较高，表现优秀。',
                tags: ['表现优秀'],
                analysis: [
                    { label: '得分说明', text: `你的得分超过 ${mid} 分，处于较高水平。` },
                    { label: '建议', text: '你的表现优秀，继续保持这种良好的状态。' }
                ]
            }
        ];
    },

    // 生成HTML
    generateHTML() {
        try {
            const theme = this.ensureTheme(true);
            const data = this.collectFormData();
            data.primaryColor = theme.primaryColor;
            data.bgColor = theme.bgColor;

            // 验证必填字段
            if (!data.title) {
                Utils.showToast('请输入量表名称', 'error');
                return;
            }
            if (!data.activationCode) {
                Utils.showToast('请输入激活码', 'error');
                return;
            }
            if (data.questions.length === 0) {
                Utils.showToast('没有检测到题目，请检查文档', 'error');
                return;
            }

            // 生成HTML
            this.state.generatedHtml = Generator.generate(data, {
                includeActivation: document.getElementById('includeActivation').checked
            });

            // 更新预览
            this.previewHTML();

            // 启用下载按钮
            document.getElementById('downloadBtn').disabled = false;

            // 显示结果信息
            document.getElementById('resultInfo').style.display = 'block';
            document.getElementById('resultActivationCode').textContent = data.activationCode;
            const themeEl = document.getElementById('resultTheme');
            if (themeEl) themeEl.textContent = theme.name;

            // 保存激活码记录
            const abbr = Utils.extractAbbr(data.title);
            const record = {
                id: this.state.activationRecords.length + 1,
                name: data.title,
                abbr: abbr,
                activationCode: data.activationCode,
                file: Utils.sanitizeFilename(data.title) + '.html',
                createdAt: Utils.formatDate(new Date()),
                themeId: theme.id
            };
            this.saveActivationRecord(record);

            Utils.showToast('HTML生成成功！', 'success');

        } catch (error) {
            console.error('生成失败:', error);
            Utils.showToast('生成失败: ' + error.message, 'error');
        }
    },

    // 预览HTML
    previewHTML() {
        if (!this.state.generatedHtml) {
            const theme = this.ensureTheme(false);
            const data = this.collectFormData();
            data.primaryColor = theme.primaryColor;
            data.bgColor = theme.bgColor;
            this.state.generatedHtml = Generator.generate(data, {
                includeActivation: document.getElementById('includeActivation')?.checked ?? true
            });
        }

        const iframe = document.getElementById('previewFrame');
        iframe.srcdoc = this.state.generatedHtml;
    },

    // 下载HTML
    downloadHTML() {
        if (!this.state.generatedHtml) {
            Utils.showToast('请先生成HTML', 'error');
            return;
        }

        const data = this.collectFormData();
        const filename = Utils.sanitizeFilename(data.title) + '.html';

        Utils.downloadFile(this.state.generatedHtml, filename);
        Utils.showToast('文件下载成功！', 'success');
    },

    // 显示设置
    loadSettings() {
        const config = AI.loadConfig();
        document.getElementById('aiProvider').value = config.provider || 'deepseek';
        document.getElementById('apiKey').value = config.apiKey || '';
        document.getElementById('apiBaseUrl').value = config.baseUrl || '';
        document.getElementById('aiModel').value = config.model || '';
        document.getElementById('vercelToken').value = Utils.storage.get('vercel_token') || '';
    },

    // AI服务商切换
    onProviderChange(provider) {
        const providerConfig = AI.providers[provider];
        if (providerConfig) {
            document.getElementById('apiBaseUrl').value = providerConfig.baseUrl;
            document.getElementById('aiModel').value = providerConfig.model;
        }
    },

    // 保存设置
    saveSettings() {
        const provider = document.getElementById('aiProvider').value;
        AI.config.provider = provider;
        AI.config.apiKey = document.getElementById('apiKey').value;
        AI.config.baseUrl = document.getElementById('apiBaseUrl').value || (AI.providers[provider]?.baseUrl || '');
        AI.config.model = document.getElementById('aiModel').value || (AI.providers[provider]?.model || '');

        AI.saveConfig();
        Utils.storage.set('vercel_token', document.getElementById('vercelToken').value);

        this.hideModal('settingsModal');
        Utils.showToast('设置已保存', 'success');
    },

    // 显示历史记录
    showHistory() {
        const tbody = document.getElementById('historyTableBody');
        const records = this.state.activationRecords;

        if (records.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #9CA3AF;">暂无记录</td></tr>';
        } else {
            tbody.innerHTML = records.map(r => `
                <tr>
                    <td>${this.escapeHtml(r.name)}</td>
                    <td><code>${r.activationCode}</code></td>
                    <td>${r.abbr || '-'}</td>
                    <td>${r.file}</td>
                    <td>${r.createdAt}</td>
                </tr>
            `).join('');
        }

        this.showModal('historyModal');
    },

    // 导出历史记录
    exportHistory() {
        const records = this.state.activationRecords;
        const content = JSON.stringify({
            schemaVersion: 1,
            activationCodePolicy: 'fixed_numeric',
            records: records
        }, null, 2);

        Utils.downloadFile(content, 'activation-codes.json', 'application/json');
        Utils.showToast('配置已导出', 'success');
    },

    // 显示模态框
    showModal(id) {
        document.getElementById(id).classList.add('show');
    },

    // 隐藏模态框
    hideModal(id) {
        document.getElementById(id).classList.remove('show');
    },

    // 截断文本
    truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    },

    // HTML转义
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
