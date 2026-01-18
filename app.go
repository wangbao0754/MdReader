package main

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

type WindowState struct {
	Width     int  `json:"width"`
	Height    int  `json:"height"`
	Maximized bool `json:"maximized"`
}

type UserSettings struct {
	Theme  string      `json:"theme"`
	Zoom   int         `json:"zoom"`
	Window WindowState `json:"window"`
}

func defaultSettings() UserSettings {
	return UserSettings{
		Theme: "light",
		Zoom:  100,
		Window: WindowState{
			Width:     1024,
			Height:    768,
			Maximized: false,
		},
	}
}

func settingsDir() (string, error) {
	base, err := os.UserConfigDir() // Windows: %AppData%
	if err != nil {
		return "", err
	}
	return filepath.Join(base, "esirtech", "MdReader"), nil
}

func settingsPath() (string, error) {
	dir, err := settingsDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(dir, "config.json"), nil
}

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

// GetSettings loads user settings from %AppData%\esirtech\MdReader\config.json
func (a *App) GetSettings() (UserSettings, error) {
	p, err := settingsPath()
	if err != nil {
		return defaultSettings(), err
	}

	// ensure dir exists
	dir := filepath.Dir(p)
	_ = os.MkdirAll(dir, 0755)

	b, err := os.ReadFile(p)
	if err != nil {
		if os.IsNotExist(err) {
			return defaultSettings(), nil
		}
		return defaultSettings(), err
	}
	if len(b) == 0 {
		return defaultSettings(), nil
	}

	s := defaultSettings()
	if err := json.Unmarshal(b, &s); err != nil {
		// 容错：配置损坏时回退默认
		return defaultSettings(), nil
	}

	// sanitize
	if s.Theme != "dark" && s.Theme != "light" {
		s.Theme = "light"
	}
	if s.Zoom < 50 {
		s.Zoom = 50
	}
	if s.Zoom > 300 {
		s.Zoom = 300
	}
	// basic window guard
	if s.Window.Width < 900 {
		s.Window.Width = 1024
	}
	if s.Window.Height < 600 {
		s.Window.Height = 768
	}

	return s, nil
}

// SaveSettings persists user settings to %AppData%\esirtech\MdReader\config.json
func (a *App) SaveSettings(settings UserSettings) error {
	p, err := settingsPath()
	if err != nil {
		return err
	}
	dir := filepath.Dir(p)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return err
	}

	// sanitize before save
	if settings.Theme != "dark" && settings.Theme != "light" {
		settings.Theme = "light"
	}
	if settings.Zoom < 50 {
		settings.Zoom = 50
	}
	if settings.Zoom > 300 {
		settings.Zoom = 300
	}
	if settings.Window.Width < 900 {
		settings.Window.Width = 1024
	}
	if settings.Window.Height < 600 {
		settings.Window.Height = 768
	}

	b, err := json.MarshalIndent(settings, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(p, b, 0644)
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
