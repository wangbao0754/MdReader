import juice from 'juice';
import { wordStyles } from './wordStyles';

export async function copyHtmlToClipboard(htmlContent: string): Promise<void> {
    // 1. 将 CSS 样式内联到 HTML 中
    // 我们用一个包裹层来应用全局样式
    const wrappedHtml = `<div class="word-export">${htmlContent}</div>`;
    
    // 使用 juice 注入样式
    const inlineHtml = juice(wrappedHtml, {
        extraCss: wordStyles,
        removeStyleTags: false, // 保留原有的 style 标签（如果有）
        preserveMediaQueries: false,
        applyWidthAttributes: true,
        applyHeightAttributes: true,
    });

    // 2. 构建完整的 HTML 文档结构，Word 需要这个来识别编码
    const fullHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Document</title>
</head>
<body>
${inlineHtml}
</body>
</html>`;

    // 3. 写入剪贴板
    // 我们同时写入 text/html (富文本) 和 text/plain (纯文本)
    try {
        const typeHtml = 'text/html';
        const typeText = 'text/plain';
        
        // 提取纯文本（简单剥离标签）
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlContent;
        const plainText = tempDiv.innerText;

        const blobHtml = new Blob([fullHtml], { type: typeHtml });
        const blobText = new Blob([plainText], { type: typeText });

        const data = [new ClipboardItem({
            [typeHtml]: blobHtml,
            [typeText]: blobText,
        })];

        await navigator.clipboard.write(data);
    } catch (err) {
        console.error("Clipboard write failed:", err);
        throw new Error("写入剪贴板失败，请确保您在安全上下文中运行。");
    }
}
