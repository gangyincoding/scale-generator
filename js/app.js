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
        activationRegistryLoaded: false,
        activationRegistryMeta: {
            schemaVersion: 1,
            activationCodePolicy: 'fixed_numeric',
            lastCode: {}
        },
        activationRepoRecords: [],
        activationDraftRecords: [],
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
            this.state.activationDraftRecords = saved;
        }

        const drafts = Array.isArray(this.state.activationDraftRecords) ? this.state.activationDraftRecords : [];
        this.state.activationDraftRecords = drafts.map(r => this.normalizeActivationRecord(r));
        this.state.activationRepoRecords = [];
        this.state.activationRecords = this.sortActivationRecords(this.state.activationDraftRecords);
        this.state.activationRegistryMeta = {
            schemaVersion: 1,
            activationCodePolicy: 'fixed_numeric',
            lastCode: this.computeLastCode(this.state.activationRecords, {})
        };
        this.state.activationRegistryLoaded = false;

        this.refreshActivationRegistryFromRepo().catch(e => {
            console.warn('Failed to refresh activation registry from repo:', e);
        });
    },

    // 保存激活码记录
    saveActivationRecord(record) {
        this.state.activationDraftRecords.push(record);
        this.state.activationRecords.push(record);
        this.state.activationRecords = this.sortActivationRecords(this.state.activationRecords);
        this.state.activationRegistryMeta.lastCode = this.computeLastCode(this.state.activationRecords, this.state.activationRegistryMeta.lastCode);
        Utils.storage.set('activation_records', this.state.activationDraftRecords);
    },

    sortActivationRecords(records) {
        return (records || []).slice().sort((a, b) => (Number(a.id) || 0) - (Number(b.id) || 0));
    },

    normalizeActivationRecord(raw) {
        const r = raw && typeof raw === 'object' ? { ...raw } : {};
        if (r.name === undefined && r.title !== undefined) r.name = r.title;
        r.name = (r.name ?? '').toString();
        r.abbr = (r.abbr ?? '').toString().trim() || (r.name ? Utils.extractAbbr(r.name) : '');
        r.activationCode = (r.activationCode ?? '').toString().trim();
        r.code = (r.code ?? '').toString().trim();
        r.file = (r.file ?? '').toString().trim() || (r.name ? (Utils.sanitizeFilename(r.name) + '.html') : '');
        r.createdAt = (r.createdAt ?? '').toString().trim() || Utils.formatDate(new Date());
        return r;
    },

    computeLastCode(records, seed = {}) {
        const lastCode = { ...(seed || {}) };
        const list = Array.isArray(records) ? records : [];

        for (const r of list) {
            const code = (r && r.code !== undefined) ? String(r.code) : '';
            const m = code.match(/^([A-Z]{2,})(\d+)$/);
            if (!m) continue;
            const abbr = m[1];
            const n = parseInt(m[2], 10);
            if (!Number.isFinite(n)) continue;
            lastCode[abbr] = Math.max(lastCode[abbr] || 0, n);
        }

        return lastCode;
    },

    async refreshActivationRegistryFromRepo() {
        let repoRegistry = null;
        const resp = await fetch('config/activation-codes.json', { cache: 'no-store' });
        if (!resp.ok) return;
        repoRegistry = await resp.json();

        const repoRecords = Array.isArray(repoRegistry?.records) ? repoRegistry.records : [];
        const seedLastCode = (repoRegistry && typeof repoRegistry.lastCode === 'object' && repoRegistry.lastCode) ? repoRegistry.lastCode : {};

        const merged = this.mergeActivationRegistry(repoRecords, this.state.activationDraftRecords, seedLastCode);
        this.state.activationRepoRecords = merged.repoRecords;
        this.state.activationDraftRecords = merged.draftRecords;
        this.state.activationRecords = merged.allRecords;
        this.state.activationRegistryMeta = {
            schemaVersion: repoRegistry?.schemaVersion || 1,
            activationCodePolicy: repoRegistry?.activationCodePolicy || 'fixed_numeric',
            lastCode: merged.lastCode
        };
        this.state.activationRegistryLoaded = true;

        Utils.storage.set('activation_records', this.state.activationDraftRecords);
    },

    mergeActivationRegistry(repoRecordsRaw, draftRecordsRaw, seedLastCode) {
        const repoRecords = Array.isArray(repoRecordsRaw) ? repoRecordsRaw : [];
        const draftRecords = Array.isArray(draftRecordsRaw) ? draftRecordsRaw : [];

        const normalizedRepo = repoRecords.map(r => this.normalizeActivationRecord(r));
        const usedIds = new Set(normalizedRepo.map(r => Number(r.id)).filter(n => Number.isFinite(n)));
        let nextId = Math.max(0, ...Array.from(usedIds)) + 1;

        let lastCode = this.computeLastCode(normalizedRepo, seedLastCode);

        const seenActivationCodes = new Set(
            normalizedRepo
                .map(r => (r.activationCode ?? '').toString().trim())
                .filter(Boolean)
        );

        const normalizedDrafts = [];
        for (const raw of draftRecords) {
            const r = this.normalizeActivationRecord(raw);

            const desiredId = Number(r.id);
            if (!Number.isFinite(desiredId) || usedIds.has(desiredId)) {
                r.id = nextId++;
            } else {
                usedIds.add(desiredId);
            }

            if (!r.code && r.abbr) {
                r.code = Utils.generateInternalCode(r.abbr, lastCode[r.abbr] || 0);
                lastCode[r.abbr] = (lastCode[r.abbr] || 0) + 1;
            }

            const activationCode = (r.activationCode ?? '').toString().trim();
            if (activationCode && seenActivationCodes.has(activationCode)) {
                r._activationCodeConflict = true;
            }
            if (activationCode) seenActivationCodes.add(activationCode);

            normalizedDrafts.push(r);
        }

        // De-dupe drafts that are already in repo (by activationCode).
        const merged = normalizedRepo.slice();
        const repoActivationCodes = new Set(
            normalizedRepo
                .map(r => (r.activationCode ?? '').toString().trim())
                .filter(Boolean)
        );

        const filteredDrafts = normalizedDrafts.filter(d => {
            const activationCode = (d.activationCode ?? '').toString().trim();
            return !activationCode || !repoActivationCodes.has(activationCode);
        });

        for (const d of filteredDrafts) {
            merged.push(d);
        }

        // Backfill abbr when only internal code exists.
        merged.forEach(r => {
            if (r.code && !r.abbr) {
                const m = String(r.code).match(/^([A-Z]{2,})(\d+)$/);
                if (m) r.abbr = m[1];
            }
        });

        lastCode = this.computeLastCode(merged, lastCode);

        return {
            repoRecords: normalizedRepo,
            draftRecords: filteredDrafts,
            allRecords: this.sortActivationRecords(merged),
            lastCode
        };
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
        const autoRangesBtn = document.getElementById('autoResultRangesBtn');
        if (autoRangesBtn) {
            autoRangesBtn.addEventListener('click', () => {
                this.autoGenerateResultRanges();
            });
        }

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

    autoGenerateResultRanges() {
        const items = Array.from(document.querySelectorAll('#resultsList .result-item'));
        if (items.length === 0) {
            Utils.showToast('暂无结果项可生成区间', 'error');
            return;
        }

        const parsed = items.map((item, i) => {
            const inputs = item.querySelectorAll('input');
            const textarea = item.querySelector('textarea');
            const min = parseInt(inputs?.[0]?.value);
            const max = parseInt(inputs?.[1]?.value);
            const type = (inputs?.[2]?.value || '').trim();
            const desc = (textarea?.value || '').trim();
            return { inputs, min, max, type, desc, i };
        });

        // Treat `0-0` as an unconfigured placeholder (common when parsing docs).
        // Only block auto-generation when at least one range has a non-zero bound.
        const hasNonPlaceholderRange = parsed.some(r =>
            (Number.isFinite(r.min) && r.min !== 0) || (Number.isFinite(r.max) && r.max !== 0)
        );
        if (hasNonPlaceholderRange) {
            Utils.showToast('已存在分数区间，未自动生成（如需重置请先清空区间）', 'info');
            return;
        }

        const candidates = parsed.filter(r => r.type || r.desc);
        if (candidates.length === 0) {
            Utils.showToast('请先填写至少一条结果类型或描述', 'error');
            return;
        }

        const questionCount = (this.state.quizData?.questions || []).length;
        if (!questionCount) {
            Utils.showToast('题目为空，无法计算分数区间', 'error');
            return;
        }

        const optionType = document.getElementById('optionType')?.value || 'scale4';
        let minPerQuestion = 1;
        let maxPerQuestion = 4;
        if (optionType === 'yesno') {
            minPerQuestion = 0;
            maxPerQuestion = 1;
        } else {
            const options = Parser.getDefaultOptions(optionType);
            const numericValues = options
                .map(o => parseInt(o.value, 10))
                .filter(n => !isNaN(n));
            maxPerQuestion = numericValues.length > 0 ? Math.max(...numericValues) : 4;
            minPerQuestion = numericValues.length > 0 ? Math.min(...numericValues) : 1;
        }

        const minScore = questionCount * minPerQuestion;
        const maxScore = questionCount * maxPerQuestion;
        const k = candidates.length;
        const span = Math.max(1, (maxScore - minScore + 1));
        const base = Math.floor(span / k);
        const rem = span % k;

        let cursor = minScore;
        candidates.forEach((r, idx) => {
            const len = base + (idx < rem ? 1 : 0);
            const start = cursor;
            const end = Math.min(maxScore, cursor + len - 1);
            cursor = end + 1;

            if (r.inputs?.[0]) r.inputs[0].value = String(start);
            if (r.inputs?.[1]) r.inputs[1].value = String(end);
            if (r.inputs?.[2] && !r.type) r.inputs[2].value = `结果${idx + 1}`;
        });

        Utils.showToast('已生成分数区间，可按需微调', 'success');
    },

    // 从表单收集数据
    collectFormData() {
        const aiScoring = (this.state.quizData && this.state.quizData.scoring && typeof this.state.quizData.scoring === 'object')
            ? this.state.quizData.scoring
            : {};
        const dimensions = (Array.isArray(aiScoring.dimensions) ? aiScoring.dimensions : [])
            .map(d => {
                const name = (d && d.name !== undefined) ? String(d.name).trim() : '';
                const questions = (d && Array.isArray(d.questions)) ? d.questions : [];
                const normalizedQuestions = questions
                    .map(n => parseInt(String(n).trim(), 10))
                    .filter(n => Number.isFinite(n) && n > 0);
                const maxScore = (d && d.maxScore !== undefined) ? Number(d.maxScore) : NaN;
                return {
                    name,
                    questions: normalizedQuestions,
                    ...(Number.isFinite(maxScore) ? { maxScore } : {})
                };
            })
            .filter(d => d.name && Array.isArray(d.questions) && d.questions.length > 0);
        const formula = (typeof aiScoring.formula === 'string') ? aiScoring.formula.trim() : '';

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
                    .filter(n => !isNaN(n)),
                dimensions,
                formula
            },
            results: []
        };

        const aiResults = Array.isArray(this.state.quizData?.results) ? this.state.quizData.results : [];
        const draftResults = [];
        const manualRanges = [];

        // 收集结果设置
        document.querySelectorAll('#resultsList .result-item').forEach(item => {
            const inputs = item.querySelectorAll('input');
            const textarea = item.querySelector('textarea');
            const idx = parseInt(item.dataset.index, 10);

            const min = parseInt(inputs[0].value);
            const max = parseInt(inputs[1].value);
            const type = inputs[2].value.trim();
            const desc = textarea.value.trim();

            if (type || desc) {
                draftResults.push({ min, max, type, desc, idx });
            }

            if (!isNaN(min) && !isNaN(max) && type) {
                manualRanges.push({ min, max });
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

        // If all configured ranges are `0-0`, treat them as placeholders and fall back to auto-splitting.
        if (data.results.length > 0 && manualRanges.length === data.results.length) {
            const allZeroRanges = manualRanges.every(r => r.min === 0 && r.max === 0);
            if (allZeroRanges) {
                const questionCount = (data.questions || []).length;
                if (questionCount > 0) {
                    const optionType = data.optionType || 'scale4';
                    let maxPerQuestion = 4;
                    if (optionType === 'yesno') {
                        maxPerQuestion = 1;
                    } else {
                        const opts = Parser.getDefaultOptions(optionType);
                        const numericValues = opts
                            .map(o => parseInt(o.value, 10))
                            .filter(n => !isNaN(n));
                        maxPerQuestion = numericValues.length > 0 ? Math.max(...numericValues) : 4;
                    }

                    const maxScore = questionCount * maxPerQuestion;
                    if (maxScore > 0) data.results = [];
                }
            }
        }

        // 如果没有设置结果，使用默认结果
        if (data.results.length === 0) {
            if (draftResults.length > 0) {
                const questionCount = (data.questions || []).length;
                const optionType = data.optionType || 'scale4';

                let minPerQuestion = 1;
                let maxPerQuestion = 4;
                if (optionType === 'yesno') {
                    minPerQuestion = 0;
                    maxPerQuestion = 1;
                } else {
                    const opts = Parser.getDefaultOptions(optionType);
                    const numericValues = opts
                        .map(o => parseInt(o.value, 10))
                        .filter(n => !isNaN(n));
                    maxPerQuestion = numericValues.length > 0 ? Math.max(...numericValues) : 4;
                    minPerQuestion = numericValues.length > 0 ? Math.min(...numericValues) : 1;
                }

                const minScore = questionCount * minPerQuestion;
                const maxScore = questionCount * maxPerQuestion;
                const k = Math.max(1, draftResults.length);
                const span = Math.max(1, (maxScore - minScore + 1));
                const base = Math.floor(span / k);
                const rem = span % k;

                let cursor = minScore;
                draftResults.forEach((r, i) => {
                    const len = base + (i < rem ? 1 : 0);
                    const start = cursor;
                    const end = Math.min(maxScore, cursor + len - 1);
                    cursor = end + 1;

                    const t = (r.type || '').trim() || `结果${i + 1}`;
                    const d = (r.desc || '').trim() || `你的得分在${start}-${end}分之间，属于${t}。`;
                    const aiAnalysis = Number.isFinite(r.idx) ? aiResults[r.idx]?.analysis : null;
                    const analysis = Array.isArray(aiAnalysis) && aiAnalysis.length > 0
                        ? aiAnalysis
                        : [
                            { label: '得分说明', text: `你的得分为${start}-${end}分。` },
                            { label: '核心解读', text: d },
                            { label: '建议', text: '建议结合自身情况进行自我观察，如有需要可寻求专业帮助。' }
                        ];

                    data.results.push({
                        condition: `total >= ${start} && total <= ${end}`,
                        type: t,
                        description: d,
                        tags: [t],
                        analysis
                    });
                });

                data._resultsAutoGenerated = true;
            } else {
                data.results = this.generateDefaultResults(data.questions.length, data.optionType);
            }
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
            if (data._resultsAutoGenerated) {
                Utils.showToast('已自动根据题目数划分分数区间（可在结果设置中手动调整）', 'info');
            }

            // 验证必填字段
            if (!data.title) {
                Utils.showToast('请输入量表名称', 'error');
                return;
            }
            if (!data.activationCode) {
                Utils.showToast('请输入激活码', 'error');
                return;
            }
            const activationCode = String(data.activationCode).trim();
            const dup = this.state.activationRecords.find(r => String(r.activationCode || '').trim() === activationCode);
            if (dup) {
                Utils.showToast('激活码已存在，请更换新的码', 'error');
                return;
                Utils.showToast('婵€娲荤爜宸插瓨鍦紝璇锋洿鎹㈡柊鐨勭爜', 'error');
                return;
            }
            if (data.questions.length === 0) {
                Utils.showToast('没有检测到题目，请检查文档', 'error');
                return;
            }

            // 生成HTML
            const abbr = Utils.extractAbbr(data.title);
            const lastCodeMap = this.state.activationRegistryMeta?.lastCode || {};
            const internalCode = Utils.generateInternalCode(abbr, lastCodeMap[abbr] || 0);
            data.storageKeySeed = internalCode;

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
            lastCodeMap[abbr] = (lastCodeMap[abbr] || 0) + 1;

            const nextId = Math.max(0, ...this.state.activationRecords.map(r => Number(r.id) || 0)) + 1;
            const record = {
                id: nextId,
                name: data.title,
                abbr: abbr,
                code: internalCode,
                activationCode: activationCode,
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
        const records = this.sortActivationRecords(this.state.activationRecords);

        if (records.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #9CA3AF;">暂无记录</td></tr>';
        } else {
            tbody.innerHTML = records.map(r => `
                <tr>
                    <td>${this.escapeHtml(r.name)}</td>
                    <td><code>${r.activationCode}</code></td>
                    <td>${r.code || '-'}</td>
                    <td>${r.file}</td>
                    <td>${r.createdAt}</td>
                </tr>
            `).join('');
        }

        this.showModal('historyModal');
    },

    // 导出历史记录
    exportHistory() {
        const meta = this.state.activationRegistryMeta || {};
        const records = this.sortActivationRecords(this.state.activationRecords).map(r => ({
            id: r.id,
            abbr: r.abbr,
            name: r.name,
            code: r.code,
            activationCode: r.activationCode,
            file: r.file,
            createdAt: r.createdAt
        }));
        const lastCode = this.computeLastCode(records, {});
        const content = JSON.stringify({
            schemaVersion: meta.schemaVersion || 1,
            activationCodePolicy: meta.activationCodePolicy || 'fixed_numeric',
            lastCode,
            records
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
