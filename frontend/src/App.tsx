import { useState, useEffect, useMemo } from 'react';
import { ReadFile, SaveFile, GetCommandLineArgs, OpenFileDialog, SaveFileDialog, RegisterContextMenu, UnregisterContextMenu, CheckPendingFiles } from '../wailsjs/go/main/App';
import { EventsOn } from '../wailsjs/runtime/runtime'; 
import { MarkdownPreview } from './components/MarkdownPreview';
import { ErrorBoundary } from './components/ErrorBoundary'; 
import CodeMirror from '@uiw/react-codemirror';
import { markdown } from '@codemirror/lang-markdown';
import { FileText, Edit3, Save, Copy, FileIcon, Plus, X, FolderOpen, Settings, Check, Trash2 } from 'lucide-react';
import { copyHtmlToClipboard } from './utils/clipboard';

declare global {
    interface Window {
        CheckFiles: () => void;
    }
}

interface Tab {
    id: string;
    title: string;
    filePath: string;
    content: string;
    isEditMode: boolean;
    isDirty: boolean;
}

function App() {
    const [tabs, setTabs] = useState<Tab[]>([]);
    const [activeTabId, setActiveTabId] = useState<string>("");
    const [statusMsg, setStatusMsg] = useState<string>("");
    const [showSettingsMenu, setShowSettingsMenu] = useState(false);
    
    const activeTab = tabs.find(t => t.id === activeTabId);

    const normalizePath = (p: string) => {
        let x = (p || "").trim();
        // 去掉两侧引号（部分启动方式可能保留引号）
        x = x.replace(/^\"+|\"+$/g, "");
        // 容错：file:///C:/... 形式
        if (x.toLowerCase().startsWith("file:///")) {
            const raw = x.slice("file:///".length);
            try {
                x = decodeURI(raw);
            } catch {
                x = raw;
            }
            // file url 用 /，转回 windows 路径更稳
            x = x.replace(/\//g, "\\");
        }
        return x;
    };

    const isMarkdownPath = (p: string) => {
        const low = normalizePath(p).toLowerCase();
        return low.endsWith(".md") || low.endsWith(".markdown");
    };

    // 核心：处理来自后端的“拉取”信号
    const fetchPendingFiles = async () => {
        try {
            const pending = await CheckPendingFiles();
            if (pending && pending.length > 0) {
                console.log("Found pending files:", pending);
                setStatusMsg(`发现 ${pending.length} 个新文件，正在打开...`);
                for (const path of pending) {
                    if (path && typeof path === 'string' && isMarkdownPath(path)) {
                        await loadFileToNewTab(normalizePath(path));
                    }
                }
                return true;
            }
        } catch (e) {
            console.error("Failed to check pending files", e);
            setStatusMsg("拉取文件失败: " + e);
        }
        return false;
    };

    // 挂载全局信号处理函数
    useEffect(() => {
        // 1. 暴露给 Go 直接调用的接口
        window.CheckFiles = () => {
            fetchPendingFiles();
        };
        
        // 2. 监听 Wails 事件 (Backup)
        const off = EventsOn("new-files-available", () => {
            fetchPendingFiles();
        });

        // 3. 终极方案：监听窗口焦点 (解决所有唤醒后不执行JS的问题)
        const handleFocus = () => {
            // 当窗口被唤醒并获得焦点时，顺便检查一下有没有新文件
            fetchPendingFiles();
        };
        window.addEventListener("focus", handleFocus);

        return () => {
            // @ts-ignore
            window.CheckFiles = undefined;
            window.removeEventListener("focus", handleFocus);
        };
    }, []); 

    // 初始化逻辑
    useEffect(() => {
        const init = async () => {
            let hasOpenedFile = false;

            // 1. 获取命令行参数
            const args = await GetCommandLineArgs();
            if (args && args.length > 1) {
                for (let i = 1; i < args.length; i++) {
                    const path = args[i];
                    if (path && isMarkdownPath(path)) {
                        await loadFileToNewTab(normalizePath(path));
                        hasOpenedFile = true;
                    }
                }
            }

            // 2. 初始检查 Pending Files
            if (await fetchPendingFiles()) {
                hasOpenedFile = true;
            }

            if (!hasOpenedFile) {
                setTimeout(() => {
                    setTabs(currentTabs => {
                        if (currentTabs.length === 0) {
                            const newTab: Tab = {
                                id: Date.now().toString(),
                                title: "未命名文档",
                                filePath: "",
                                content: "# 欢迎使用 MdReader\n\n请打开文件或开始编辑。",
                                isEditMode: false,
                                isDirty: false,
                            };
                            setActiveTabId(newTab.id);
                            return [newTab];
                        }
                        return currentTabs;
                    });
                }, 100);
            }
        };

        init();
    }, []); 

    const createNewTab = (title = "未命名文档", content = "", filePath = "") => {
        const newTab: Tab = {
            id: Date.now().toString() + Math.random().toString().slice(2, 5),
            title,
            filePath,
            content: content || "# 欢迎使用 MdReader\n\n请打开文件或开始编辑。",
            isEditMode: false,
            isDirty: false,
        };
        setTabs(prev => [...prev, newTab]);
        setActiveTabId(newTab.id);
    };

    const loadFileToNewTab = async (path: string) => {
        try {
            const cleanPath = normalizePath(path);
            const text = await ReadFile(cleanPath);
            const fileName = cleanPath.split(/[\\/]/).pop() || "文档";
            
            setTabs(prev => {
                const existing = prev.find(t => t.filePath === cleanPath);
                if (existing) {
                    setActiveTabId(existing.id);
                    return prev;
                }
                
                const newTab: Tab = {
                    id: Date.now().toString() + Math.random().toString().slice(2, 5),
                    title: fileName,
                    filePath: cleanPath,
                    content: text,
                    isEditMode: false,
                    isDirty: false,
                };
                setActiveTabId(newTab.id);
                return [...prev, newTab];
            });
            
            setStatusMsg("已加载: " + fileName);
        } catch (err) {
            setStatusMsg("加载失败: " + err);
        }
    };

    const handleOpenFile = async () => {
        try {
            const paths = await OpenFileDialog();
            if (paths && paths.length > 0) {
                paths.forEach(path => loadFileToNewTab(path));
            }
        } catch (err) {
            console.error(err);
        }
    };

    const closeTab = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setTabs(prev => {
            const newTabs = prev.filter(t => t.id !== id);
            if (activeTabId === id && newTabs.length > 0) {
                setActiveTabId(newTabs[newTabs.length - 1].id);
            }
            return newTabs;
        });
        if (tabs.length === 1 && tabs[0].id === id) {
             setActiveTabId("");
        }
    };
    
    // 监听 tabs 变化，如果关完了自动新建
    useEffect(() => {
        if (tabs.length === 0 && activeTabId === "EMPTY_STATE_CHECK") { 
             createNewTab();
        }
    }, [tabs]);

    const updateTab = (id: string, updates: Partial<Tab>) => {
        setTabs(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    };

    const updateActiveTab = (updates: Partial<Tab>) => {
        if (activeTabId) updateTab(activeTabId, updates);
    };

    const handleSave = async () => {
        if (!activeTab) return;
        let targetPath = activeTab.filePath;
        if (!targetPath) {
            try {
                targetPath = await SaveFileDialog();
                if (!targetPath) return;
                if (!targetPath.toLowerCase().endsWith(".md")) targetPath += ".md";
                const fileName = targetPath.split(/[\\/]/).pop() || "文档";
                updateActiveTab({ filePath: targetPath, title: fileName });
            } catch (err) {
                setStatusMsg("保存错误: " + err);
                return;
            }
        }
        try {
            await SaveFile(targetPath, activeTab.content);
            updateActiveTab({ isDirty: false, filePath: targetPath });
            setStatusMsg("已保存");
            setTimeout(() => setStatusMsg(""), 2000);
        } catch (err) {
            setStatusMsg("保存失败: " + err);
        }
    };

    const handleCopyToWord = async () => {
        if (activeTab?.isEditMode) {
            setStatusMsg("请先切换到阅读模式");
            return;
        }
        const container = document.getElementById(`tab-content-${activeTabId}`);
        const previewDiv = container?.querySelector('#markdown-preview');
        
        if (!previewDiv) {
            setStatusMsg("无法获取内容");
            return;
        }

        try {
            await copyHtmlToClipboard(previewDiv.innerHTML);
            setStatusMsg("已复制到剪贴板！");
            setTimeout(() => setStatusMsg(""), 2000);
        } catch (err) {
            setStatusMsg("复制失败: " + err);
        }
    };

    const handleRegisterMenu = async () => {
        try {
            await RegisterContextMenu();
            alert("成功！已添加右键菜单 '用 MdReader 打开'。");
            setShowSettingsMenu(false);
        } catch (err) {
            alert("操作失败 (可能需要管理员权限):\n" + err);
        }
    };

    const handleUnregisterMenu = async () => {
        try {
            await UnregisterContextMenu();
            alert("成功！已移除右键菜单。");
            setShowSettingsMenu(false);
        } catch (err) {
            alert("操作失败 (可能需要管理员权限):\n" + err);
        }
    };

    return (
        <ErrorBoundary>
            <div className="h-screen flex flex-col bg-gray-50 text-slate-800" onClick={() => setShowSettingsMenu(false)}>
                {/* 1. Tab Bar */}
                <div className="flex items-center bg-gray-200 border-b border-gray-300 pt-1 px-2 gap-1 overflow-x-auto select-none no-scrollbar">
                    {tabs.map(tab => (
                        <div 
                            key={tab.id}
                            onClick={() => setActiveTabId(tab.id)}
                            className={`
                                group relative flex items-center gap-2 px-3 py-2 pr-8 min-w-[120px] max-w-[200px] 
                                rounded-t-lg text-sm cursor-pointer transition-colors border-t border-l border-r
                                ${activeTabId === tab.id 
                                    ? 'bg-white border-gray-300 border-b-white text-blue-600 font-medium z-10 -mb-[1px]' 
                                    : 'bg-gray-100 border-transparent text-gray-500 hover:bg-gray-50'}
                            `}
                        >
                            <FileIcon size={14} className={activeTabId === tab.id ? "text-blue-500" : "text-gray-400"} />
                            <span className="truncate" title={tab.filePath}>{tab.title}</span>
                            {tab.isDirty && <span className="w-2 h-2 rounded-full bg-orange-400"></span>}
                            
                            <button 
                                onClick={(e) => closeTab(e, tab.id)}
                                className="absolute right-1 p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-gray-200 text-gray-500"
                            >
                                <X size={12} />
                            </button>
                        </div>
                    ))}
                    
                    <button 
                        onClick={() => createNewTab()}
                        className="p-1.5 hover:bg-gray-300 rounded-md text-gray-500 mb-1"
                        title="新建标签页"
                    >
                        <Plus size={16} />
                    </button>
                </div>

                {/* 2. Toolbar */}
                <div className="h-12 bg-white border-b border-gray-200 flex items-center px-4 justify-between shadow-sm z-20 relative">
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={handleOpenFile}
                            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg flex items-center gap-2"
                            title="打开文件"
                        >
                            <FolderOpen size={18} />
                            <span className="hidden sm:inline text-sm">打开</span>
                        </button>
                        <div className="h-5 w-px bg-gray-300 mx-1"></div>
                        <div className="bg-gray-100 p-1 rounded-lg flex gap-1">
                            <button 
                                onClick={() => updateActiveTab({ isEditMode: false })}
                                className={`px-3 py-1 rounded text-sm flex items-center gap-2 transition-all ${!activeTab?.isEditMode ? 'bg-white shadow text-blue-600 font-medium' : 'text-gray-500 hover:bg-gray-200'}`}
                            >
                                <FileText size={15} /> 阅读
                            </button>
                            <button 
                                onClick={() => updateActiveTab({ isEditMode: true })}
                                className={`px-3 py-1 rounded text-sm flex items-center gap-2 transition-all ${activeTab?.isEditMode ? 'bg-white shadow text-blue-600 font-medium' : 'text-gray-500 hover:bg-gray-200'}`}
                            >
                                <Edit3 size={15} /> 编辑
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400 mr-2 min-w-[100px] text-right">{statusMsg}</span>
                        <button onClick={handleSave} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                            <Save size={18} />
                        </button>
                        <button onClick={handleCopyToWord} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm">
                            <Copy size={15} /> <span className="hidden sm:inline">复制到 Word</span>
                        </button>
                        <div className="h-5 w-px bg-gray-300 mx-2"></div>
                        
                        {/* Settings Menu Trigger */}
                        <div className="relative">
                            <button 
                                onClick={(e) => { e.stopPropagation(); setShowSettingsMenu(!showSettingsMenu); }}
                                className={`p-2 rounded-lg hover:text-blue-600 transition-colors ${showSettingsMenu ? 'bg-gray-100 text-blue-600' : 'text-gray-500 hover:bg-gray-100'}`}
                                title="系统设置"
                            >
                                <Settings size={18} />
                            </button>
                            
                            {/* Dropdown Menu */}
                            {showSettingsMenu && (
                                <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-xl z-50 py-1 flex flex-col" onClick={(e) => e.stopPropagation()}>
                                    <button onClick={handleRegisterMenu} className="px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 hover:text-blue-600 flex items-center gap-2 transition-colors">
                                        <Check size={14} /> 添加到右键菜单
                                    </button>
                                    <button onClick={handleUnregisterMenu} className="px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 hover:text-red-600 flex items-center gap-2 transition-colors">
                                        <Trash2 size={14} /> 移除右键菜单
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* 3. Content Area - 渲染所有 Tab 以保持状态 */}
                <div className="flex-1 bg-gray-50 relative"> {/* 移除 overflow-hidden, 让子元素 absolute 定位更自由 */}
                    {tabs.map(tab => (
                        <TabContent 
                            key={tab.id} 
                            tab={tab} 
                            isActive={activeTabId === tab.id} 
                            updateTab={updateTab} 
                        />
                    ))}
                    
                    {tabs.length === 0 && (
                        <div className="flex items-center justify-center h-full text-gray-400">
                            {/* 如果没有 tabs，显示一个友好的提示或者按钮 */}
                            <div className="text-center">
                                <p className="mb-4">没有打开的文档</p>
                                <button 
                                    onClick={() => createNewTab()}
                                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                                >
                                    新建空白文档
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </ErrorBoundary>
    );
}

// 独立的 Tab 内容组件
const TabContent = ({ tab, isActive, updateTab }: { tab: Tab, isActive: boolean, updateTab: (id: string, updates: Partial<Tab>) => void }) => {
    const editorExtensions = useMemo(() => [markdown()], []);

    return (
        <div 
            id={`tab-content-${tab.id}`}
            className="absolute inset-0 overflow-auto scroll-smooth p-4 md:p-6 bg-gray-50"
            style={{ 
                // 终极修复方案 2.0：Z-Index 堆叠法
                // 不移动元素坐标，只改变层级和透明度。
                // 这样元素一直在原来的位置，布局非常稳定，CodeMirror 不会丢失状态。
                
                zIndex: isActive ? 10 : 0,
                opacity: isActive ? 1 : 0,
                pointerEvents: isActive ? 'auto' : 'none',
                
                // 保持 display: block 且位置不变
                // 这样 CodeMirror 认为自己一直展示着，只是被遮住了
            }}
        >
            {tab.isEditMode ? (
                <div className="max-w-5xl mx-auto bg-white shadow-sm rounded-lg overflow-hidden h-full border border-gray-200">
                    <CodeMirror 
                        value={tab.content} 
                        height="100%" 
                        extensions={editorExtensions} 
                        onChange={(val) => updateTab(tab.id, { content: val, isDirty: true })}
                        className="text-base h-full"
                    />
                </div>
            ) : (
                <div className="h-full overflow-visible">
                    <MarkdownPreview content={tab.content} visible={isActive} />
                </div>
            )}
        </div>
    );
};

export default App;
