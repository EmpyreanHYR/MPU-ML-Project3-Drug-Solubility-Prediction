# huangyaorong：方法一：SOLAR-H 及结构—温度分解消融

将整个 `huangyaorong/` 文件夹上传至仓库根目录，保持内部层级。依赖完整项目中的公共代码、数据、模型和其他成员模块，不是可单独运行的独立项目。

本目录保存实际实现。原 `src/`、`scripts/` 和 `webapp/` 中同名文件是兼容入口，后续修改应修改本目录中的实现。模型的公开导入路径仍使用原 `src.*`，以支持已保存权重。

## 文件对应关系

| 原入口（保留兼容） | 当前实现（仓库根目录相对路径） |
|---|---|
| `src/models/temperature_mlp_model.py` | `huangyaorong/models/temperature_mlp_model.py` |
| `src/models/interaction_conditional_model.py` | `huangyaorong/models/interaction_conditional_model.py` |
| `src/models/plain_mlp_model.py` | `huangyaorong/models/plain_mlp_model.py` |
| `src/models/hybrid_conditional_model.py` | `huangyaorong/models/hybrid_conditional_model.py` |
| `src/models/conditional_common.py` | `huangyaorong/models/conditional_common.py` |
| `src/revision_models/adaptive_hybrid_model.py` | `huangyaorong/revision_models/adaptive_hybrid_model.py` |
| `scripts/run_adaptive_revision.py` | `huangyaorong/run_adaptive_revision.py` |
| `scripts/revision_diagnostics.py` | `huangyaorong/revision_diagnostics.py` |

## 运行

在仓库根目录通过统一入口执行，参数透传给原脚本：

```bash
uv run --frozen python huangyaorong/run.py run_adaptive_revision.py
```

也可继续使用 README 中的原命令。不要直接执行本目录的实现文件或以个人目录名导入模型；使用 `run.py` 或原兼容入口，以保持模型序列化模块名和资源路径一致。

数据仍位于根目录 `datasets/`，实验结果仍写入根目录 `output/`，权重仍写入根目录 `models/`，测试保留于根目录 `tests/`。
