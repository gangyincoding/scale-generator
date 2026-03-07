/**
 * HTML生成模块
 */

const Generator = {
    themes: [
        { id: 'indigo', name: '靛蓝', primaryColor: '#6366F1', bgColor: '#F5F7FA' },
        { id: 'emerald', name: '翡翠绿', primaryColor: '#10B981', bgColor: '#ECFDF5' },
        { id: 'amber', name: '琥珀橙', primaryColor: '#F59E0B', bgColor: '#FFFBEB' },
        { id: 'rose', name: '玫瑰红', primaryColor: '#F43F5E', bgColor: '#FFF1F2' },
        { id: 'sky', name: '天空蓝', primaryColor: '#0EA5E9', bgColor: '#F0F9FF' },
        { id: 'violet', name: '紫罗兰', primaryColor: '#8B5CF6', bgColor: '#F5F3FF' },
        { id: 'teal', name: '青绿色', primaryColor: '#14B8A6', bgColor: '#F0FDFA' }
    ],

    pickRandomTheme(excludeId = null) {
        const pool = excludeId ? this.themes.filter(t => t.id !== excludeId) : this.themes;
        const list = pool.length > 0 ? pool : this.themes;
        const idx = Math.floor(Math.random() * list.length);
        return list[idx];
    },

    /**
     * 生成HTML文件
     * @param {Object} data - 量表数据
     * @param {Object} options - 生成选项
     * @returns {string} - HTML内容
     */
    generate(data, options = {}) {
        const {
            title = '心理测试',
            subtitle = '',
            description = '',
            questions = [],
            options: quizOptions = [],
            scoring = {},
            results = [],
            activationCode = '',
            storageKeySeed = '',
            primaryColor = '#6366F1',
            bgColor = null
        } = data;

        const storageKey = this.generateStorageKey(storageKeySeed || activationCode || title);

        return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>${this.escapeHtml(title)}</title>
    <style>
${this.generateStyles(primaryColor, bgColor)}
    </style>
</head>
<body>
${this.generateActivationPage(primaryColor)}
${this.generateHomePage(title, subtitle, description, questions.length)}
${this.generateQuizPage(questions, quizOptions)}
${this.generateLoadingPage()}
${this.generateResultPage()}
    <script>
${this.generateScript(questions, quizOptions, scoring, results, activationCode, storageKey, primaryColor)}
    </script>
</body>
</html>`;
    },

    /**
     * 生成CSS样式
     */
    generateStyles(primaryColor, bgColor) {
        const primaryLight = this.lightenColor(primaryColor, 20);
        const primaryDark = this.darkenColor(primaryColor, 20);
        const secondaryColor = this.hexToRgba(primaryColor, 0.1);
        const shadowColor20 = this.hexToRgba(primaryColor, 0.2);
        const shadowColor35 = this.hexToRgba(primaryColor, 0.35);
        const ringColor10 = this.hexToRgba(primaryColor, 0.1);

        return `
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        :root {
            --primary-color: ${primaryColor};
            --primary-light: ${primaryLight};
            --primary-dark: ${primaryDark};
            --secondary-color: ${secondaryColor};
            --bg-color: ${bgColor || '#F5F7FA'};
            --text-primary: #1F2937;
            --text-secondary: #6B7280;
            --text-light: #9CA3AF;
            --white: #FFFFFF;
            --success: #10B981;
            --warning: #F59E0B;
            --danger: #EF4444;
            --border-radius: 16px;
            --border-radius-sm: 12px;
            --shadow: 0 4px 20px ${shadowColor20};
            --shadow-sm: 0 2px 10px rgba(0, 0, 0, 0.05);
            --ring: 0 0 0 3px ${ringColor10};
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
            background: var(--bg-color);
            color: var(--text-primary);
            line-height: 1.6;
            min-height: 100vh;
            overflow-x: hidden;
        }

        .page {
            display: none;
            min-height: 100vh;
            padding: 20px;
            animation: fadeIn 0.3s ease;
        }

        .page.active {
            display: block;
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }

        /* 首页 */
        .home-page {
            display: flex;
            flex-direction: column;
            align-items: center;
            max-width: 480px;
            margin: 0 auto;
            padding-top: 40px;
        }

        .back-btn {
            position: absolute;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: var(--primary-color);
            color: var(--white);
            border: none;
            padding: 10px 20px;
            border-radius: 20px;
            font-size: 14px;
            cursor: pointer;
            transition: all 0.3s ease;
        }

        .back-btn:hover {
            background: var(--primary-dark);
            transform: translateX(-50%) scale(1.02);
        }

        .logo-section {
            text-align: center;
            margin-top: 60px;
            margin-bottom: 30px;
        }

        .logo-icon {
            width: 80px;
            height: 80px;
            background: linear-gradient(135deg, var(--primary-color), var(--primary-light));
            border-radius: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 20px;
            box-shadow: var(--shadow);
        }

        .logo-icon svg {
            width: 48px;
            height: 48px;
            fill: var(--white);
        }

        .main-title {
            font-size: 28px;
            font-weight: 700;
            color: var(--primary-color);
            margin-bottom: 8px;
        }

        .sub-title {
            font-size: 18px;
            color: var(--primary-dark);
            font-weight: 600;
        }

        .intro-card {
            background: var(--white);
            border-radius: var(--border-radius);
            padding: 24px;
            margin-bottom: 24px;
            border: 2px solid var(--primary-color);
            box-shadow: var(--shadow-sm);
        }

        .intro-card p {
            font-size: 14px;
            color: var(--text-secondary);
            margin-bottom: 12px;
            line-height: 1.8;
        }

        .intro-card p:last-child {
            margin-bottom: 0;
        }

        .intro-card strong {
            color: var(--primary-color);
        }

        .features {
            display: flex;
            gap: 12px;
            margin-bottom: 30px;
            width: 100%;
        }

        .feature-item {
            flex: 1;
            background: var(--white);
            border-radius: var(--border-radius-sm);
            padding: 16px 12px;
            text-align: center;
            box-shadow: var(--shadow-sm);
            transition: transform 0.3s ease;
        }

        .feature-item:hover {
            transform: translateY(-2px);
        }

        .feature-icon {
            width: 40px;
            height: 40px;
            background: var(--secondary-color);
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 8px;
        }

        .feature-icon svg {
            width: 24px;
            height: 24px;
            fill: var(--primary-color);
        }

        .feature-title {
            font-size: 16px;
            font-weight: 700;
            color: var(--text-primary);
            margin-bottom: 4px;
        }

        .feature-desc {
            font-size: 12px;
            color: var(--text-secondary);
        }

        .start-btn {
            width: 100%;
            max-width: 320px;
            background: linear-gradient(135deg, var(--primary-color), var(--primary-dark));
            color: var(--white);
            border: none;
            padding: 16px 32px;
            border-radius: 30px;
            font-size: 18px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            box-shadow: var(--shadow);
        }

        .start-btn:hover {
            transform: scale(1.02);
            box-shadow: 0 6px 30px ${shadowColor35};
        }

        .start-btn svg {
            width: 20px;
            height: 20px;
            fill: var(--white);
        }

        /* 答题页面 */
        .quiz-page {
            max-width: 600px;
            margin: 0 auto;
            padding-top: 20px;
        }

        .progress-section {
            background: var(--white);
            border-radius: var(--border-radius-sm);
            padding: 16px 20px;
            margin-bottom: 20px;
            box-shadow: var(--shadow-sm);
        }

        .progress-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
        }

        .progress-label {
            font-size: 14px;
            color: var(--text-secondary);
        }

        .progress-count {
            font-size: 14px;
            font-weight: 600;
            color: var(--primary-color);
        }

        .progress-bar {
            height: 8px;
            background: var(--secondary-color);
            border-radius: 4px;
            overflow: hidden;
        }

        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, var(--primary-color), var(--primary-light));
            border-radius: 4px;
            transition: width 0.3s ease;
        }

        .question-card {
            background: var(--white);
            border-radius: var(--border-radius);
            padding: 24px;
            margin-bottom: 20px;
            box-shadow: var(--shadow-sm);
        }

        .question-number {
            font-size: 14px;
            font-weight: 600;
            color: var(--primary-color);
            margin-bottom: 12px;
        }

        .question-text {
            font-size: 17px;
            font-weight: 500;
            color: var(--text-primary);
            line-height: 1.6;
            margin-bottom: 20px;
        }

        .options-list {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }

        .option-item {
            display: flex;
            align-items: center;
            padding: 14px 18px;
            background: var(--bg-color);
            border-radius: var(--border-radius-sm);
            cursor: pointer;
            transition: all 0.3s ease;
            border: 2px solid transparent;
        }

        .option-item:hover {
            background: var(--secondary-color);
        }

        .option-item.selected {
            background: var(--secondary-color);
            border-color: var(--primary-color);
        }

        .option-circle {
            width: 22px;
            height: 22px;
            border-radius: 50%;
            background: transparent;
            border: 2px solid #D1D5DB;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-right: 12px;
            flex-shrink: 0;
            transition: all 0.3s ease;
            position: relative;
        }

        .option-circle::after {
            content: '';
            width: 10px;
            height: 10px;
            border-radius: 50%;
            background: var(--primary-color);
            transform: scale(0);
            transition: transform 0.2s ease;
        }

        .option-item:hover .option-circle {
            border-color: var(--primary-light);
        }

        .option-item.selected .option-circle {
            border-color: var(--primary-color);
        }

        .option-item.selected .option-circle::after {
            transform: scale(1);
        }

        .option-text {
            font-size: 14px;
            color: var(--text-primary);
        }

        .nav-buttons {
            display: flex;
            gap: 12px;
            margin-top: 20px;
        }

        .nav-btn {
            flex: 1;
            padding: 14px 20px;
            border-radius: var(--border-radius-sm);
            font-size: 15px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.3s ease;
            border: none;
        }

        .nav-btn.prev {
            background: var(--white);
            color: var(--text-secondary);
            border: 1px solid #E5E7EB;
        }

        .nav-btn.prev:hover {
            background: var(--bg-color);
        }

        .nav-btn.next {
            background: var(--primary-color);
            color: var(--white);
        }

        .nav-btn.next:hover {
            background: var(--primary-dark);
        }

        .nav-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        /* 加载页面 */
        .loading-page {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            text-align: center;
        }

        .loading-spinner {
            width: 60px;
            height: 60px;
            border: 4px solid var(--secondary-color);
            border-top-color: var(--primary-color);
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-bottom: 24px;
        }

        @keyframes spin {
            to { transform: rotate(360deg); }
        }

        .loading-title {
            font-size: 20px;
            font-weight: 600;
            color: var(--text-primary);
            margin-bottom: 8px;
        }

        .loading-subtitle {
            font-size: 14px;
            color: var(--text-secondary);
        }

        /* 结果页面 */
        .result-page {
            max-width: 600px;
            margin: 0 auto;
            padding-bottom: 40px;
        }

        .result-header {
            text-align: center;
            padding: 30px 20px;
        }

        .result-title {
            font-size: 24px;
            font-weight: 700;
            color: var(--primary-color);
            margin-bottom: 8px;
        }

        .result-subtitle {
            font-size: 14px;
            color: var(--text-secondary);
        }

        .result-main {
            background: linear-gradient(135deg, var(--primary-color), var(--primary-dark));
            border-radius: var(--border-radius);
            padding: 30px 24px;
            color: var(--white);
            text-align: center;
            margin-bottom: 24px;
            box-shadow: var(--shadow);
        }

        .result-score {
            font-size: 48px;
            font-weight: 700;
            margin-bottom: 8px;
        }

        .result-type {
            font-size: 20px;
            margin-bottom: 16px;
            opacity: 0.95;
        }

        .result-tags {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            justify-content: center;
            margin-bottom: 16px;
        }

        .result-tag {
            background: rgba(255, 255, 255, 0.2);
            padding: 6px 14px;
            border-radius: 20px;
            font-size: 13px;
        }

        .result-desc {
            font-size: 14px;
            line-height: 1.8;
            opacity: 0.95;
        }

        .analysis-section {
            background: var(--white);
            border-radius: var(--border-radius);
            padding: 24px;
            margin-bottom: 24px;
            box-shadow: var(--shadow-sm);
        }

        .analysis-title {
            font-size: 16px;
            font-weight: 600;
            color: var(--text-primary);
            margin-bottom: 16px;
            padding-bottom: 12px;
            border-bottom: 1px solid var(--bg-color);
        }

        .analysis-item {
            margin-bottom: 16px;
        }

        .analysis-item:last-child {
            margin-bottom: 0;
        }

        .analysis-label {
            font-size: 14px;
            font-weight: 500;
            color: var(--primary-color);
            margin-bottom: 6px;
        }

        .analysis-text {
            font-size: 14px;
            color: var(--text-secondary);
            line-height: 1.7;
        }

        .action-buttons {
            display: flex;
            gap: 12px;
        }

        .action-btn {
            flex: 1;
            padding: 14px 20px;
            border-radius: var(--border-radius-sm);
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            border: none;
        }

        .action-btn.primary {
            background: var(--primary-color);
            color: var(--white);
        }

        .action-btn.primary:hover {
            background: var(--primary-dark);
        }

        .action-btn.secondary {
            background: var(--white);
            color: var(--text-primary);
            border: 1px solid #E5E7EB;
        }

        .action-btn.secondary:hover {
            background: var(--bg-color);
        }

        .action-btn svg {
            width: 18px;
            height: 18px;
            fill: currentColor;
        }

        /* 激活码页面 */
        .activation-page {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            padding: 20px;
            text-align: center;
        }

        .activation-card {
            background: var(--white);
            border-radius: var(--border-radius);
            padding: 40px 30px;
            max-width: 360px;
            width: 100%;
            box-shadow: var(--shadow);
        }

        .activation-icon {
            width: 70px;
            height: 70px;
            background: linear-gradient(135deg, var(--primary-color), var(--primary-light));
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 24px;
        }

        .activation-icon svg {
            width: 36px;
            height: 36px;
            fill: var(--white);
        }

        .activation-title {
            font-size: 22px;
            font-weight: 700;
            color: var(--text-primary);
            margin-bottom: 8px;
        }

        .activation-subtitle {
            font-size: 14px;
            color: var(--text-secondary);
            margin-bottom: 24px;
        }

        .activation-input {
            width: 100%;
            padding: 14px 16px;
            border: 2px solid #E5E7EB;
            border-radius: var(--border-radius-sm);
            font-size: 18px;
            text-align: center;
            letter-spacing: 4px;
            font-weight: 600;
            transition: all 0.3s ease;
            outline: none;
        }

        .activation-input:focus {
            border-color: var(--primary-color);
            box-shadow: var(--ring);
        }

        .activation-input.error {
            border-color: var(--danger);
            animation: shake 0.5s ease;
        }

        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            20%, 60% { transform: translateX(-5px); }
            40%, 80% { transform: translateX(5px); }
        }

        .activation-error {
            color: var(--danger);
            font-size: 13px;
            margin-top: 12px;
            min-height: 20px;
        }

        .activation-btn {
            width: 100%;
            padding: 14px;
            background: linear-gradient(135deg, var(--primary-color), var(--primary-dark));
            color: var(--white);
            border: none;
            border-radius: var(--border-radius-sm);
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            margin-top: 20px;
            transition: all 0.3s ease;
        }

        .activation-btn:hover {
            transform: scale(1.02);
            box-shadow: var(--shadow);
        }

        .activation-tip {
            font-size: 12px;
            color: var(--text-light);
            margin-top: 20px;
            line-height: 1.6;
        }

        @media (max-width: 480px) {
            .features {
                flex-direction: column;
            }

            .main-title {
                font-size: 24px;
            }

            .action-buttons {
                flex-direction: column;
            }
        }`;
    },

    /**
     * 生成激活码页面HTML
     */
    generateActivationPage(primaryColor) {
        return `
    <!-- 激活码页面 -->
    <div class="page active" id="activationPage">
        <div class="activation-page">
            <div class="activation-card">
                <div class="activation-icon">
                    <svg viewBox="0 0 24 24"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>
                </div>
                <h1 class="activation-title">请输入激活码</h1>
                <p class="activation-subtitle">购买后可获得激活码，解锁完整测试</p>
                <input type="text" class="activation-input" id="activationInput" placeholder="请输入激活码" maxlength="10">
                <p class="activation-error" id="activationError"></p>
                <button class="activation-btn" onclick="verifyActivation()">立即激活</button>
                <p class="activation-tip">激活成功后，本设备可永久使用<br>如有问题请联系客服</p>
            </div>
        </div>
    </div>`;
    },

    /**
     * 生成首页HTML
     */
    generateHomePage(title, subtitle, description, questionCount) {
        const estimatedTime = Math.ceil(questionCount / 10);
        return `
    <!-- 首页 -->
    <div class="page" id="homePage">
        <div class="home-page">
            <button class="back-btn" onclick="goBack()">返回测试合集首页</button>

            <div class="logo-section">
                <div class="logo-icon">
                    <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                </div>
                <h1 class="main-title">${this.escapeHtml(title)}</h1>
                <h2 class="sub-title">${this.escapeHtml(subtitle || '探索你的内心世界')}</h2>
            </div>

            <div class="intro-card">
                <p>${this.escapeHtml(description || '这是一个专业的心理测试问卷，帮助你更好地了解自己。')}</p>
                <p>通过<strong>${questionCount}道题目</strong>，深入了解你的心理特质。</p>
            </div>

            <div class="features">
                <div class="feature-item">
                    <div class="feature-icon">
                        <svg viewBox="0 0 24 24"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>
                    </div>
                    <div class="feature-title">${estimatedTime}分钟</div>
                    <div class="feature-desc">快速完成</div>
                </div>
                <div class="feature-item">
                    <div class="feature-icon">
                        <svg viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/></svg>
                    </div>
                    <div class="feature-title">专业分析</div>
                    <div class="feature-desc">深度解读</div>
                </div>
                <div class="feature-item">
                    <div class="feature-icon">
                        <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                    </div>
                    <div class="feature-title">成长建议</div>
                    <div class="feature-desc">个性指导</div>
                </div>
            </div>

            <button class="start-btn" onclick="startQuiz()">
                开始测试
                <svg viewBox="0 0 24 24"><path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"/></svg>
            </button>
        </div>
    </div>`;
    },

    /**
     * 生成答题页面HTML
     */
    generateQuizPage(questions, options) {
        const optionsHtml = options.map(opt => `
                    <div class="option-item" data-value="${opt.value}" onclick="selectOption(this)">
                        <div class="option-circle"></div>
                        <div class="option-text">${this.escapeHtml(opt.text)}</div>
                    </div>`).join('\n');

        return `
    <!-- 答题页面 -->
    <div class="page" id="quizPage">
        <div class="quiz-page">
            <div class="progress-section">
                <div class="progress-header">
                    <span class="progress-label">答题进度</span>
                    <span class="progress-count" id="progressCount">1/${questions.length}</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" id="progressFill" style="width: ${(1 / questions.length * 100).toFixed(2)}%"></div>
                </div>
            </div>

            <div class="question-card">
                <div class="question-number" id="questionNumber">Q1.</div>
                <div class="question-text" id="questionText"></div>
                <div class="options-list" id="optionsList">
