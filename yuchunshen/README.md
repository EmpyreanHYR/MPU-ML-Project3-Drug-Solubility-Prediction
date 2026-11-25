# yuchunshen：ExtraTrees–TabPFN 对及候选融合实验

高维显式分子间交互特征、母体等权树分裂与 ExtraTrees–TabPFN 折外凸组合的实现，同时包含候选融合实验与模型导出。代码依赖仓库根目录的公共数据、特征与指标工具，通过本目录的 `run.py` 统一入口调用。

## 目录内容

| 路径 | 内容 |
|---|---|
| `experimental_v3/` | 核方法与树模型实现、凸组合集成 |
| `experimental_pair_v3/` | ExtraTrees–TabPFN 对模型 |
| `experimental_tabpfn_v3/` | TabPFN v2 适配器（本地推理，关闭遥测） |
| `pilots/` | 配对、上下文均衡与设备速度的前置探测脚本 |
| `run_combination_pilot.py`、`run_combination_nested.py` | 候选融合的开发折预演与嵌套验证 |
| `run_tabpfn_combination_v3.py` | TabPFN v2 与异质融合的主实验 |
| `export_combination_variants.py`、`export_tabpfn_combination_v3.py` | 融合模型导出 |
| `predict_combination_v3.py` | 单点命令行预测 |
| `run.py` | 统一入口，按脚本名分发并统一模块名与资源路径 |

## 运行

在仓库根目录执行，参数透传给对应脚本：

```bash
uv run --frozen python yuchunshen/run.py run_tabpfn_combination_v3.py all
uv run --frozen python yuchunshen/run.py predict_combination_v3.py --drug-smiles CCO --solvent-smiles O --temperature 25
```

`python scripts/reproduce.sh` 与 `python scripts/reproduce_tabpfn.sh` 提供两轮融合实验的完整复现入口。TabPFN 研究模型需要同时保留适配器与 `models/combination_v3/tabpfn_probe/tabpfn-v2-regressor.ckpt`，权重未嵌入 joblib。数据位于根目录 `datasets/`，实验结果写入 `output/`，权重写入 `models/`，测试位于 `tests/`。
