# 数据分析与实施方案（2026-11-16）

先阅读 [项目实施方案](项目实施方案.md)。本目录是探索性分析，尚未实现最终应用、指纹改进或调参。原始数据保持不变。

用户已指定直接依据CSV推进。固定规则见 `data_policy.json`：原始温度尺度、按列名解释log10及单位列mol/L、保留全部记录与原结构，不等待额外说明。该约定不等于原始测量定义已被外部验证。

| 文件 | 用途 |
|---|---|
| audit_dataset.py | 全量数据审计、结构分组、固定描述符、数据概况图 |
| audit_summary.json | 全量统计、输入SHA-256、软件版本与未决问题 |
| data_policy.json | 用户确认仅依据CSV后的固定处理约定；不改变既有先导结果 |
| quality_flags.csv | 问题定位；data_row从1计，不含表头；csv_line含表头。同一行可有多个问题 |
| semantic_checks.json | 额外定点身份/极端值核查；不代表全量化学身份审查 |
| parent_family_counts.csv / pair_counts.csv | 匿名结构分组的记录数 |
| pilot_models.py | 3种模型×3种划分×5折，固定参数，只对开发数据评分；不绘图 |
| plot_pilot.py | 单独读取历史先导指标绘图，不训练模型 |
| split_manifest.csv | 每条原始数据的开发/留出角色和分组ID |
| development_folds.csv | 三个协议中每条开发记录的验证折 |
| split_overlap.csv | 各折中验证药物/组合的训练出现比例 |
| pilot_metadata.json | 模型输入与留出规模、分组定义、先导限制 |
| pilot_metrics.csv | 合并OOF指标，非最终测试、非折均值 |
| pilot_fold_metrics.csv | 各折指标；折间标准差不是置信区间 |
| pilot_oof_predictions.csv | 仅开发数据的折外预测，可独立重算指标 |
| dataset_overview.png / pilot_comparison.png | 全量数据概况与先导比较图 |
| requirements.lock.txt | 本次实际安装的依赖版本，Python3.12.14 |

数据路径是本项目的 `datasets/data_2026.csv`。UTF-8解码失败，读取时显式使用latin1可逆映射；该选择并未确认名称原始编码。模型输入字段均验证为ASCII。分组基于ChargeParent并去立体标记，特征保留原始完整分子。不做互变异构体合并。

复现：在项目根目录使用Python3.12创建隔离环境。以下命令会覆盖本分析目录的派生产物，不改原始CSV：

```bash
uv venv --python 3.12 .venv-analysis
uv pip install --python .venv-analysis/bin/python -r analysis/2026-11-16/requirements.lock.txt
.venv-analysis/bin/python analysis/2026-11-16/audit_dataset.py
.venv-analysis/bin/python analysis/2026-11-16/pilot_models.py
.venv-analysis/bin/python analysis/2026-11-16/plot_pilot.py
```

初次先导曾使用临时环境；正式实现已统一改为仓库内的uv `.venv` 与 `uv.lock`，不依赖任何仓库外临时文件。正式建模按 `data_policy.json` 执行，复用已固定的划分。种子2026不意味着跨不同软件版本一定逐位一致。

验证：独立重算了9组OOF的MAE/RMSE/R²/母体等权MAE，最大浮点差约1.1e-16；三协议中每条开发记录恰好验证一次；主协议与组合协议的对应分组分别无跨折；397留出行未进入预测文件；输入与不可动备份SHA一致。

方法来源及AI辅助工作流已在方案文末记录；最终个人AI声明应如实描述数据分析、先导代码和方案设计的AI参与。
