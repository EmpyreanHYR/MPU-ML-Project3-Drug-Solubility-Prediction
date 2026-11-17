# SOLAR：药物溶解度预测

当前版本恢复为原SOLAR框架，包括SOLAR-H混合模型、SOLAR-N交互网络及12种模型比较。实验采用早期开发集五折划分、三折内层选择，训练种子2026、17、42。

| 模型 | 母体MAE ↓ |
|---|---:|
| SOLAR-H | 0.7164 |
| ExtraTrees | 0.7469 |

中文论文：`Assignment_Report/Assignment-main.pdf`。模型与实验：`artifacts/revision_v2/`。原论文正文快照：`docs/revision_v2/paper_snapshot/`。图件：`Assignment_Report/figures/revision_v2/`。

## 演示应用

```bash
source scripts/env.sh
uv run --frozen uvicorn webapp.server:app --host 127.0.0.1 --port 8502
```

打开 http://127.0.0.1:8502/ ，支持双语显示、模型选择、两两对比及温度响应。

## 复现

```bash
source scripts/env.sh
uv sync --frozen
uv run --frozen python scripts/run_revision.py
uv run --frozen python scripts/run_adaptive_revision.py
bash scripts/build_report.sh
```

Python3.12，uv管理环境。训练与绘图代码分离，全部数据及产物保留在仓库内。
