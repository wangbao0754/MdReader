package main

import (
	"context"
	"embed"
	"strings"
	"time"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/options/windows"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	// Create an instance of the app structure
	app := NewApp()

	// Load persisted settings (theme/zoom/window)
	settings, _ := app.GetSettings()

	// Create application with options
	err := wails.Run(&options.App{
		Title:  "MdReader",
		Width:  settings.Window.Width,
		Height: settings.Window.Height,
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		BackgroundColour: &options.RGBA{R: 255, G: 255, B: 255, A: 1},
		OnStartup: func(ctx context.Context) {
			app.startup(ctx)
			if settings.Window.Maximized {
				// give the window a moment to initialize before maximising
				go func() {
					time.Sleep(60 * time.Millisecond)
					runtime.WindowMaximise(ctx)
				}()
			}
		},
		Bind: []interface{}{
			app,
		},
		// 启用单实例锁
		SingleInstanceLock: &options.SingleInstanceLock{
			UniqueId: "e8832560-1533-4638-9580-546059639527", // 随机 UUID
			OnSecondInstanceLaunch: func(secondInstanceData options.SecondInstanceData) {
				// 1. 唤醒窗口
				if app.ctx != nil {
					// 重要：记录唤醒前是否最大化，避免唤醒流程导致窗口回到默认大小
					wasMaximised := runtime.WindowIsMaximised(app.ctx)

					runtime.WindowUnminimise(app.ctx)
					runtime.WindowShow(app.ctx)
					runtime.WindowSetAlwaysOnTop(app.ctx, true)
					runtime.WindowSetAlwaysOnTop(app.ctx, false)

					// 某些情况下 SetAlwaysOnTop 会让最大化窗口回到 Normal，这里强制恢复最大化
					if wasMaximised {
						// 给系统一点时间完成窗口状态切换再最大化更稳
						go func() {
							time.Sleep(50 * time.Millisecond)
							runtime.WindowMaximise(app.ctx)
						}()
					}
				}

				// 2. 提取参数存入 Go 端缓存
				args := secondInstanceData.Args
				hasNewFiles := false
				// 注意：不要假设 args[0] 一定是 exePath。
				// Wails 的 SecondInstanceData.Args 在不同启动方式下可能不包含 exe，
				// 这会导致“窗口激活但文件没进 pending”的问题。
				for _, raw := range args {
					p := strings.TrimSpace(raw)
					p = strings.Trim(p, "\"")
					low := strings.ToLower(p)
					if p != "" && (strings.HasSuffix(low, ".md") || strings.HasSuffix(low, ".markdown")) {
						app.AddPendingFile(p)
						hasNewFiles = true
					}
				}

				// 3. 发送简单信号通知前端 (Signal Only)
				if hasNewFiles && app.ctx != nil {
					// 关键：等待 Webview 恢复 (解决"激活了但没反应")
					go func() {
						time.Sleep(200 * time.Millisecond)
						// 方案A: Wails 事件
						runtime.EventsEmit(app.ctx, "new-files-available")
						// 方案B: 直接 JS 调用 (双保险)
						runtime.WindowExecJS(app.ctx, "if(window.CheckFiles) { window.CheckFiles(); }")
					}()
				}
			},
		},
		Windows: &windows.Options{
			WebviewIsTransparent: false,
			WindowIsTranslucent:  false,
			BackdropType:         windows.Mica,
		},
	})

	if err != nil {
		println("Error:", err.Error())
	}
}
