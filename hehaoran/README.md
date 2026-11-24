# hehaoran：SOLAR Studio 应用开发

将整个 `hehaoran/` 文件夹上传至仓库根目录，保持内部层级。依赖完整项目中的公共代码、数据、模型和其他成员模块，不是可单独运行的独立项目。

本目录保存实际实现。原 `src/`、`scripts/` 和 `webapp/` 中同名文件是兼容入口，后续修改应修改本目录中的实现。模型的公开导入路径仍使用原 `src.*`，以支持已保存权重。

## 文件对应关系

| 原入口（保留兼容） | 当前实现（仓库根目录相对路径） |
|---|---|
| `webapp/server.py` | `hehaoran/webapp/server.py` |
| `scripts/launch_studio.py` | `hehaoran/launch_studio.py` |

前端完整目录：`hehaoran/webapp/static/`。

## 运行

在仓库根目录通过统一入口执行，参数透传给原脚本：

```bash
uv run --frozen python hehaoran/run.py launch_studio.py
```

也可继续使用 README 中的原命令。不要直接执行本目录的实现文件或以个人目录名导入模型；使用 `run.py` 或原兼容入口，以保持模型序列化模块名和资源路径一致。

数据仍位于根目录 `datasets/`，实验结果仍写入根目录 `output/`，权重仍写入根目录 `models/`，测试保留于根目录 `tests/`。
