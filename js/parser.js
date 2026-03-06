/**
 * 文档解析模块
 */

const Parser = {
    /**
     * 解析Word文档
     * @param {File} file - 上传的文件
     * @returns {Promise<string>} - 解析后的文本内容
     */
    async parseWord(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async function(e) {
                try {
                    const arrayBuffer = e.target.result;
                    const result = await mammoth.extractRawText({ arrayBuffer });
                    resolve(result.value);
                } catch (error) {
                    reject(new Error('Word文档解析失败: ' + error.message));
                }
            };
            reader.onerror = () => reject(new Error('文件读取失败'));
            reader.readAsArrayBuffer(file);
        });
    },

    /**
     * 解析Excel文档
     * @param {File} file - 上传的文件
     * @returns {Promise<string>} - 解析后的文本内容
     */
    async parseExcel(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const arrayBuffer = e.target.result;
                    const workbook = XLSX.read(arrayBuffer, { type: 'array' });

                    let allText = '';

                    // 遍历所有工作表
                    workbook.SheetNames.forEach((sheetName, index) => {
                        const worksheet = workbook.Sheets[sheetName];

                        // 获取工作表范围
                        const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');

                        // 添加工作表名称（如果有多个）
                        if (workbook.SheetNames.length > 1) {
                            allText += `\n【工作表${index + 1}: ${sheetName}】\n`;
                        }

                        // 按行读取数据
                        for (let row = range.s.r; row <= range.e.r; row++) {
                            let rowText = '';
                            let hasContent = false;

                            for (let col = range.s.c; col <= range.e.c; col++) {
                                const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
                                const cell = worksheet[cellAddress];

                                if (cell && cell.v !== undefined && cell.v !== null) {
                                    // 处理不同类型的单元格值
                                    let cellValue = cell.v;
                                    if (cell.t === 'd' && cellValue instanceof Date) {
                                        cellValue = cellValue.toLocaleDateString();
                                    }
                                    rowText += (rowText ? '\t' : '') + String(cellValue);
                                    hasContent = true;
                                }
                            }

                            if (hasContent) {
                                allText += rowText + '\n';
                            }
                        }
                    });

                    resolve(allText.trim());
                } catch (error) {
                    reject(new Error('Excel解析失败: ' + error.message));
                }
            };
            reader.onerror = () => reject(new Error('文件读取失败'));
            reader.readAsArrayBuffer(file);
        });
    },

    /**
     * 解析PDF文档（预留接口）
     * @param {File} file - 上传的文件
     * @returns {Promise<string>} - 解析后的文本内容
     */
    async parsePDF(file) {
        return new Promise((resolve, reject) => {
            reject(new Error('PDF解析暂不支持，请使用Word或Excel文档'));
        });
    },

    /**
     * 根据文件类型自动选择解析方法
     * @param {File} file - 上传的文件
     * @returns {Promise<string>} - 解析后的文本内容
     */
    async parse(file) {
        const ext = file.name.split('.').pop().toLowerCase();
        switch (ext) {
            case 'docx':
                return this.parseWord(file);
            case 'xls':
            case 'xlsx':
                return this.parseExcel(file);
            case 'pdf':
                return this.parsePDF(file);
            default:
                throw new Error('不支持的文件格式: ' + ext + '，请上传 .docx、.xls 或 .xlsx 文件');
        }
    },

    /**
     * 基础结构提取（不依赖AI）
     * @param {string} content - 文档文本内容
     * @returns {Object} - 基础结构数据
     */
    extractBasicStructure(content) {
        const lines = content.split('\n').filter(line => line.trim());
        const result = {
            title: '',
            description: '',
            questions: [],
            options: [],
            rawContent: content
        };

        // 提取标题（通常是第一行或包含"量表"、"问卷"的行）
        for (let i = 0; i < Math.min(10, lines.length); i++) {
            const line = lines[i].trim();
            if (line.length > 2 && (line.includes('量表') || line.includes('问卷') || line.includes('测验'))) {
                result.title = line.replace(/^[#\s]+/, '').trim();
                break;
            }
        }

        // 提取题目（以数字开头或包含问号的行）
        let questionIndex = 0;
        for (const line of lines) {
            const trimmed = line.trim();

            // 匹配题目编号格式
            const questionPatterns = [
                /^(\d+)[\.、．\s]+(.+)$/,           // 1. 题目
                /^※(\d+)[\.、．\s]+(.+)$/,         // ※1. 题目
                /^（(\d+)）(.+)$/,                  // （1）题目
                /^\((\d+)\)(.+)$/,                  // (1)题目
                /^Q(\d+)[\.、．\s]+(.+)$/i,        // Q1. 题目
            ];

            let matched = false;
            for (const pattern of questionPatterns) {
                const match = trimmed.match(pattern);
                if (match) {
                    questionIndex++;
                    result.questions.push({
                        id: questionIndex,
                        text: match[2].trim(),
                        options: []
                    });
                    matched = true;
                    break;
                }
            }

            // 如果没有匹配到题目格式，但包含问号，可能是无编号的题目
            if (!matched && trimmed.includes('？') && trimmed.length > 5 && trimmed.length < 200) {
                questionIndex++;
                result.questions.push({
                    id: questionIndex,
                    text: trimmed,
                    options: []
                });
            }
        }

        // 检测选项类型
        result.optionType = this.detectOptionType(content);

        // 根据选项类型生成默认选项
        result.options = this.getDefaultOptions(result.optionType);

        return result;
    },

    /**
     * 检测选项类型
     * @param {string} content - 文档内容
     * @returns {string} - 选项类型
     */
    detectOptionType(content) {
        // 检测是否为是/否类型
        if (/是.*否|否.*是|[AB][\.、]?\s*(是|否)/.test(content)) {
            return 'yesno';
        }

        // 检测是否为4级评分
        if (/完全不符合|有些不符合|基本符合|非常符合/.test(content) ||
            /①|②|③|④/.test(content) ||
            /从不.*很少.*有时.*常常/.test(content)) {
            return 'scale4';
        }

        // 检测是否为5级评分
        if (/确定是这样|可能是这样|不同意也不反对|可能不是这样|确实不是这样/.test(content) ||
            /1分.*2分.*3分.*4分.*5分/.test(content)) {
            return 'scale5';
        }

        // 默认为4级评分
        return 'scale4';
    },

    /**
     * 获取默认选项
     * @param {string} type - 选项类型
     * @returns {Array} - 选项列表
     */
    getDefaultOptions(type) {
        const options = {
            yesno: [
                { value: 'yes', text: '是' },
                { value: 'no', text: '否' }
            ],
            scale4: [
                { value: '1', text: '完全不符合' },
                { value: '2', text: '有些不符合' },
                { value: '3', text: '基本符合' },
                { value: '4', text: '非常符合' }
            ],
            scale5: [
                { value: '1', text: '确定是这样' },
                { value: '2', text: '可能是这样' },
                { value: '3', text: '不同意也不反对' },
                { value: '4', text: '可能不是这样' },
                { value: '5', text: '确实不是这样' }
            ]
        };
        return options[type] || options.scale4;
    }
};

// 导出
window.Parser = Parser;
