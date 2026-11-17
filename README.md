# 药物溶解度预测：TabPFN＋ExtraTrees

报告与演示应用现以TabPFN＋ExtraTrees为主模型；保留原SOLAR等12种算法及TabPFN＋双树用于对比。主模型母体MAE为0.6668，逐行MAE为0.6510；均为五折外层、三折内层、三个种子的嵌套评价汇总。当前提升仍属探索证据。

报告：`Assignment_Report/Assignment-main.pdf`。新实验与导出模型：`artifacts/combination_v3/`。

## 演示应用

```bash
source scripts/env.sh
uv run --frozen uvicorn webapp.server:app --host 127.0.0.1 --port 8502
```

打开 http://127.0.0.1:8502/ ，新版 SOLAR Studio 提供中文教学工作台、12 种模型对照、实测对照与范围提示、多溶剂温度响应、批量 CSV、实验报告、数据证据看板与互动小测。使用说明见 [docs/APP.md](docs/APP.md)，课堂展示路线见 [docs/UI_ENHANCEMENT.md](docs/UI_ENHANCEMENT.md)。

## 复现

```bash
source scripts/env.sh
uv sync --frozen
uv run --frozen python scripts/run_revision.py
uv run --frozen python scripts/run_adaptive_revision.py
bash scripts/build_report.sh
```

Python3.12，uv管理环境。训练与绘图代码分离，全部数据及产物保留在仓库内。
