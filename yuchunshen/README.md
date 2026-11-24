# yuchunshen：方法二：ExtraTrees–TabPFN 对及候选融合实验

将整个 `yuchunshen/` 文件夹上传至仓库根目录，保持内部层级。依赖完整项目中的公共代码、数据、模型和其他成员模块，不是可单独运行的独立项目。

本目录保存唯一的实际实现，原位置的同名文件已删除。已有权重中的历史模块名通过公共加载器解析，不依赖原位置文件。后续修改本目录中的代码。

## 文件对应关系

| 原位置（已删除） | 当前实现（仓库根目录相对路径） |
|---|---|
| `src/experimental_v3/kernel_models.py` | `yuchunshen/experimental_v3/kernel_models.py` |
| `src/experimental_v3/tree_models.py` | `yuchunshen/experimental_v3/tree_models.py` |
| `src/experimental_v3/ensemble.py` | `yuchunshen/experimental_v3/ensemble.py` |
| `src/experimental_pair_v3/pair_models.py` | `yuchunshen/experimental_pair_v3/pair_models.py` |
| `src/experimental_tabpfn_v3/adapter.py` | `yuchunshen/experimental_tabpfn_v3/adapter.py` |
| `scripts/run_combination_pilot.py` | `yuchunshen/run_combination_pilot.py` |
| `scripts/run_combination_nested.py` | `yuchunshen/run_combination_nested.py` |
| `scripts/run_tabpfn_combination_v3.py` | `yuchunshen/run_tabpfn_combination_v3.py` |
| `scripts/export_combination_variants.py` | `yuchunshen/export_combination_variants.py` |
| `scripts/export_tabpfn_combination_v3.py` | `yuchunshen/export_tabpfn_combination_v3.py` |
| `scripts/predict_combination_v3.py` | `yuchunshen/predict_combination_v3.py` |
| `scripts/pilots/pair_pilot/run_pair_pilot.py` | `yuchunshen/pilots/pair_pilot/run_pair_pilot.py` |
| `scripts/pilots/pair_pilot/analyze_pair_pilot.py` | `yuchunshen/pilots/pair_pilot/analyze_pair_pilot.py` |
| `scripts/pilots/tabpfn_balancing_pilot/run_balancing_pilot.py` | `yuchunshen/pilots/tabpfn_balancing_pilot/run_balancing_pilot.py` |
| `scripts/pilots/tabpfn_probe/run_probe.py` | `yuchunshen/pilots/tabpfn_probe/run_probe.py` |
| `scripts/pilots/tabpfn_cpu_probe/run_cpu_probe.py` | `yuchunshen/pilots/tabpfn_cpu_probe/run_cpu_probe.py` |

## 运行

在仓库根目录通过统一入口执行，参数透传给原脚本：

```bash
uv run --frozen python yuchunshen/run.py run_combination_pilot.py
```

使用项目 README 中更新后的命令。训练请通过本目录的 `run.py` 运行，以保持已保存模型的模块名和资源路径一致。

数据仍位于根目录 `datasets/`，实验结果仍写入根目录 `output/`，权重仍写入根目录 `models/`，测试保留于根目录 `tests/`。
