# hehaoran：SOLAR Studio 应用开发

SOLAR Studio v5.0 的 FastAPI 后端、前端静态资源与启动器。应用加载根目录 `models/` 中的 14 个部署模型，提供单点预测、双模型对照、多溶剂变温探索、全溶剂高通量筛选、批量 CSV 推断与证据看板。

## 目录内容

| 路径 | 内容 |
|---|---|
| `webapp/server.py` | FastAPI 应用、预测与筛选接口、适用域与归因服务 |
| `webapp/static/` | `01 Point Prediction` 等五个工作台的前端页面与脚本 |
| `launch_studio.py` | 启动器：就绪检查、端口选择与浏览器打开 |
| `run.py` | 统一入口，按脚本名分发并统一模块名与资源路径 |

## 运行

在仓库根目录执行：

```bash
uv sync --frozen
uv run --frozen python hehaoran/run.py launch_studio.py
```

默认访问 <http://127.0.0.1:8502/>；也可直接双击根目录的 `启动Studio.command`（macOS）或 `启动Studio.bat`（Windows）。若 8502 已被旧进程或其他服务占用，启动器会自动换到下一个空闲端口并打印实际地址；要回到 8502，先关掉占用它的窗口（macOS 可用 `lsof -ti tcp:8502 | xargs kill`）。数据位于根目录 `datasets/`，模型权重位于 `models/`，测试位于 `tests/`。
