# songjiayun：基底模型与共同对照训练

传统回归基线与 12 个对照模型的实现，是多模型共用训练框架 `run_revision.py` 所在模块。代码依赖仓库根目录的公共数据、特征与指标工具，通过本目录的 `run.py` 统一入口调用。

## 目录内容

| 路径 | 内容 |
|---|---|
| `models/` | RealMLP、TabM、岭回归、直方图梯度提升、随机森林、ExtraTrees 与 Dummy 基线 |
| `run_experiments.py` | 早期 12 个对照模型的训练与评测 |
| `run_revision.py` | 多模型共用训练框架（含 SOLAR-H 与消融模型的调用入口） |
| `run_baselines.py` | 常规回归基线（RF / Ridge / RbfSVR） |
| `run.py` | 统一入口，按脚本名分发并统一模块名与资源路径 |

## 运行

在仓库根目录执行，参数透传给对应脚本：

```bash
uv run --frozen python songjiayun/run.py run_experiments.py
uv run --frozen python songjiayun/run.py run_revision.py
PYTHONPATH=. uv run --frozen python songjiayun/run.py run_baselines.py
```

训练通过本目录的 `run.py` 运行，已保存模型的模块名与资源路径才能正确解析。数据位于根目录 `datasets/`，实验结果写入 `output/`，权重写入 `models/`，测试位于 `tests/`。
