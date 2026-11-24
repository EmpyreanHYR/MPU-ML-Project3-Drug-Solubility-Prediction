# 面向未见药物母体的条件溶解度预测

> 融合物理分解与异构集成的机器学习项目：在严格的母体分组嵌套交叉验证下，预测药物分子在多溶剂、变温条件下的对数溶解度，并部署为可交互的实时推断系统。

最终报告：[COMP6133_GroupReport_Group08.pdf](Report_final/COMP6133_GroupReport_Group08.pdf)（Word 版：[.docx](Report_final/COMP6133_GroupReport_Group08.docx)） · 结果明细：[output/README.md](output/README.md) · 模型权重：[models/README.md](models/README.md)

> 历史报告（V1 中文版、V2 中文版、V2 英文手稿及其 LaTeX 源码与分析脚本）已归档到仓库外的 `../旧文件备份/`，不再随仓库分发。

## 项目汇报

[**打开 HTML 汇报**](https://empyreanhyr.github.io/MPU-ML-Project3-Drug-Solubility-Prediction/presentation/) · [汇报文件与离线使用说明](presentation/README.md)

包含 18 页英文主幻灯片、中文讲稿、2 页答辩备用页和完整双语系统录屏（第 16 页播放）。在线汇报由 GitHub Pages 发布。实时预测可在本机启动 SOLAR Studio 后实际演示。

## 亮点速览

- **最优泛化精度**：主模型 ExtraTrees--TabPFN 在 128 个未见母体上取得母体等权 MAE **0.6668**、逐行 MAE **0.6510**、RMSE **0.8842**、$R^2$ **0.5234**，较基础树基线误差降低 **8.54%**（配对 Bootstrap 95% 置信区间 $[-0.1219, -0.0082]$）。
- **严格母体隔离评价**：五折外层 × 三折内层 × 三种子（2026、17、42）的母体分组嵌套交叉验证，利用 `ChargeParent` 统一盐型与立体异构体，避免同系物骨架信息泄露。
- **物理与因果可解释**：SOLAR-H 结构--温度分解模型解耦结构基线与温度响应；TreeSHAP 归因证实药物结构（0.466）与显式分子间交互（0.432）主导预测；组合内固定效应破除温度负相关（$-0.00746$）的辛普森悖论，识别出稳健正向温度斜率 **$+0.01538$**（偏 $R^2$ 抗混杂稳健值 $\approx 0.54$）。
- **异构互补融合**：869 维显式分子间交互特征 + 母体等权树分裂加权（$q=1$）+ ExtraTrees 与上下文注意力表格基础模型 TabPFN v2 的折外非负凸组合。
- **全栈交互部署**：FastAPI 应用 **SOLAR Studio v5.0**（中英双语教学与科研工作台），集成 14 种已训练模型，支持单点预测、双模型对照、多溶剂变温探索、49 种溶剂高通量筛选、批量 CSV 推断、分子理化画像、多维雷达对比与适用域预警。附带全流程高清操作演示视频：[SOLAR_Studio_Demo_Bilingual.mp4](SOLAR_Studio_Demo_Bilingual.mp4)（配有中英双语字幕 [SRT](SOLAR_Studio_Demo_Bilingual.srt)、英文解说与关键卡片局部特写）。

## 问题定义

给定药物分子 $d$、溶剂分子 $s$ 与操作温度 $T$（$^\circ\mathrm{C}$），预测其十进制摩尔对数溶解度 $y = \log_{10} S$（原始浓度单位 $\mathrm{mol/L}$）。项目的核心挑战在于**面向未见药物母体（Unseen Drug Parents）**的外推泛化——测试集药物母体骨架在训练集中从未出现，而非在已知分子内部做简单温度内插。这一能力决定模型能否用于制药结晶工艺设计与高通量虚拟筛选。

## 数据与划分

课程基准数据集 `datasets/data_2026.csv` 收录 **1904 条**真实化学实验测量记录，覆盖 186 个药物名称（168 个规范化结构）、49 种工业溶剂、测量温度 $-59.5$ 至 $130.0\ ^\circ\mathrm{C}$ 及跨越逾 8 个数量级的对数溶解度（$[-6.2343, 2.2168]$）。

- **母体骨架标准化**：经 RDKit `ChargeParent` 剥离盐型反荷离子、中和形式电荷并统一立体异构标记，全量数据严格归约至 **161 个独立药物母体**、646 个药物--溶剂组合（组合网格全局稀疏度达 **92.15%**）。
- **长尾分布与测定噪声**：样本呈显著长尾分布（头部 30 个母体占全量数据的 56.6%，74 个稀有母体各仅 1--5 条记录）；数据中保留了 86 组（205 条记录）同名义条件下的实验测量冲突，以检验模型对真实测定噪声的抗干扰能力。
- **冻结数据划分**：全量 161 个母体固定划分为 **开发集**（128 个母体、1507 条记录，用于外层五折 × 内层三折嵌套交叉验证与部署拟合）与 **独立保留测试集**（33 个母体、397 条记录，冻结于 `datasets/splits/`）。

## 方法体系

### 1. SOLAR-H 结构--温度分解模型

受 van 't Hoff 热力学方程启发，将条件对数溶解度解耦为基准参考温度下的结构基线与结构调制的温度响应：

$$\widehat y_i = b(z_c) + \gamma \cdot \tau_i \cdot \left( u_c^\top \beta \right)$$

- **组内去均值闭式求解**：在包含多温度测量的药物--溶剂组合 $c$ 内取均值做差，数学消去复杂的非线性结构项 $b(z_c)$，利用母体等权加权岭回归求得温度调制系数 $\widehat\beta$ 的闭式解。
- **自适应增益阻尼**：在扣除温度项的校正目标上拟合母体等权 ExtraTrees 结构基线 $\widehat b(z_c)$，并由内层嵌套验证自适应选定收缩增益 $\gamma \in \{0, 0.1, 0.3, 1.0\}$，防止小样本狭窄温区噪声向未见母体过度外推。

### 2. ExtraTrees--TabPFN 异质融合模型

主模型包含三部分：特征表征、学习准则与异质集成：

1. **869 维显式分子间交互特征**：提取药物与溶剂各 217 维 RDKit 理化与拓扑描述符（$D_i, S_i$），依据“相似相溶”原理由简单拼接扩展为包含元素乘积与绝对差值的显式交互空间 $\left[ D_i;\; S_i;\; T_i;\; D_i \odot S_i;\; |D_i - S_i| \right] \in \mathbb{R}^{869}$（折内独立插补与方差筛选后保留 665 维有效特征）。
2. **母体等权树分裂优化（$q=1$）**：将样本权重 $w_i \propto n_{g_i}^{-1}$ 注入决策树节点加权方差缩减准则，破除高频头部母体对分裂方向的垄断（三折筛查中使 869 维 ExtraTrees 的母体 MAE 从 0.6985 降至 0.6760）。
3. **折外非负凸组合融合**：引入基于自回归 Transformer 预训练的表格基础模型 **TabPFN v2**，在内层折外（OOF）预测上以母体等权 MAE 为准则搜索最优凸组合权重 $\widehat\alpha \in [0, 1]$，通过 $\widehat y(x) = (1 - \widehat\alpha) f_{\mathrm{ET}}(x) + \widehat\alpha f_{\mathrm{PFN}}(x)$ 将决策树的正交阶梯分界与 TabPFN 的连续注意力流形深度互补。

## 实验结果

开发集（128 个未见母体、1507 条记录）母体分组外层五折嵌套验证的全部 13 项对比方案综合表现（前三项误差越小越优，$R^2$ 越大越优，三随机种子均值）：

| 模型类别 | 模型体系与技术方案 | 母体等权 MAE | 逐行 MAE | 全局 RMSE | 决定系数 $R^2$ |
|---|---|---:|---:|---:|---:|
| **集成融合方案** | **ExtraTrees--TabPFN 异质融合（本文主模型）** | **0.6668** | **0.6510** | **0.8842** | **0.5234** |
| 集成融合方案 | TabPFN 与双树（ET + CatBoost）三融合 | 0.6729 | 0.6631 | 0.8882 | 0.5191 |
| 集成融合方案 | 五候选分支全量融合模型 | 0.6767 | 0.6568 | 0.8899 | 0.5172 |
| 传统单模型 | 随机森林（869 维交互特征） | 0.6815 | 0.7057 | 0.9254 | 0.4780 |
| 前沿单模型 | TabPFN v2 表格基础模型单分支 | 0.6827 | 0.6698 | 0.9117 | 0.4933 |
| 传统单模型 | 丰富特征 ExtraTrees（869 维 + 母体等权） | 0.6831 | 0.6720 | 0.8981 | 0.5083 |
| 前沿单模型 | CatBoost 梯度提升树（869 维交互特征） | 0.6931 | 0.7168 | 0.9462 | 0.4542 |
| 物理分解模型 | SOLAR-H 结构--温度分解模型 | 0.7164 | 0.7520 | 1.0016 | 0.3884 |
| 传统单模型 | RBF 支持向量回归（869 维交互特征） | 0.7226 | 0.6600 | 0.9125 | 0.4924 |
| 前沿单模型 | 多视角核岭回归（拓扑指纹 + 理化多核） | 0.7277 | 0.7388 | 0.9501 | 0.4497 |
| 传统单模型 | 基础 ExtraTrees 基线（23 维基础特征） | 0.7469 | 0.7491 | 0.9730 | 0.4229 |
| 前沿单模型 | TabM 深度表格网络（869 维交互特征） | 0.7694 | 0.7679 | 1.0104 | 0.3777 |
| 传统单模型 | 岭回归（23 维基础特征） | 0.8746 | 0.9155 | 1.2087 | 0.1094 |

### 关键实验与机理发现

- **异质互补与高稳健性**：丰富特征 ExtraTrees 与 TabPFN 单分支性能相近（0.6831 vs. 0.6827），但残差符号不一致率达 15.0%（相关系数 0.909），折外凸组合有效抑制方差；在 $\alpha \in [0.25, 0.75]$ 宽区间内均显著优于任一单分支，三随机种子下的母体 MAE 极差仅 **0.0055**（0.6635--0.6690）。
- **分层误差与“溶解度悬崖”（Solubility Cliff）**：在占样本 54.7% 的适度溶解区间（$-2 < y \le 0$），主模型逐行 MAE 低至 **0.465**（有符号偏差仅 $-0.120$）；而在极端难溶区间（$y \le -4$，23 条记录），因 2D 拓扑特征缺失纯固态晶格能与多晶型堆积信息，模型呈系统性高估（平均有符号误差 $+2.250$），为工业应用划定了需优先补测熔点与晶型的风险边界。
- **特征归因与因果温度识别**：TreeSHAP 证实药物描述符（0.466）与显式分子间交互（0.432）占主导地位，TabPFN 分支在不同温区与极性条件下提供双向局部纠偏；在 157 个多温组合（1118 条记录）上，组合内固定效应消除了总体 OLS 的虚假负斜率（$-0.00746$），测得真实正向温度斜率 **$+0.01538\ ^\circ\mathrm{C}^{-1}$**（温度每升 $1^\circ\mathrm{C}$，摩尔溶解度净增约 3.6%，95% 母体聚类置信区间 $[0.0121, 0.0186]$）。

## 系统演示视频（SOLAR Studio Demo）

项目录制了覆盖系统 5 大核心工作台的全流程高清演示视频，配备英文口播解说、嵌入式中英双语对照字幕与界面关键指标局部特写动画：

- **视频文件（1080p MP4, 119s）**：[SOLAR_Studio_Demo_Bilingual.mp4](SOLAR_Studio_Demo_Bilingual.mp4)
- **中英双语字幕文件（SRT）**：[SOLAR_Studio_Demo_Bilingual.srt](SOLAR_Studio_Demo_Bilingual.srt)

| 场景 | 对应模块 | 关键功能与演示要点 |
| :--- | :--- | :--- |
| **Scene 01–03** | `01 Point Prediction` | 单点对数溶解度预测、`0.75 ExtraTrees + 0.25 TabPFN` 异质融合分支拆解、开发集实测点适用域支撑 |
| **Scene 04–05** | `OOD & Molecule` | 温度越界实时触发 OOD 分布外红色预警、RDKit 2D 化学结构与 Lipinski 五规则理化画像弹窗 |
| **Scene 06–08** | `02 Model Comparison` | 14 款模型五维归一化评价雷达图对比、128 个未见母体配对误差散点（主模型 77 胜率）、61 点变温响应与差值曲线 |
| **Scene 09–11** | `03 Solvent & T-Screen` | 手动触发计算模式（防误切自动计算）、49 种工业溶剂一键筛选、Top-5 推荐溶剂卡片、cLogP 散点、多溶剂连续变温对比 |
| **Scene 12–13** | `04 Ablation & Evidence` | 逐步消融改进链（0.7469 → 0.6668）、TreeSHAP 特征归因与破除辛普森悖论的组内固定效应正斜率 |
| **Scene 14** | `05 Batch Inference` | 1–100 行批量 CSV 容错推断、异常行独立隔离与一键导出实验结果 CSV |

## 快速开始（SOLAR Studio v5.0）

环境要求 Python 3.12 与 [uv](https://github.com/astral-sh/uv)。仓库已附带全部 14 个部署模型权重与评测工件，无需重新训练即可直接启动。

```bash
uv sync --frozen
uv run --frozen python hehaoran/run.py launch_studio.py
```

启动后访问 <http://127.0.0.1:8502/>（macOS / Windows 用户也可直接双击根目录的 `启动Studio.command` 或 `启动Studio.bat`）。系统提供以下核心模块：

- **溶解度预测与分子画像**：支持 186 种药物与 49 种溶剂检索、2D 结构渲染、RDKit 理化属性（Lipinski 规则审查）、分支权重贡献拆解与开发集覆盖度/外推预警指示器。
- **模型对照与全溶剂筛选**：支持 14 种模型在 128 个母体上的逐母体配对误差对比、61 点连续变温响应扫描（最多 6 种溶剂同屏对比），以及给定药物与温度下对全部 49 种溶剂的一键高通量排序与极性（cLogP / TPSA）关联分析。
- **批量实验、证据看板与互动教学**：支持 1--100 行 CSV 批量容错推断与导出、五维能力归一化雷达对比与残差分布诊断、课堂引导式演示以及浏览器本地实验记录本。

## 实验复现与核验

### 1. 接口与互动教学测试

```bash
uv run --frozen pytest -q tests/test_web_api.py tests/test_learning.py
```

### 2. 模型训练与基线补充

```bash
uv run --frozen python songjiayun/run.py run_revision.py                      # 原始 12 个对照模型
uv run --frozen python huangyaorong/run.py run_adaptive_revision.py             # SOLAR-H 自适应分解模型
bash scripts/reproduce.sh                                           # 丰富特征与第一轮融合实验
bash scripts/reproduce_tabpfn.sh                                    # TabPFN v2 与异质融合实验
PYTHONPATH=. uv run --frozen python songjiayun/run.py run_baselines.py --model all  # 常规回归基线 (RF / Ridge / RbfSVR)
uv run --frozen python scripts/evaluate_test_set.py                 # 独立保留测试集 (397 条) 单次评估
uv run --frozen python plotting/eda_revision.py                     # 数据分布与探索性分析图
uv run --frozen python plotting/revision_figures.py                 # V1 报告配图生成
```

> 报告源码（LaTeX 分章、分析脚本、复现图表的命令）已随历史报告归档到仓库外的 `../旧文件备份/`；本仓库只保留最终 PDF/DOCX 与可运行的系统本体。

> 说明：训练脚本默认校验并复用匹配冻结协议的既有结果；如需从零重训，请先在独立副本中移出相应 `output/` 实验子目录。

## 按成员组织代码

实际实现按职责存放在以下根目录文件夹中，具体文件对应关系与运行方式见各目录 README：

| 负责人 | 代码目录 | 职责 |
|---|---|---|
| songjiayun | [songjiayun/](songjiayun/README.md) | 基底模型、共同对照训练及常规基线 |
| huangyaorong | [huangyaorong/](huangyaorong/README.md) | SOLAR-H、自适应温度增益与相关消融对照 |
| yuchunshen | [yuchunshen/](yuchunshen/README.md) | ExtraTrees–TabPFN 对、候选融合、训练与导出 |
| hehaoran | [hehaoran/](hehaoran/README.md) | 应用后端、前端静态资源与启动器 |

各成员上传整个同名文件夹到仓库根目录。公共数据、特征与指标工具、分析绘图、项目配置和测试继续保留在原位置；已删除原位置的模型、训练脚本及应用入口文件，使用下方个人目录命令运行。已有模型权重的旧模块名由公共加载器解析，无需保留旧文件。

运行入口：

```bash
uv run --frozen python songjiayun/run.py run_revision.py --help
uv run --frozen python huangyaorong/run.py run_adaptive_revision.py
uv run --frozen python yuchunshen/run.py run_tabpfn_combination_v3.py all
uv run --frozen python hehaoran/run.py launch_studio.py
```

`run_revision.py` 是多模型共用训练框架，归入基底模型负责人目录；其中调用的 SOLAR-H 与相关消融模型实现归入方法一目录。各目录依赖完整仓库，删除某成员目录后，对应功能需等该成员重新上传后才可运行。结果仍写入根目录 `output/`，模型权重仍写入 `models/`。报告与贡献章节未修改。

## 目录结构

| 路径 | 内容说明 |
|---|---|
| `datasets/` | 原始数据集 `data_2026.csv`、清理策略与冻结的母体划分、嵌套交叉验证折清单（`splits/`） |
| `src/` | 公共数据、特征、指标工具，以及已有模型的统一加载支持 |
| `scripts/` | 公共复现入口、保留集评估、结果分析及仓库检查；训练实现已迁入个人目录 |
| `models/` | 全部部署与实验模型权重（`.joblib` / `.ckpt`）、第三方权重许可与 SHA-256 校验清单 `manifest.json` |
| `output/` | 嵌套验证逐折/逐行预测、参数搜索记录、配对统计检验、因果与归因分析等 CSV/JSON 工件 |
| `hehaoran/webapp/` | SOLAR Studio 后端与前端静态资源；原根目录 `webapp/` 已移除 |
| `Report_final/` | 最终提交报告（PDF/Word）与查重报告；历史版本源码见仓库外 `../旧文件备份/` |
| `plotting/`、`tools/`、`configs/` | 探索性数据分析与报告绘图脚本、图表质量审查工具及实验配置 |
| `tests/` | FastAPI 接口一致性、离线模型对齐、全溶剂筛选、诊断接口与互动学习中心自动化测试 |
| `Question/`、`bibliography/`、`assets/` | 原始课程题目要求、文献数据库与核验脚本、报告与绘图所用内嵌字体 |

## 致谢与许可

本项目为澳门理工大学 **COMP6133 机器学习**课程小组项目。TabPFN v2 使用公开预训练权重，CatBoost、TabM、scikit-learn 与 RDKit 等均遵循各自的开源许可协议，详见 [models/README.md](models/README.md) 与 `bibliography/`。
