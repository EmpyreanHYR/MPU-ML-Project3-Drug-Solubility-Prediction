# COMP6133 药物溶解度预测报告 · 版本 2

- [正式报告（PDF）](Assignment-main.pdf)
- [LaTeX 主文件](Assignment-main.tex)和[分章源稿](sections/)
- [本版 IEEE 参考文献库](references.bib)

## 编译

在仓库环境中安装 XeLaTeX、BibTeX 和 latexmk，从仓库根目录执行：

```sh
cd Assignment_Report_v2
latexmk -xelatex -interaction=nonstopmode -halt-on-error Assignment-main.tex
```

版式沿用课程报告类。数据概况图复用仓库内的 [数据覆盖与分布图](../Assignment_Report/figures/revision_v2/v2_data.pdf)，字体共用仓库的 `assets/fonts/`。

## 章节与证据

| 章节 | 可核对材料 |
| --- | --- |
| 引言、相关工作 | [本版引用条目](references.bib)中的 DOI 或论文原文入口 |
| 数据与评价 | [课程数据](../datasets/data_2026.csv)、[清理策略](../datasets/splits/data_policy.json)、[母体与开发角色映射](../datasets/splits/split_manifest.csv)、[冻结开发划分](../datasets/splits/development_folds.csv) |
| 方法、实验、结果 | [第二轮协议](../output/combination_v3/tabpfn_nested/protocol.json)、[方案比较](../output/combination_v3/all_nested_comparison.csv)、[树分支三折筛查](../output/combination_v3/tree_pilot/comparison.csv)、[结果复算](analysis/results.py)与[数值](analysis/results.json) |
| 特征归因与温度响应 | [部署模型配置](../output/combination_v3/tabpfn_nested/deployment/TabPFN_ExtraTreesBlend_metadata.json)、[复算脚本](analysis/deployment_explanations.py)和[结果](analysis/deployment_explanations.json) |
| 温度关联 | [组合内分析与混杂敏感性结果](../output/revision_v2/analysis/causal.json)、[同样本斜率脚本](../scripts/analyze_results.py)、[省略变量敏感性脚本](../scripts/analyze_revision.py) |
| 系统实现 | [服务实现](../webapp/server.py)、[接口用例](../tests/test_web_api.py)、[应用案例检查](analysis/check_application.py)与[实测记录](analysis/application_check.json) |

## 复核本版分析

从仓库根目录、使用项目锁定环境运行以下命令：

```sh
PYTHONPATH=. uv run --frozen python Assignment_Report_v2/analysis/results.py
PYTHONPATH=. uv run --frozen python Assignment_Report_v2/analysis/deployment_explanations.py
PYTHONPATH=. uv run --frozen python Assignment_Report_v2/analysis/check_application.py
uv run --frozen pytest -q tests/test_web_api.py tests/test_learning.py
```

主比较由冻结的开发集折外预测复算。解释与应用案例调用已有部署工件，涉及 TabPFN 的复核使用本地 v2 权重与 Apple Silicon MPS 配置。应用耗时由复核时的设备和负载决定。骨架、溶剂与温区的独立验证属于后续研究。
