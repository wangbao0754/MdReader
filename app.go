package main

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"strings"
	"sync"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// App struct
type App struct {
	ctx          context.Context
	pendingFiles []string
	filesMu      sync.Mutex
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{
		pendingFiles: make([]string, 0),
	}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}

// AddPendingFile adds a file path to the pending list (Thread Safe)
func (a *App) AddPendingFile(path string) {
	a.filesMu.Lock()
	defer a.filesMu.Unlock()
	a.pendingFiles = append(a.pendingFiles, path)
}

// CheckPendingFiles returns and clears the pending files list (Thread Safe)
// Frontend calls this on startup to get files that arrived before UI was ready
func (a *App) CheckPendingFiles() []string {
	a.filesMu.Lock()
	defer a.filesMu.Unlock()

	// Return copy
	if len(a.pendingFiles) == 0 {
		return []string{}
	}
	files := make([]string, len(a.pendingFiles))
	copy(files, a.pendingFiles)

	// Clear list
	a.pendingFiles = make([]string, 0)

	return files
}

// Greet returns a greeting for the given name
func (a *App) Greet(name string) string {
	return fmt.Sprintf("Hello %s, It's show time!", name)
}

// ReadFile reads the content of a file
func (a *App) ReadFile(path string) (string, error) {
	content, err := os.ReadFile(path)
	if err != nil {
		return "", err
	}
	return string(content), nil
}

// SaveFile saves content to a file
func (a *App) SaveFile(path string, content string) error {
	return os.WriteFile(path, []byte(content), 0644)
}

// GetCommandLineArgs returns the command line arguments
func (a *App) GetCommandLineArgs() []string {
	return os.Args
}

// OpenFileDialog opens a system file dialog to select multiple markdown files
func (a *App) OpenFileDialog() ([]string, error) {
	selection, err := runtime.OpenMultipleFilesDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "打开 Markdown 文件",
		Filters: []runtime.FileFilter{
			{
				DisplayName: "Markdown Files",
				Pattern:     "*.md;*.markdown",
			},
		},
	})
	if err != nil {
		return nil, err
	}
	return selection, nil
}

// SaveFileDialog opens a system file dialog to save a markdown file
func (a *App) SaveFileDialog() (string, error) {
	selection, err := runtime.SaveFileDialog(a.ctx, runtime.SaveDialogOptions{
		Title:           "保存文件",
		DefaultFilename: "文档.md",
		Filters: []runtime.FileFilter{
			{
				DisplayName: "Markdown Files",
				Pattern:     "*.md",
			},
		},
	})
	if err != nil {
		return "", err
	}
	return selection, nil
}

// RegisterContextMenu adds a context menu item for .md files
func (a *App) RegisterContextMenu() error {
	exePath, err := os.Executable()
	if err != nil {
		return err
	}
	// 转义反斜杠
	exePath = strings.ReplaceAll(exePath, "\\", "\\\\")

	// 注册表命令：添加 "Open with MdReader"
	// HKEY_CLASSES_ROOT\*\shell\MdReader
	cmd1 := exec.Command("reg", "add", "HKCR\\*\\shell\\MdReader", "/ve", "/d", "用 MdReader 打开", "/f")
	// HKEY_CLASSES_ROOT\*\shell\MdReader\command
	cmd2 := exec.Command("reg", "add", "HKCR\\*\\shell\\MdReader\\command", "/ve", "/d", fmt.Sprintf("\"%s\" \"%%1\"", exePath), "/f")

	// 设置图标 (可选)
	cmd3 := exec.Command("reg", "add", "HKCR\\*\\shell\\MdReader", "/v", "Icon", "/d", exePath, "/f")

	if err := cmd1.Run(); err != nil {
		return fmt.Errorf("failed to add menu key: %v", err)
	}
	if err := cmd2.Run(); err != nil {
		return fmt.Errorf("failed to add command key: %v", err)
	}
	cmd3.Run() // 图标失败不报错

	return nil
}

// UnregisterContextMenu removes the context menu item
func (a *App) UnregisterContextMenu() error {
	cmd := exec.Command("reg", "delete", "HKCR\\*\\shell\\MdReader", "/f")
	return cmd.Run()
}
