export const wordStyles = `
/* 全局容器 */
div {
    font-family: "Times New Roman", "SimSun", serif;
    font-size: 12pt;
    line-height: 1.5;
    color: #000000;
    text-align: justify;
}

/* 标题样式 */
h1 { font-size: 22pt; font-weight: bold; margin-top: 24pt; margin-bottom: 12pt; text-align: center; }
h2 { font-size: 16pt; font-weight: bold; margin-top: 18pt; margin-bottom: 12pt; border-bottom: 1px solid #eee; }
h3 { font-size: 14pt; font-weight: bold; margin-top: 12pt; margin-bottom: 6pt; }
h4 { font-size: 12pt; font-weight: bold; margin-top: 10pt; margin-bottom: 6pt; }

/* 段落 */
p { margin-bottom: 10pt; }

/* 列表 */
ul, ol { margin-bottom: 10pt; padding-left: 2em; }
li { margin-bottom: 4pt; }

/* 代码块 - Word 中通常用单行表格或灰色背景框模拟 */
pre {
    background-color: #f5f5f5;
    border: 1px solid #ddd;
    padding: 10pt;
    font-family: Consolas, Monaco, monospace;
    font-size: 10.5pt;
    margin-bottom: 10pt;
    white-space: pre-wrap;
}
code {
    background-color: #f5f5f5;
    font-family: Consolas, Monaco, monospace;
    padding: 2px 4px;
    font-size: 10.5pt;
}

/* 引用 */
blockquote {
    border-left: 4px solid #ccc;
    padding-left: 10pt;
    color: #666;
    margin: 10pt 0;
    font-style: italic;
}

/* 表格 */
table {
    border-collapse: collapse;
    width: 100%;
    margin-bottom: 12pt;
}
th, td {
    border: 1px solid #000;
    padding: 6pt;
    text-align: left;
}
th {
    background-color: #f2f2f2;
    font-weight: bold;
}

/* 图片 */
img {
    max-width: 100%;
    height: auto;
    margin: 12pt auto;
    display: block;
}

/* 链接 */
a {
    color: #0563c1;
    text-decoration: underline;
}
`;
