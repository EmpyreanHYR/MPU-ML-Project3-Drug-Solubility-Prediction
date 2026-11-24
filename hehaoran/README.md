# hehaoran：SOLAR Studio 应用开发

将整个 `hehaoran/` 文件夹上传至仓库根目录，保持内部层级。依赖完整项目中的公共代码、数据、模型和其他成员模块，不是可单独运行的独立项目。

本目录保存唯一的实际实现，原位置的同名文件已删除。已有权重中的历史模块名通过公共加载器解析，不依赖原位置文件。后续修改本目录中的代码。

## 文件对应关系

| 原位置（已删除） | 当前实现（仓库根目录相对路径） |
|---|---|
| `webapp/server.py` | `hehaoran/webapp/server.py` |
| `scripts/launch_studio.py` | `hehaoran/launch_studio.py` |

前端完整目录：`hehaoran/webapp/static/`。

## 运行

在仓库根目录通过统一入口执行，参数透传给原脚本：

```bash
uv run --frozen python hehaoran/run.py launch_studio.py
```

使用项目 README 中更新后的命令。训练请通过本目录的 `run.py` 运行，以保持已保存模型的模块名和资源路径一致。

数据仍位于根目录 `datasets/`，实验结果仍写入根目录 `output/`，权重仍写入根目录 `models/`，测试保留于根目录 `tests/`。