${optionsHtml}
                </div>
            </div>

            <div class="nav-buttons">
                <button class="nav-btn prev" id="prevBtn" onclick="prevQuestion()" disabled>上一题</button>
                <button class="nav-btn next" id="nextBtn" onclick="nextQuestion()" disabled>下一题</button>
            </div>
        </div>
    </div>`;
    },

    /**
     * 生成加载页面HTML
     */
    generateLoadingPage() {
        return `
    <!-- 加载页面 -->
    <div class="page" id="loadingPage">
        <div class="loading-page">
            <div class="loading-spinner"></div>
            <div class="loading-title">正在分析你的答案...</div>
            <div class="loading-subtitle">请稍候</div>
        </div>
    </div>`;
    },

    /**
     * 生成结果页面HTML
     */
    generateResultPage() {
        return `
    <!-- 结果页面 -->
    <div class="page" id="resultPage">
        <div class="result-page">
            <div class="result-header">
                <h1 class="result-title">测试结果</h1>
                <p class="result-subtitle">基于你的回答分析</p>
            </div>

            <div class="result-main" id="resultMain">
                <div class="result-score" id="resultScore">0</div>
                <div class="result-type" id="resultType">分析中...</div>
                <div class="result-tags" id="resultTags"></div>
                <div class="result-desc" id="resultDesc"></div>
            </div>

            <div class="analysis-section">
                <h3 class="analysis-title">详细解读</h3>
                <div id="analysisContent"></div>
            </div>

            <div class="action-buttons">
                <button class="action-btn secondary" onclick="restartQuiz()">
                    <svg viewBox="0 0 24 24"><path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>
                    重新测试
                </button>
                <button class="action-btn primary" onclick="shareResult()">
                    <svg viewBox="0 0 24 24"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z"/></svg>
                    分享结果
                </button>
            </div>
        </div>
    </div>`;
    },

    /**
     * 生成JavaScript代码
     */
    generateScript(questions, quizOptions, scoring, results, activationCode, storageKey, primaryColor) {
        const questionsJson = JSON.stringify(questions);
        const optionsJson = JSON.stringify(quizOptions);
        const scoringJson = JSON.stringify(scoring);
        const resultsJson = JSON.stringify(results);
        const safeActivationCode = String(activationCode).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
        const safeStorageKey = String(storageKey).replace(/\\/g, '\\\\').replace(/'/g, "\\'");

        return `
        // 激活码配置
        const ACTIVATION_CODE = '${safeActivationCode}';
        const STORAGE_KEY = '${safeStorageKey}';
        const OPTIONS_CONFIG = ${optionsJson};

        // 页面加载时检查激活状态
        window.onload = function() {
            if (isActivated()) {
                showPage('homePage');
            } else {
                showPage('activationPage');
            }
            loadQuestion(0);
        };

        // 检查是否已激活
        function isActivated() {
            // Store and compare the activation code itself to avoid "key collision" bypass.
            return localStorage.getItem(STORAGE_KEY) === ACTIVATION_CODE;
        }

        // 验证激活码
        function verifyActivation() {
            const input = document.getElementById('activationInput');
            const error = document.getElementById('activationError');
            const code = input.value.trim();

            if (code === ACTIVATION_CODE) {
                localStorage.setItem(STORAGE_KEY, ACTIVATION_CODE);
                showPage('homePage');
                error.textContent = '';
            } else {
                input.classList.add('error');
                error.textContent = '激活码错误，请重新输入';
                setTimeout(() => {
                    input.classList.remove('error');
                }, 500);
            }
        }

        // 支持回车键激活
        document.addEventListener('DOMContentLoaded', function() {
            const input = document.getElementById('activationInput');
            if (input) {
                input.addEventListener('keypress', function(e) {
                    if (e.key === 'Enter') {
                        verifyActivation();
                    }
                });
            }
        });

        const questions = ${questionsJson};
        const scoringConfig = ${scoringJson};
        const resultsConfig = ${resultsJson};

        let currentQuestion = 0;
        let answers = new Array(questions.length).fill(null);

        function showPage(pageId) {
            document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
            document.getElementById(pageId).classList.add('active');
        }

        function startQuiz() {
            showPage('quizPage');
            loadQuestion(0);
        }

        function loadQuestion(index) {
            currentQuestion = index;
            document.getElementById('questionNumber').textContent = 'Q' + (index + 1) + '.';
            document.getElementById('questionText').textContent = questions[index].text || questions[index];
            document.getElementById('progressCount').textContent = (index + 1) + '/' + questions.length;
            document.getElementById('progressFill').style.width = ((index + 1) / questions.length * 100) + '%';

            document.querySelectorAll('.option-item').forEach(opt => opt.classList.remove('selected'));

            if (answers[index] !== null) {
                const selectedOpt = document.querySelector('.option-item[data-value="' + answers[index] + '"]');
                if (selectedOpt) selectedOpt.classList.add('selected');
            }

            document.getElementById('prevBtn').disabled = index === 0;
            updateNextButton();
        }

        function selectOption(element) {
            document.querySelectorAll('.option-item').forEach(opt => opt.classList.remove('selected'));
            element.classList.add('selected');
            answers[currentQuestion] = element.dataset.value;
            updateNextButton();
        }

        function updateNextButton() {
            const nextBtn = document.getElementById('nextBtn');
            nextBtn.disabled = answers[currentQuestion] === null;
            nextBtn.textContent = currentQuestion === questions.length - 1 ? '查看结果' : '下一题';
        }

        function prevQuestion() {
            if (currentQuestion > 0) {
                loadQuestion(currentQuestion - 1);
            }
        }

        function nextQuestion() {
            if (currentQuestion < questions.length - 1) {
                loadQuestion(currentQuestion + 1);
            } else {
                showResult();
            }
        }

        function getOptionRange() {
            const numeric = (OPTIONS_CONFIG || [])
                .map(o => {
                    const v = o && o.value !== undefined ? o.value : null;
                    const n = typeof v === 'number' ? v : parseFloat(String(v));
                    return Number.isFinite(n) ? n : null;
                })
                .filter(v => v !== null);

            if (numeric.length > 0) {
                return { min: Math.min(...numeric), max: Math.max(...numeric) };
            }

            const values = (OPTIONS_CONFIG || [])
                .map(o => (o && o.value !== undefined ? String(o.value).toLowerCase() : ''));
            if (values.includes('yes') || values.includes('no')) {
                return { min: 0, max: 1 };
            }

            // 默认兜底：0/1
            return { min: 0, max: 1 };
        }

        const OPTION_RANGE = getOptionRange();

        function getAnswerScore(answerValue) {
            if (answerValue === null || answerValue === undefined) return 0;

            if (typeof answerValue === 'number' && Number.isFinite(answerValue)) return answerValue;

            const s = String(answerValue).trim().toLowerCase();
            const n = parseFloat(s);
            if (Number.isFinite(n)) return n;

            if (s === 'yes' || s === 'true' || s === 'y') return 1;
            if (s === 'no' || s === 'false' || s === 'n') return 0;

            return 0;
        }

        function calculateTotalScore() {
            let total = 0;
            answers.forEach((answer, index) => {
                let score = getAnswerScore(answer);

                // 检查是否反向计分
                if (scoringConfig.reverseQuestions && scoringConfig.reverseQuestions.includes(index + 1)) {
                    score = (OPTION_RANGE.max + OPTION_RANGE.min) - score;
                }

                total += score;
            });
            return total;
        }

        function formatNumber(n) {
            if (typeof n !== 'number' || !Number.isFinite(n)) return '0';
            return Number.isInteger(n) ? String(n) : n.toFixed(2);
        }

        function calculateDimensionScores() {
            const dims = (scoringConfig && Array.isArray(scoringConfig.dimensions)) ? scoringConfig.dimensions : [];
            if (dims.length === 0) return [];

            const list = [];
            dims.forEach((dim, i) => {
                const name = (dim && dim.name) ? String(dim.name) : ('维度' + (i + 1));
                const questionsList = (dim && Array.isArray(dim.questions)) ? dim.questions : [];
                const qNums = questionsList
                    .map(n => parseInt(String(n).trim(), 10))
                    .filter(n => Number.isFinite(n) && n >= 1 && n <= questions.length);

                const questionCount = qNums.length;
                const minScore = questionCount * OPTION_RANGE.min;
                const maxScore = questionCount * OPTION_RANGE.max;

                let score = 0;
                let answeredCount = 0;
                qNums.forEach(qNo => {
                    const idx = qNo - 1;
                    const answer = answers[idx];
                    if (answer === null || answer === undefined) return;
                    answeredCount++;

                    let s = getAnswerScore(answer);
                    if (scoringConfig.reverseQuestions && scoringConfig.reverseQuestions.includes(qNo)) {
                        s = (OPTION_RANGE.max + OPTION_RANGE.min) - s;
                    }
                    score += s;
                });

                list.push({ name, score, minScore, maxScore, questionCount, answeredCount });
            });

            return list;
        }

        function tryEvaluateFormula(total, dimensionScores) {
            const formula = (scoringConfig && typeof scoringConfig.formula === 'string') ? scoringConfig.formula.trim() : '';
            if (!formula) return null;

            const vars = { total };
            (dimensionScores || []).forEach((d, i) => {
                vars['d' + (i + 1)] = d.score;
                const m = String(d.name || '').match(/\(([A-Za-z][A-Za-z0-9_]*)\)/);
                if (m) vars[m[1]] = d.score;
            });

            try {
                const keys = Object.keys(vars);
                const values = keys.map(k => vars[k]);
                const fn = new Function(...keys, 'return (' + formula + ');');
                const v = fn(...values);
                const n = (typeof v === 'number') ? v : parseFloat(String(v));
                return Number.isFinite(n) ? n : null;
            } catch (e) {
                console.error('公式计算错误:', formula, e);
                return null;
            }
        }

        function calculateScore() {
            const total = calculateTotalScore();
            const method = (scoringConfig && scoringConfig.method) ? String(scoringConfig.method).trim() : 'sum';

            if (method === 'avg') {
                const answered = answers.filter(a => a !== null && a !== undefined).length;
                return answered > 0 ? (total / answered) : 0;
            }

            if (method === 'formula') {
                const dimensionScores = calculateDimensionScores();
                const v = tryEvaluateFormula(total, dimensionScores);
                if (v !== null) return v;
            }

            return total;
        }

        function showResult() {
            showPage('loadingPage');
            setTimeout(() => {
                const score = calculateScore();
                displayResults(score);
                showPage('resultPage');
            }, 1500);
        }

        function displayResults(score) {
            document.getElementById('resultScore').textContent = formatNumber(score);
            const dimensionScores = calculateDimensionScores();

             let result = null;
             try {
                 for (const r of resultsConfig) {
                     const condition = (r && r.condition) ? String(r.condition).trim() : '';
                     if (!condition) continue;

                     try {
                         // 使用函数执行条件表达式，避免 replace('total', score) 只替换一次导致匹配失败
                         const fn = new Function('total', 'return (' + condition + ');');
                         if (fn(score)) {
                             result = r;
                             break;
                         }
                     } catch (e) {
                         console.error('条件解析错误:', condition, e);
                     }
                 }
             } catch (e) {
                 console.error('结果配置错误:', e);
             }

            // 如果没有匹配结果，使用默认结果
            if (!result) {
                result = {
                    type: '测试完成',
                    description: '感谢你完成本次测试！你的得分是 ' + score + ' 分。',
                    tags: ['测试完成']
                };
            }

            document.getElementById('resultType').textContent = result.type || '测试结果';
            document.getElementById('resultDesc').textContent = result.description || '';

            if (result.tags && result.tags.length > 0) {
                document.getElementById('resultTags').innerHTML = result.tags.map(t => '<span class="result-tag">' + t + '</span>').join('');
            } else {
                document.getElementById('resultTags').innerHTML = '';
            }

             const analysisEl = document.getElementById('analysisContent');
             const dimensionHtml = (Array.isArray(dimensionScores) && dimensionScores.length > 0)
                 ? dimensionScores.map(d => {
                     const span = d.maxScore - d.minScore;
                     let level = '';
                     if (Number.isFinite(span) && span > 0) {
                         const ratio = (d.score - d.minScore) / span;
                         if (ratio <= 0.33) level = '相对较低';
                         else if (ratio <= 0.66) level = '中等';
                         else level = '相对较高';
                     }
                     const completeness = (d.answeredCount !== undefined && d.questionCount !== undefined && d.answeredCount !== d.questionCount)
                         ? ('（已答' + d.answeredCount + '/' + d.questionCount + '）')
                         : '';
                     return '<div class="analysis-item"><div class="analysis-label">' +
                         (d.name || '维度') +
                         completeness +
                         '</div><div class="analysis-text">得分 ' +
                         formatNumber(d.score) +
                         '（范围 ' +
                         formatNumber(d.minScore) +
                         '-' +
                         formatNumber(d.maxScore) +
                         (level ? ('；' + level) : '') +
                         '）</div></div>';
                 }).join('')
                 : '';
             const analysis = result.analysis;
             if (Array.isArray(analysis) && analysis.length > 0) {
                 analysisEl.innerHTML = dimensionHtml + analysis.map(item => {
                     const label = (item && item.label) ? item.label : '解读';
                     const text = (item && item.text) ? item.text : '';
                     return '<div class="analysis-item"><div class="analysis-label">' + label + '</div><div class="analysis-text">' + text + '</div></div>';
                 }).join('');
             } else if (typeof analysis === 'string' && analysis.trim()) {
                 analysisEl.innerHTML = dimensionHtml +
                     '<div class="analysis-item"><div class="analysis-label">详细解读</div><div class="analysis-text">' +
                     analysis +
                     '</div></div>';
             } else {
                 // 兜底：至少给出得分与结果说明，避免“详细解读”空白
                 analysisEl.innerHTML =
                     '<div class="analysis-item"><div class="analysis-label">你的得分</div><div class="analysis-text">' +
                     score +
                     '</div></div>' +
                     '<div class="analysis-item"><div class="analysis-label">结果解读</div><div class="analysis-text">' +
                     (result.description || '感谢你完成本次测试。') +
                     '</div></div>';
             }

             // Ensure dimension breakdown is shown even in fallback branches
             if (dimensionHtml && analysisEl && analysisEl.innerHTML && analysisEl.innerHTML.indexOf(dimensionHtml) !== 0) {
                 analysisEl.innerHTML = dimensionHtml + analysisEl.innerHTML;
             }
         }

        function restartQuiz() {
            answers = new Array(questions.length).fill(null);
            showPage('homePage');
        }

        function goBack() {
            alert('返回测试合集首页');
        }

        function shareResult() {
            if (navigator.share) {
                navigator.share({
                    title: '我的测试结果',
                    text: '我刚完成了一个心理测试，来看看你的结果吧！',
                    url: window.location.href
                });
            } else {
                const tempInput = document.createElement('input');
                tempInput.value = window.location.href;
                document.body.appendChild(tempInput);
                tempInput.select();
                document.execCommand('copy');
                document.body.removeChild(tempInput);
                alert('链接已复制到剪贴板');
            }
        }`;
    },

    /**
     * 生成存储键名
     */
    generateStorageKey(title) {
        return 'quiz_' + title.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_').toLowerCase() + '_activated';
    },

    /**
     * HTML转义
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    /**
     * 颜色处理函数
     */
    lightenColor(hex, percent) {
        const num = parseInt(hex.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) + amt;
        const G = (num >> 8 & 0x00FF) + amt;
        const B = (num & 0x0000FF) + amt;
        return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
            (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
            (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
    },

    darkenColor(hex, percent) {
        return this.lightenColor(hex, -percent);
    },

    hexToRgba(hex, alpha) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
};

// 导出
window.Generator = Generator;
