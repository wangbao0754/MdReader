import React, { memo, useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github.css';

interface MarkdownPreviewProps {
    content: string;
    visible?: boolean;
}

// 初始渲染长度
const INITIAL_CHUNK_SIZE = 3000; 

// 增量步长
const INCREMENTAL_CHUNK_SIZE = 3000; 

// 渲染间隔：稍微放宽到 100ms，减轻渲染压力
const RENDER_INTERVAL = 100;

export const MarkdownPreview: React.FC<MarkdownPreviewProps> = memo(({ content, visible = true }) => {
    const [renderedLength, setRenderedLength] = useState(INITIAL_CHUNK_SIZE);
    const [isRendering, setIsRendering] = useState(false);

    // 1. 当内容改变时，重置
    useEffect(() => {
        setRenderedLength(INITIAL_CHUNK_SIZE);
        setIsRendering(visible);
    }, [content]); 

    // 2. 当可见性改变时，决定是否继续/暂停
    useEffect(() => {
        if (visible && renderedLength < content.length) {
            setIsRendering(true);
        } else if (!visible) {
            setIsRendering(false);
        }
    }, [visible, renderedLength, content.length]);

    // 3. 渲染循环
    useEffect(() => {
        if (!isRendering || !visible || renderedLength >= content.length) {
            return;
        }

        const timer = setTimeout(() => {
            setRenderedLength(prev => {
                const next = prev + INCREMENTAL_CHUNK_SIZE;
                if (next >= content.length) {
                    setIsRendering(false); 
                    return content.length;
                }
                return next;
            });
        }, RENDER_INTERVAL);

        return () => clearTimeout(timer);
    }, [isRendering, visible, renderedLength, content.length]);

    const displayContent = content.slice(0, renderedLength);
    const progress = Math.min(100, Math.round((renderedLength / content.length) * 100));

    return (
        <div className="flex flex-col items-center relative">
            {isRendering && visible && content.length > INITIAL_CHUNK_SIZE && (
                <div className="fixed top-28 right-8 bg-blue-600/80 backdrop-blur-sm text-white text-xs px-3 py-1 rounded-full shadow-lg z-50 transition-opacity select-none pointer-events-none">
                    正在优化渲染... {progress}%
                </div>
            )}

            <div id="markdown-preview" className="word-theme prose prose-slate mx-auto w-full">
                <ReactMarkdown 
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[[rehypeHighlight, { ignoreMissing: true }]]}
                >
                    {displayContent}
                </ReactMarkdown>
            </div>
            
            {renderedLength < content.length && (
                <div className="w-full py-4 text-center text-gray-400 text-sm">
                    {visible ? "正在平滑加载剩余内容..." : "内容较长，切换到此标签页后继续加载..."}
                </div>
            )}
        </div>
    );
}, (prevProps, nextProps) => {
    return prevProps.content === nextProps.content && prevProps.visible === nextProps.visible;
});
