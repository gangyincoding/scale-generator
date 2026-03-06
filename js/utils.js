/**
 * 工具函数模块
 */

const Utils = {
    /**
     * 生成唯一ID
     */
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },

    /**
     * 格式化文件大小
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },

    /**
     * 格式化日期
     */
    formatDate(date) {
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    },

    /**
     * 防抖函数
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    /**
     * 复制文本到剪贴板
     */
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (err) {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            return true;
        }
    },

    /**
     * 下载文件
     */
    downloadFile(content, filename, mimeType = 'text/html') {
        const blob = new Blob([content], { type: mimeType + ';charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    /**
     * 从文件名提取缩写
     */
    extractAbbr(name) {
        // 优先提取已有英文缩写 (如 AMS, GHQ, EPQ)
        const englishMatch = name.match(/[A-Z]{2,}/);
        if (englishMatch) {
            return englishMatch[0];
        }

        // 提取中文拼音首字母（简化处理）
        const specialWords = {
            '成就': 'CJ',
            '动机': 'DJ',
            '创造': 'CJ',
            '力': 'L',
            '健康': 'JK',
            '问卷': 'WJ',
            '婚姻': 'HY',
            '质量': 'ZL',
            '人格': 'RG',
            '艾森克': 'AS',
            '抑郁': 'YY',
            '焦虑': 'JL',
            '心理': 'XL',
            '量表': 'LB'
        };

        for (const [word, abbr] of Object.entries(specialWords)) {
            if (name.includes(word)) {
                return abbr;
            }
        }

        // 默认使用名称前几个字符
        return name.substring(0, 3).toUpperCase();
    },

    /**
     * 生成激活码
     */
    generateActivationCode(existingCodes = []) {
        // 找到最大的数字码
        let maxCode = 2024;
        existingCodes.forEach(code => {
            const num = parseInt(code);
            if (!isNaN(num) && num > maxCode) {
                maxCode = num;
            }
        });
        return String(maxCode + 1);
    },

    /**
     * 生成内部流水号
     */
    generateInternalCode(abbr, lastNumber) {
        const num = (lastNumber || 0) + 1;
        return abbr + String(num).padStart(4, '0');
    },

    /**
     * 清理文件名（移除特殊字符）
     */
    sanitizeFilename(name) {
        return name.replace(/[\\/:*?"<>|]/g, '_').trim();
    },

    /**
     * 显示提示消息
     */
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 24px;
            background: ${type === 'success' ? '#10B981' : type === 'error' ? '#EF4444' : '#6366F1'};
            color: white;
            border-radius: 8px;
            font-size: 14px;
            z-index: 9999;
            animation: slideIn 0.3s ease;
        `;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },

    /**
     * 确认对话框
     */
    confirm(message) {
        return window.confirm(message);
    },

    /**
     * 本地存储封装
     */
    storage: {
        get(key) {
            try {
                const value = localStorage.getItem(key);
                return value ? JSON.parse(value) : null;
            } catch {
                return null;
            }
        },
        set(key, value) {
            try {
                localStorage.setItem(key, JSON.stringify(value));
                return true;
            } catch {
                return false;
            }
        },
        remove(key) {
            localStorage.removeItem(key);
        }
    }
};

// 添加样式动画
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

// 导出
window.Utils = Utils;
