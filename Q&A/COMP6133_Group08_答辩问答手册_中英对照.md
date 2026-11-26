# 项目答辩问答手册
## Project Defence Q&A Handbook

**未见母体的药物条件溶解度预测　SOLAR-H 与 ExtraTrees–TabPFN**

*Conditional solubility prediction for unseen parent compounds across solvents and temperature*

> **0.6668** 母体加权 MAE　·　**10.7%** 较基础树　·　**+0.01538** 每 °C 斜率　·　**1.70 s** 单点端到端

| 课程 Course | COMP6133 Machine Learning　·　Macao Polytechnic University |
|---|---|
| **小组 Team** | Group 08 |
| **成员 Members** | Haoyang He（P2622962）　Jiayun Song（P2622410）<br>Yaorong Huang（P2622902）　Chunsheng Yu（P2619574） |
| **版本 Version** | v2.0　·　2026-11-26 |
| **用途 Purpose** | 15 分钟小组汇报 + 15 分钟问答的内部准备 |
| **数字来源 Sources** | 提交版报告、README、演示脚本、output/ 证据文件 |

*本手册为内部准备材料，不替代正式报告。所有数字以报告与仓库证据为准；遇到报告、幻灯片与手册口径不一致时，按 0.7 节的处理顺序应答。*

**76 题　·　8 章　·　13 个模型　·　中英对照　·　内部材料，请勿外传**

# 0　快速定位

*Quick orientation: how to use this book, the one-minute pitch, the numbers, and who answers what*

## 0.1　使用方法

*How to use this handbook*

这本手册按答辩现场的顺序组织：先统一口径，再按“问题与数据 → SOLAR-H → 特征与融合 → 结果 → 可解释性与因果 → 系统 → 局限 → 分工”展开。共 **76 题**，每题给出可直接朗读的中文 30 秒回答、对应的英文回答、必须记住的数字，以及评委最可能继续追问的一层。

准备时不要逐字背。**只背每题的粗体结论和关键数字**，其余用自己的话讲；英文回答用于外籍评委或需要换语言时，不要求逐字对应。题号前的负责人是主答人，其他人补位，不抢答。

**建议的三轮准备**　A three-pass preparation

**第一轮（60 分钟）**：读 0.4 的 60 秒陈述、0.6 的数字口径表、Q01、Q39、Q75，把主线串起来。**第二轮（3 小时）**：按自己负责的章节精读，每人至少能脱稿回答本领域全部题目。**第三轮（90 分钟）**：两人一组互问，专挑 Q09、Q21、Q36、Q44、Q49、Q52 这些容易被问穿的题。

## 0.2　答题四步法

*The four-step answer pattern*

现场最怕两种回答：一是只有结论没有数字，二是数字很多但没有边界。统一用四步，30 秒内说完；评委追问再展开到 90 秒。

| 步骤 | 说什么 | 示例句式 |
|---|---|---|
| ① 结论 | 先给一句话判断，不铺垫。 | “是 / 不是，我们的做法是……” |
| ② 数字 | 给一个主数字，必要时给区间。 | “母体加权 MAE 0.6668，配对区间 [−0.1366, −0.0276]。” |
| ③ 机制 | 为什么这个数字可信：协议、消融或对照。 | “因为外层按母体分组，调参全在内层。” |
| ④ 边界 | 主动说局限，防止被追问时被动。 | “但它只对观测组合成立，不能外推到新母体。” |

> **30 秒与 90 秒**
> 30 秒版只要四步各一句；90 秒版在“机制”里加一个消融或一个对照，在“边界”里加一句“这一点我们写进了局限”。超过 90 秒还没有数字，评委会失去耐心。

## 0.3　三条纪律

*Three ground rules*

**第一，不编数字。** 报告没有的，就说“报告没有做这个对照，我们只论证了机制”；不要临场算一个看起来合理的数。**第二，不抢答。** 问题落在谁的章节，谁先答；跨章节的由主答人答完，其他人只补一句。**第三，不辩护到底。** 被指出局限时，先承认，再给证据边界，最后给下一步；不要用“但是”硬拗。

## 0.4　60 秒陈述

*The one-minute pitch*

用于开场、电梯陈述，或评委说“先用一分钟讲清楚你们做了什么”。中文约 280 字，正常语速 60–75 秒。

> 我们解决的是药物发现早期的一个外推问题：训练集中没有出现过的新母体，在 49 种溶剂和连续温度下，溶解度是多少。课程数据共 1904 条实测记录、161 个母体。我们把 128 个母体、1507 条记录用于五外层三内层、按母体分组的嵌套交叉验证，33 个母体、397 条记录留作盲测库。方法上做了两条线：一条是 SOLAR-H，用组内去均值把结构基线和温度斜率分开，再用收缩增益控制外推；另一条是 ExtraTrees–TabPFN，用 869 维显式溶质—溶剂交互特征、母体等权训练，再做折外凸组合。最终母体加权 MAE 0.6668，比基础 ExtraTrees 的 0.7469 低 0.0801，相对 10.7%；配对 bootstrap 区间 [−0.1366, −0.0276]。另外，我们用组内固定效应把合并数据里 −0.00746 的温度负相关纠正为 +0.01538 每摄氏度，约 3.6%。系统以 FastAPI 部署，单点端到端约 1.7 秒。

**ENGLISH VERSION　approximately 170 words**

> We address an extrapolation problem in early drug discovery: how soluble is a parent compound that never appears in training, across 49 solvents and continuous temperature? The course data contain 1,904 measurements and 161 parents. We use 128 parents and 1,507 records for five-outer, three-inner nested cross-validation grouped by parent, and keep 33 parents and 397 records as a blind library. We built two routes. SOLAR-H separates the structural baseline from the temperature slope by within-combination de-meaning, then shrinks the slope for safe extrapolation. ExtraTrees–TabPFN uses 869 explicit solute–solvent interaction features, parent-equal training weights, and an out-of-fold convex blend. The final parent-weighted MAE is 0.6668, 0.0801 lower than the 0.7469 base ExtraTrees, or 10.7%; the paired bootstrap interval is [−0.1366, −0.0276]. A within-combination fixed-effects analysis turns the pooled −0.00746 temperature correlation into +0.01538 per °C, about 3.6%. The system is deployed with FastAPI and answers a single query in about 1.7 seconds end to end.

## 0.5　分工与主答

*Who answers what*

分工按报告章节和汇报单元对齐。**主答人**负责该领域的完整回答；其他人只在主答人结束后补一句数字或边界，不重复。

| 成员 | 学号 | 报告章节 | 汇报单元 | 问答主责 |
|---|---|---|---|---|
| **Haoyang He** | P2622962 | 第 1 章、第 8 章 | Unit 4（19–24） | 系统、应用、结论、开场 |
| **Jiayun Song** | P2622410 | 第 2 章 | Unit 1（01–07） | 问题定义、数据、评估协议 |
| **Yaorong Huang** | P2622902 | 第 3、5、7、9 章 | Unit 3（12–18） | 融合、结果、可解释性与因果 |
| **Chunsheng Yu** | P2619574 | 第 3、4、6 章 | Unit 2（08–11） | SOLAR-H、对比、温度消融 |

第 3 章由 Yaorong Huang 与 Chunsheng Yu 共同完成，所以 SOLAR-H 的公式与消融由 Chunsheng 主答，融合与因果由 Yaorong 主答；两人都准备对方的三个核心数字，防止评委点名。

## 0.6　数字口径总表

*The numbers, definitions and where they are used*

这张表是全场唯一口径。**只记“数值 + 定义 + 不能怎么用”三件事**；任何与表冲突的记忆，以表为准。

| 指标 | 数值 | 精确定义 / 口径 | 不能怎么用 |
|---|---|---|---|
| **样本 / 母体** | 1904 / 161 | 实测记录 / ChargeParent 后的母体 | 不要说 168 个母体；168 是唯一结构 |
| **开发集** | 128 / 1507 | 母体 / 记录；五外层三内层嵌套 CV | 主表数字只来自这 128 个母体 |
| **留出库** | 33 / 397 | 完全独立母体 / 记录；未进主表 | 不要说“在 33 母体上验证过” |
| **组合 / 稀疏度** | 646 / 92.15% | 实测药物—溶剂组合 / 理论 8232 的空缺比例 | 不是 646 个母体 |
| **温度 / 标签** | −59.5–130 °C / −6.2343–2.2168 | 实测范围 / log10(mol/L) | 超出范围不外推 |
| **主模型** | 0.6668 / 0.6510 / 0.8842 / 0.5234 | 母体加权 MAE / 逐行 MAE / RMSE / R² | 四项第一是点估计，不是“显著优于所有” |
| **基础 ET** | 0.7469 / 0.7491 / 0.9730 / 0.4229 | 23 维、200 树、行等权 | 这是主模型的唯一显著性对照 |
| **主模型降幅** | 0.0801 / 10.73% | 0.7469−0.6668 / 相对 0.7469 | 配对区间 [−0.1366, −0.0276] |
| **Rich ET 降幅** | 0.0638 / 8.54% | 0.7469−0.6831 / 相对 0.7469 | 区间 [−0.1219, −0.0082]；这是阶段降幅 |
| **种子** | 0.6635 / 0.6679 / 0.6690 | 种子 17 / 42 / 2026；均值 0.6668 | 极差 0.0055，不是置信区间 |
| **融合权重** | 75% ET + 25% TabPFN | 部署 α=0.25；各折 α 为 0.25/0.25/0/0.25/0.5 | 不是固定 0.5 |
| **温度效应** | +0.01538 / °C | 组内固定效应；约 +3.6% / °C | 不是合并 OLS 的 −0.00746 |
| **敏感性** | 54% | Cinelli–Hazlett 需解释的残差方差比例 | 不是“因果已证明” |
| **系统** | 1.70 s / 25 项 | 5 次请求端到端均值（1.68–1.73）/ 测试数 | 模型前向 <1 s，不是 API 全链路 |
| **模型数** | 13 / 14 | 开发基准 13 个 / 系统注册 14 个 | 不要混用两个口径 |

## 0.7　四条高危口径

*Four answers that must be reconciled before the defence*

> **① 8.54% 还是 10.73%？**
> 报告摘要与 §6.2 把 8.54% 和区间 [−0.1219, −0.0082] 挂在融合模型上；严格回溯，8.54% 是“特征丰富 ET 相对基础 ET”的阶段降幅（0.7469→0.6831）。融合模型相对基础 ET 是 0.0801，即 10.73%，区间 [−0.1366, −0.0276]。答辩以 10.73% 为主；如果评委按报告追问，先说明这是两个阶段，再把对应数字给全，不要把一个区间套到另一个比较上。

> **② “显著优于所有基线”不能说**
> 融合模型的四项指标都是点估计第一，但对 Rich ET 或 TabPFN 的配对区间跨零；唯一严格的显著性结论是对基础 ExtraTrees 显著。正确说法：“点估计最好，对基础树显著；对强单支是点估计更优，但差异不显著。”

> **③ 128 与 33 不能混**
> 主表全部来自 128 个开发母体的外层 CV；33 个母体、397 条是盲测库，报告没有给出融合模型在其上的结果。不要说“在 33 个未见母体上验证”，也不要把仓库里基础模型的留出记录当成融合模型的成绩。

> **④ “因果”要有限定语**
> 可以说：“在观测到的药物—溶剂组合内，控制组合固定效应后，升温 1 °C 平均带来 +0.01538 log10（约 3.6%） 的溶解度变化。”不能说：“温度对任何新母体都有这个因果效应。”固定效应只识别组合内变化，外推到新母体需要额外假设。

## 0.8　目录与高频题

*Contents and the twenty questions to rehearse first*

题号连续，按章节分组；在支持大纲的编辑器中可直接按标题跳转。

| 章 | 内容 | 题号 |
|---|---|---|
| 0 | 快速定位：使用方法、60 秒陈述、口径、分工 | — |
| 1 | 问题、数据与评估 | Q01–Q13 |
| 2 | SOLAR-H 物理解耦 | Q14–Q23 |
| 3 | 特征、ExtraTrees 与融合 | Q24–Q37 |
| 4 | 结果、误差与稳健性 | Q38–Q46 |
| 5 | 可解释性与温度因果 | Q47–Q56 |
| 6 | 系统与应用 | Q57–Q64 |
| 7 | 局限、未来与合规 | Q65–Q71 |
| 8 | 分工与现场策略 | Q72–Q76 |
| A–F | 速查表、13 模型、术语、证据索引、禁语、检查清单 | — |

**如果只有两小时**　THE TWENTY QUESTIONS TO REHEARSE FIRST

| 题号 | 主题 | 题号 | 主题 |
|---|---|---|---|
| Q01 | 一句话讲清项目 | Q28 | 母体权重进树 |
| Q02 | 为什么是未见母体 | Q30 | TabPFN 是什么 |
| Q09 | 128 与 33 母体 | Q32 | 折外凸组合 |
| Q11 | 母体加权 MAE | Q36 | 融合是否显著 |
| Q12 | 配对 bootstrap | Q39 | 8.54 还是 10.73 |
| Q17 | 组内去均值 | Q40 | 分层误差 |
| Q21 | 部署 γ=0 | Q44 | 33 母体留出 |
| Q24 | 为什么 ExtraTrees | Q49 | 温度归因矛盾 |
| Q25 | 869 维怎么来的 | Q52 | 辛普森悖论 |
| Q27 | 交互项与消融 | Q60 | 1.7 秒的含义 |

这 20 题覆盖了 80% 的现场追问。先做到每題 30 秒不卡壳，再补其余题目。

# 1　问题、数据与评估

*Problem, data and evaluation: what is predicted, under which protocol, and why the protocol is the argument*

### Q01　用一句话说清你们做了什么？

*What did you do, in one sentence?*

*主答 Jiayun Song　·　报告 §1.1–1.4；§6.2　·　证据 README；output/cv_results.csv*

**中文回答（30 秒）**

课程给了 1904 条真实实验溶解度记录。我们要预测的是：训练集中从未出现过的药物母体，在 49 种溶剂、连续温度下，log10 摩尔溶解度是多少。评估用按母体分组的五外层三内层嵌套交叉验证：128 个母体、1507 条做开发，33 个母体、397 条完全留出。方法有两条线：SOLAR-H 把结构基线和温度斜率解耦；ExtraTrees–TabPFN 用 869 维显式溶质—溶剂交互、母体等权训练，再做折外凸组合。最终母体加权 MAE 0.6668，比基础 ExtraTrees 的 0.7469 低 0.0801，相对 10.7%。

**English answer（30 s）**

The course provides 1,904 real experimental solubility records. We predict log10 molar solubility for drug parents that never appear in training, across 49 solvents and continuous temperature. Evaluation uses a five-outer, three-inner nested cross-validation grouped by parent: 128 parents and 1,507 records for development, with 33 parents and 397 records fully held out. We built two routes. SOLAR-H decouples the structural baseline from the temperature slope; ExtraTrees–TabPFN combines 869 explicit solute–solvent interaction features, parent-equal training weights, and an out-of-fold convex blend. The final parent-weighted MAE is 0.6668, 0.0801 lower than the 0.7469 base ExtraTrees, a 10.7% relative reduction.

> **关键数字**　1904 条 → 161 母体 → 128/1507 开发 + 33/397 留出；0.7469 → 0.6668（−0.0801，−10.7%）

> **可能追问**　如果追问“最大创新是什么”，不要只答“用了 TabPFN”。答两点：评估与优化同时做母体等权修正；用组内固定效应把温度伪相关纠正回来，并做了敏感性分析。

### Q02　为什么把任务定义成“未见母体”预测，而不是普通回归？

*Why frame the task as unseen-parent prediction rather than ordinary regression?*

*主答 Jiayun Song　·　报告 §1.1；§3.5　·　证据 报告 §3.5；datasets/splits/*

**中文回答（30 秒）**

因为药物发现本身就是外推：新骨架在筛选阶段没有实验数据，模型必须对没见过的分子给出估计。而这类数据是同一母体在几十种溶剂、几十个温度上反复测量；按行随机划分，同一母体的记录会同时进训练和测试，指标会被系统性高估。按母体分组隔离，测的才是“新骨架泛化”。我们没有跑随机划分对照，所以不报“会高估多少”的具体数字，只论证机制和文献依据。

**English answer（30 s）**

Drug discovery is itself an extrapolation problem: a novel scaffold has no measurements at screening time, so the model must estimate it. These datasets repeatedly measure the same parent across many solvents and temperatures. A row-wise random split puts records of the same parent in both training and test, which systematically inflates the metrics. Grouping by parent measures generalisation to new scaffolds. We did not run a random-split control, so we do not quote a specific inflation number; we argue the mechanism and cite the literature.

> **关键数字**　161 母体；646 个实测组合；同一母体多溶剂、多温度重复；主表按母体分组。

> **可能追问**　追问“随机划分会高估多少”：报告没有这个对照，不能编数字；正确回答是“这是我们应该补的第一个对照实验”，并说明机制。

### Q03　标签是什么、单位是什么、为什么取 log10？

*What exactly is the label, in what unit, and why log10?*

*主答 Jiayun Song　·　报告 §3.1　·　证据 报告 §3.1；datasets/*

**中文回答（30 秒）**

标签是 log10 摩尔溶解度，单位是 log10(mol/L)。原始溶解度跨几个数量级，直接回归会被大值主导、误差重尾；取 log 后近似可加、方差更稳定，也符合热力学里 ln x 与 1/T 的线性关系。0.6668 个 log 单位大约等于 4.6 倍的乘性误差，因为 10^0.6668≈4.65。对早期筛选，这个量级可以用于排序和溶剂初筛，但不够做配方规格。

**English answer（30 s）**

The label is log10 molar solubility, in log10(mol/L). Raw solubility spans several orders of magnitude, so direct regression is dominated by large values and has heavy-tailed errors. The log makes effects approximately additive, stabilises variance, and matches the thermodynamic ln x versus 1/T relation. A MAE of 0.6668 log units is roughly a 4.6-fold multiplicative error, since 10^0.6668 ≈ 4.65. For early screening this supports ranking and solvent selection, but not formulation specification.

> **关键数字**　0.6668 log10 ≈ 4.6×；标签范围 −6.2343 到 2.2168。

> **可能追问**　追问“0.6668 算好吗”：看用途。排序和初筛可以；精确配方不够。与文献数字不可直接比，因为划分、数据和指标不同。

### Q04　课程数据的基本情况？

*What does the dataset contain?*

*主答 Jiayun Song　·　报告 §3.2；表 1　·　证据 报告表 1；output/data_audit/*

**中文回答（30 秒）**

data_2026.csv 共 1904 条实测记录；186 个药物名称，规范结构 168 个，ChargeParent 后 161 个母体；49 种溶剂；理论 168×49=8232 个药物—溶剂组合，实际只有 646 个，稀疏度 92.15%；温度 −59.5 到 130 °C；标签 −6.2343 到 2.2168。头部 30 个母体占 56.6% 的记录，长尾非常明显。

**English answer（30 s）**

The file contains 1,904 measurements, 186 drug names, 168 canonical structures and, after ChargeParent, 161 parents, plus 49 solvents. Of the 168 × 49 = 8,232 possible drug–solvent pairs, only 646 are measured, a 92.15% sparsity. Temperature runs from −59.5 to 130 °C and the label from −6.2343 to 2.2168. The top 30 parents account for 56.6% of records, so the long tail is severe.

> **关键数字**　1904 / 186 / 168 / 161；49 溶剂；646 组合；92.15% 稀疏；30 母体 56.6%。

> **可能追问**　追问“为什么只有 646 个组合”：不是全因子实验，测量由实际项目需求驱动；这既是数据稀疏，也是模型必须面对的真实分布。

### Q05　数据质量上发现了什么问题，怎么处理？

*What data-quality problems did you find, and how did you handle them?*

*主答 Jiayun Song　·　报告 §3.3　·　证据 报告 §3.3；output/data_audit/*

**中文回答（30 秒）**

三类。第一，86 组共 205 条记录在药物—溶剂—温度完全相同的名义条件下标签不一致，其中 11 组相差超过一个数量级，反映批次、平衡时间、晶型或固液分离差异。第二，部分 RDKit 描述符出现非有限值，我们在折内用中位数插补加零方差过滤，验证折不参与。第三，长尾采样：头部 30 个母体占 56.6%，普通按行训练会被头部主导，所以我们用母体等权。

**English answer（30 s）**

Three issues. First, 86 groups totalling 205 records disagree under identical nominal drug–solvent–temperature conditions, and 11 groups differ by more than one order of magnitude, reflecting batch, equilibration time, polymorph or separation differences. Second, some RDKit descriptors are non-finite; we median-impute and drop zero-variance features strictly inside each training fold. Third, long-tailed sampling: the top 30 parents hold 56.6% of records, so row-wise training is head-dominated; we use parent-equal weights.

> **关键数字**　86 组 / 205 条；11 组差 >1 log；30 母体 56.6%；插补只在折内。

> **可能追问**　追问“为什么不在划分前清洗”：任何使用标签的清洗都必须折内做，否则泄漏；冲突记录保留是为了估计真实噪声，不是疏忽。

### Q06　86 组冲突记录为什么不删、也不平均？

*Why keep the 86 conflicting groups instead of deleting or averaging them?*

*主答 Jiayun Song　·　报告 §3.3；§6.4　·　证据 报告 §3.3；output/evidence/*

**中文回答（30 秒）**

删除会把数据清洗成“容易的子集”，指标变好但不代表真实场景；平均则假设误差相互抵消，掩盖了不可约的测量噪声，而且同一条件的重复测量本身携带晶型与动力学信息。我们让模型在含噪标签上训练，把冲突作为误差下限的一部分，并在局限里明确写出来。极端带 MAE 2.251 里有一部分就是这类不可约噪声。

**English answer（30 s）**

Deleting them would clean the data into an easy subset and improve the metrics without reflecting reality. Averaging assumes errors cancel and hides irreducible measurement noise, while repeated measurements under the same condition carry polymorph and kinetic information. We train on the noisy labels, treat conflicts as part of the error floor, and state this in the limitations. Part of the 2.251 MAE in the extreme band is this irreducible noise.

> **关键数字**　205 / 1904 ≈ 10.8% 的记录涉及冲突；极端带 MAE 2.251。

> **可能追问**　追问“能否估计噪声上限”：可以，用重复测量做方差分析或重复性实验；报告没有做，这是未来工作。

### Q07　ChargeParent 具体做了什么，为什么 168 变成 161？

*What does ChargeParent do, and why do 168 structures become 161 parents?*

*主答 Jiayun Song　·　报告 §3.4　·　证据 报告 §3.4；datasets/*

**中文回答（30 秒）**

真实数据里同一药效团会以不同盐型、带电状态、立体异构体出现。RDKit 的 ChargeParent 会剥离无机反离子和溶剂化物、把形式电荷中和成中性母体、去掉立体标记，只留拓扑母核。这样同一药物的所有盐型映射到同一个组键，分组交叉验证才不会把“同母体的盐”泄漏到测试折。186 个名称→168 个唯一结构→161 个母体，就是这层层归并的结果。

**English answer（30 s）**

One pharmacophore appears as different salts, charge states and stereoisomers. RDKit ChargeParent strips inorganic counterions and solvates, neutralises formal charges and removes stereo marks, leaving only the topological parent. All salt forms of the same drug then map to one group key, so grouped cross-validation cannot leak a salt of the same parent into the test fold. The chain is 186 names → 168 unique structures → 161 parents.

> **关键数字**　186 → 168 → 161；7 个结构因盐型、电荷或立体归并。

> **可能追问**　追问“这会不会让任务更容易”：它定义的是“新母体”泛化单位；不归并反而会把同母体的盐泄漏进测试，指标会虚高。

### Q08　为什么按母体分组划分，而不是随机划分？

*Why split by parent instead of randomly?*

*主答 Jiayun Song　·　报告 §3.5；§1.2　·　证据 报告 §3.5；datasets/splits/*

**中文回答（30 秒）**

因为同一母体在数据里有几十条记录，随机划分会让同一骨架同时出现在训练和测试。母体分组后，测试折里的每个母体在训练折完全不可见，测的才是新骨架外推。嵌套再进一步：外层留出的母体只用于评估，内层做插补、方差过滤、超参和融合权重，避免调参泄漏。

**English answer（30 s）**

The same parent has dozens of records, so a random split puts the same scaffold in both training and test. With parent grouping, every test parent is completely unseen in training, which measures new-scaffold extrapolation. Nesting goes further: outer-fold parents are used only for evaluation, while imputation, variance filtering, hyperparameters and blend weights are fitted inside the inner folds, preventing tuning leakage.

> **关键数字**　5 外层 × 3 内层 × 3 种子；外层母体在训练折不可见。

> **可能追问**　追问“分组后训练和测试分布差异大怎么办”：会差，但这正是目标分布；我们用母体等权降低头部影响，并在局限里承认适用域。

### Q09　128 个开发母体和 33 个留出母体分别怎么用？

*How are the 128 development parents and the 33 held-out parents used?*

*主答 Jiayun Song　·　报告 §3.5.1　·　证据 报告 §3.5.1；datasets/splits/*

**中文回答（30 秒）**

161 个母体先切成 128 个开发母体（1507 条）和 33 个独立留出母体（397 条）。主表所有数字都来自 128 个开发母体的外层交叉验证；33 个母体是盲测库，没有参与调参，也没有写进主结果。这是我们报告的一个空白：我们宁愿承认没有报，也不在答辩里临时给一个没经过完整复核的数字。

**English answer（30 s）**

The 161 parents are split into 128 development parents (1,507 records) and 33 independent held-out parents (397 records). Every number in the main table comes from outer cross-validation over the 128 development parents. The 33 parents are a blind library: they were not used for tuning and are not reported as a main result. This is a gap in the report. We would rather acknowledge it than improvise an unreviewed number during the defence.

> **关键数字**　128 / 1507；33 / 397；主表只覆盖 128。

> **可能追问**　追问“为什么留而不用”：作为最终无偏检验，避免反复迭代污染；报告窗口内没有把融合流程冻结后一次性跑完，这是下一步第一件事。

### Q10　嵌套交叉验证的内层和外层分别做什么？

*What do the inner and outer loops of the nested cross-validation do?*

*主答 Jiayun Song　·　报告 §3.5.2；§6.1　·　证据 报告 §3.5.2；output/cv_results.csv*

**中文回答（30 秒）**

外层把 128 个母体分五折，每次留一折母体做评估；外层训练集里再做三折内层分组，所有中位数插补、零方差过滤、超参搜索、γ 选择和融合权重 α 都只在内层拟合；外层折完全没看过。三种子 2026、17、42 重复，报告三种子平均。这样评估的是“包括模型选择在内的完整流程”，不是某一次调好的结果。

**English answer（30 s）**

The outer loop splits the 128 parents into five folds and holds out one parent fold for evaluation. Inside each outer training set, a three-fold inner split performs median imputation, zero-variance filtering, hyperparameter search, γ selection and blend-weight selection. The outer fold is never touched. We repeat with seeds 2026, 17 and 42 and report the three-seed mean, so the estimate covers the whole modelling pipeline, not one tuned run.

> **关键数字**　5 × 3 × 3；配对 bootstrap 在外层 128 母体上做 10,000 次。

> **可能追问**　追问“为什么要三种子”：树和 TabPFN 都有随机性；三种子极差 0.0055，说明结论不是单次抽签。

### Q11　为什么要自己定义母体加权 MAE？

*Why define a parent-weighted MAE?*

*主答 Jiayun Song　·　报告 §3.5.2；§6.2　·　证据 报告 §3.5.2；output/evidence/*

**中文回答（30 秒）**

普通 MAE 按行平均，被记录多的头部母体主导；我们要的是“在没见过的母体上平均准不准”。所以先算每个母体的平均绝对误差 A_g，再对母体等权平均：L=(1/|G|)·Σ_g A_g。这个准则同时用在评估和训练：训练时令 w_i∝1/n_{g_i}，每个母体的总损失质量相同。主模型母体加权 0.6668、逐行 0.6510，差 0.0158，说明头部母体确实更容易，等权后更难。

**English answer（30 s）**

A plain MAE averages rows and is dominated by head parents with many records. We need accuracy averaged over unseen parents. We first compute each parent's mean absolute error A_g, then average equally over parents: L = (1/|G|) Σ_g A_g. The same criterion is used on both sides: evaluation, and training via w_i ∝ 1/n_{g_i}, so every parent contributes equal total loss mass. The blend scores 0.6668 parent-weighted versus 0.6510 row-wise; the 0.0158 gap shows head parents are easier and equal weighting is stricter.

> **关键数字**　0.6668（母体等权）vs 0.6510（逐行）；q=1。

> **可能追问**　追问“会不会牺牲常见药物”：会做权衡。如果业务只看头部，应报逐行 MAE；我们选择母体等权，是因为目标是新骨架。

### Q12　统计显著性怎么检验，区间怎么读？

*How did you test significance, and how should the interval be read?*

*主答 Yaorong Huang　·　报告 §6.2　·　证据 报告 §6.2；output/evidence/*

**中文回答（30 秒）**

非参数的母体配对 bootstrap：对 128 个外层母体有放回重采样 10,000 次，每次算两个模型在每个母体上的 MAE 之差，再对母体取平均，得到 Δ 的分布，取 2.5% 和 97.5% 分位。配对的作用是消掉“母体本身难不难”的方差，只留下模型差异。融合对基础 ET 的 Δ=−0.0801，95% CI [−0.1366, −0.0276]，整个区间在 0 左边，所以显著。

**English answer（30 s）**

A non-parametric parent-paired bootstrap: we resample the 128 outer parents with replacement 10,000 times, compute each model's parent-level MAE difference, average over parents, and take the 2.5% and 97.5% quantiles. Pairing removes the variance from parent difficulty and isolates the model difference. For the blend versus base ExtraTrees, Δ = −0.0801 with 95% CI [−0.1366, −0.0276]; the whole interval is below zero, so the improvement is significant.

> **关键数字**　10,000 次重采样；Δ=−0.0801；95% CI [−0.1366, −0.0276]。

> **可能追问**　追问“有没有做多重比较校正”：只做了少量预先指定的比较，没有做 Bonferroni；区间按描述性不确定性读，不把 0.05 当魔法阈值。

### Q13　为什么同时报四个指标？R²=0.5234 算低吗？

*Why report four metrics, and is R² = 0.5234 low?*

*主答 Yaorong Huang　·　报告 §6.2；表 4　·　证据 报告表 4；output/evidence/*

**中文回答（30 秒）**

四个指标各管一件事：母体加权 MAE 是选择准则，对应“新母体平均误差”；逐行 MAE 是每次测量的平均误差；RMSE 惩罚大错；R² 看解释方差。R²=0.5234 在未见母体上不算高，但基础 ET 只有 0.4229，而且这里有 10.8% 的冲突标签和极端带；文献里的 R² 多是随机划分或同分布测试，不能直接比。外推设定下，0.52 是中等水平，不是“拟合很好”。

**English answer（30 s）**

Each metric answers a different question: parent-weighted MAE is the selection criterion and matches average error on new parents; row-wise MAE is the average per-measurement error; RMSE penalises large misses; R² measures explained variance. R² = 0.5234 is moderate for unseen parents, but the base ExtraTrees is only 0.4229, and the data contain 10.8% conflicting labels plus an extreme band. Literature R² values often use random or in-distribution splits and are not directly comparable. Under extrapolation, 0.52 is moderate, not excellent.

> **关键数字**　0.6668 / 0.6510 / 0.8842 / 0.5234；基础 ET 0.7469 / 0.7491 / 0.9730 / 0.4229。

> **可能追问**　追问“R² 低是不是模型不行”：在外推设定下，0.52 是中等；换随机划分会高很多，但那测的是另一个问题。

# 2　SOLAR-H 物理解耦

*SOLAR-H: a physics-informed structure–temperature decomposition that is interpretable by construction*

### Q14　SOLAR-H 是什么，名字怎么来的？

*What is SOLAR-H, and where does the name come from?*

*主答 Chunsheng Yu　·　报告 §4.1–4.2；§7.2　·　证据 报告 §4；output/cv_results.csv*

**中文回答（30 秒）**

SOLAR-H 是 Structured Orthogonal Linear & Additive Regression – Hybrid 的缩写，是我们这条“物理解耦”分支的名字。它把 log10 溶解度写成两项之和：结构基线 b(z_c) 加温度响应 γ·τ·(u_c^Tβ)。温度项先用组内去均值把结构常数消掉，再用加权岭回归估斜率；结构项用树模型在“扣掉温度贡献”的目标上拟合。它的价值不在最高分，而在于每个部件都能单独消融、单独解释。

**English answer（30 s）**

SOLAR-H stands for Structured Orthogonal Linear & Additive Regression – Hybrid, the name of our physics-informed branch. It writes log10 solubility as a sum of two terms: a structural baseline b(z_c) plus a temperature response γ·τ·(u_c^Tβ). The temperature term first removes the structural constant by within-group de-meaning, then estimates the slope with a weighted ridge regression; the structural term is a tree ensemble fitted to the temperature-corrected target. Its value is not the top score but that every component can be ablated and explained separately.

> **关键数字**　ŷ = b(z_c) + γ·τ·(u_c^Tβ)；45 维增广向量；λ=1000。

> **可能追问**　追问“H 是什么”：Hybrid，指“线性温度项 + 非线性树基线”的混合结构，不是层级模型。

### Q15　为什么要把结构和温度拆开，传统做法差在哪？

*Why separate structure from temperature, and what is wrong with the conventional approach?*

*主答 Chunsheng Yu　·　报告 §4.1　·　证据 报告 §4.1；§7.5*

**中文回答（30 秒）**

传统做法把温度当成几百个分子特征中的一列。问题有两个：温度只有一维，信号容易被稀释；更严重的是采样不随机——难溶体系更常在高温下测，模型会学到“温度越高越难溶”的伪相关。拆开之后，温度斜率只由同一药物—溶剂组合内部的温度变化识别，结构差异被组内去均值消掉，斜率不再被“哪个母体”污染。

**English answer（30 s）**

Conventional models feed temperature as one column among hundreds of molecular features. Two problems follow: temperature is one-dimensional and its signal is easily diluted; worse, sampling is non-random — poorly soluble systems are measured more often at high temperature, so the learner picks up a spurious negative association. After decoupling, the slope is identified only from temperature variation inside the same drug–solvent combination, and structural differences are removed by within-group de-meaning.

> **关键数字**　同一组合内 ≥2 个温度才进入斜率估计；157 组合、73 母体、1118 条。

> **可能追问**　追问“树模型不是也能学交互吗”：能，但树把温度和结构混在一起，外推到新母体时温度响应会漂移；SOLAR-H 是把物理约束显式写进模型。

### Q16　45 维增广向量怎么构造，τ 为什么用中位数和四分位距？

*How is the 45-dimensional augmented vector built, and why standardise temperature by median and IQR?*

*主答 Chunsheng Yu　·　报告 §4.2　·　证据 报告 §4.2；output/analysis/*

**中文回答（30 秒）**

药物和溶剂各取 11 个理化描述符：分子量、MolLogP、TPSA、氢键给体/受体、芳环数等。两两做三种组合——原值、Hadamard 积、绝对差——得到 44 维，再加一个偏置项，凑成 45 维 u_c。温度用训练折的中位数和四分位距做稳健标准化：τ=(T−median)/IQR。用中位数和 IQR 而不是均值和标准差，是因为温度分布偏斜、还有极端低温记录，稳健统计量不会被少数点拉走。

**English answer（30 s）**

We take 11 physicochemical descriptors for the drug and 11 for the solvent: molecular weight, MolLogP, TPSA, hydrogen-bond donors and acceptors, aromatic-ring count, and so on. Pairing them gives three blocks — raw values, Hadamard products and absolute differences — for 44 dimensions, plus a bias term, so u_c has 45 entries. Temperature is robustly standardised with the training-fold median and interquartile range: τ = (T − median)/IQR. Median and IQR are used instead of mean and standard deviation because the temperature distribution is skewed and contains extreme cold records.

> **关键数字**　11 + 11 → 44 + 偏置 = 45；τ = (T − median) / IQR。

> **可能追问**　追问“为什么不用 one-hot 溶剂”：49 个溶剂 one-hot 会稀疏且不能外推到新溶剂；描述符至少能表达极性匹配。

### Q17　组内去均值到底在做什么，为什么能把 b(z_c) 消掉？

*What does within-group de-meaning actually do, and why does it cancel b(z_c)?*

*主答 Chunsheng Yu　·　报告 §4.3　·　证据 报告 §4.3；§7.5.2*

**中文回答（30 秒）**

对每个药物—溶剂组合 c，先算组内均值 ȳ_c 和 ū_c，再把每条记录减去组内均值。因为 b(z_c) 在同一组合内是常数，减均值后正好消失，剩下的只有温度变化带来的那部分。这样 β 只用“同一体系升温/降温”的信息估计，不会被“这个母体本身溶不溶”混淆。代价是：只有至少两个不同温度的组合才能提供斜率信息。

**English answer（30 s）**

For each drug–solvent combination c, we compute the within-group means ȳ_c and ū_c and subtract them from every record. Because b(z_c) is constant inside a combination, it cancels exactly, leaving only the part driven by temperature change. β is therefore estimated purely from heating or cooling the same system, not from whether that parent is generally soluble. The cost is that only combinations with at least two distinct temperatures contribute slope information.

> **关键数字**　ỹ = y − ȳ_c；ũ = u − ū_c；157 组合、1118 条满足条件。

> **可能追问**　追问“只有一个温度的组合怎么办”：它们不进 β 的估计，但仍可用于拟合结构基线 b(z_c)。

### Q18　为什么用岭回归闭式解，不用梯度提升？

*Why a closed-form ridge regression instead of gradient boosting?*

*主答 Chunsheng Yu　·　报告 §4.3　·　证据 报告 §4.3；output/analysis/*

**中文回答（30 秒）**

因为去均值后只剩 45 维、样本量一千出头，而且我们要的是“可解释的线性温度斜率”，不是又一个黑箱。闭式解 β=(ŨᵀWŨ+λI)⁻¹ŨᵀWỹ 一步算完，λ=1000 保证矩阵可逆、系数稳定；换成 boosting，斜率会变成特征重要性和局部交互的混合物，没法回答“每升高 1 °C 到底变多少”。基线那部分已经交给树了，温度这部分就应该保持线性、保持可检验。

**English answer（30 s）**

After de-meaning we have only 45 dimensions and about a thousand rows, and we want an interpretable linear temperature slope, not another black box. The closed form β = (ŨᵀWŨ + λI)⁻¹ŨᵀWỹ is computed in one step, with λ = 1000 keeping the inverse stable. A boosted model would turn the slope into a mixture of feature importances and local interactions, which cannot answer “how much does it change per °C”. The nonlinear baseline is already handled by the tree; the temperature term should stay linear and testable.

> **关键数字**　闭式解；λ=1000；45 维；约 1118 条。

> **可能追问**　追问“λ 怎么选”：固定 1000 是为了数值稳定，没有把它当调参重点；换 λ 对斜率方向不影响，报告没有做完整敏感性，这是可补的实验。

### Q19　γ 是什么，消融说明了什么？

*What is γ, and what does the ablation show?*

*主答 Chunsheng Yu　·　报告 §4.4–4.5　·　证据 报告 §4.5；图 3*

**中文回答（30 秒）**

γ 是全局温度增益，控制“学到的温度斜率在预测时用多少”。γ=0 完全不用温度项，退化成结构基线；γ=1 全量使用。我们在内层网格里从 {0, 0.1, 0.3, 1.0} 选，按母体加权 MAE。消融结果很直接：自适应 γ 的 MAE 是 0.7164；强制 γ=1 升到 0.8150，恶化 0.0987；完全关掉温度项就是 0.7164 的结构基线版本。说明温度斜率本身有信息，但直接外推到新母体会过冲，需要收缩。

**English answer（30 s）**

γ is a global temperature gain that controls how much of the learned slope is used at prediction time. γ = 0 removes the temperature term and reduces the model to the structural baseline; γ = 1 uses it in full. We select γ from {0, 0.1, 0.3, 1.0} inside the inner grid by parent-weighted MAE. The ablation is direct: adaptive γ gives 0.7164; forcing γ = 1 raises MAE to 0.8150, a deterioration of 0.0987; removing the temperature term altogether gives the 0.7164 structural baseline. The slope carries information, but extrapolating it to unseen parents overshoots and needs shrinkage.

> **关键数字**　自适应 0.7164；γ=1 0.8150（+0.0987）；γ=0 即结构基线。

> **可能追问**　追问“为什么小样本组合容易过冲”：每个组合只有几个温度点，斜率估计方差大；γ 收缩相当于把不可靠的斜率拉回 0。

### Q20　母体权重在 SOLAR-H 里起什么作用？

*What role does parent weighting play in SOLAR-H?*

*主答 Chunsheng Yu　·　报告 §4.5；§3.5.2　·　证据 报告 §4.5；output/evidence/*

**中文回答（30 秒）**

和融合模型一样，SOLAR-H 的训练也按 w_i∝1/n_{g_i} 给每个母体相同的总损失质量。关掉这个权重，MAE 从 0.7164 升到 0.7380，恶化 0.0216。原因很实际：数据里头部 30 个母体占 56.6% 的记录，行等权会让模型优先拟合这些“熟面孔”，而我们要的是在 128 个未见母体上平均准。这个消融也说明，母体加权不是融合模型独有的技巧，它对物理解耦分支同样必要。

**English answer（30 s）**

As in the blend, SOLAR-H trains with w_i ∝ 1/n_{g_i}, giving every parent the same total loss mass. Turning this off raises MAE from 0.7164 to 0.7380, a deterioration of 0.0216. The reason is practical: the top 30 parents hold 56.6% of records, so row-equal training favours familiar parents, whereas we need accuracy averaged over 128 unseen parents. The ablation also shows parent weighting is not specific to the blend; it matters for the physics branch too.

> **关键数字**　0.7164 → 0.7380（+0.0216）；q=1。

> **可能追问**　追问“为什么不 q=2”：q=2 会让只有一两条记录的母体权重过大，方差反而升高；q=1 是我们验证过的平衡点。

### Q21　部署时 γ=0，SOLAR-H 不就等于结构基线了吗，为什么还保留？

*With γ = 0 at deployment, is SOLAR-H not just the structural baseline? Why keep it?*

*主答 Chunsheng Yu　·　报告 §7.2；§4.5　·　证据 报告 §7.2；models/manifest.json*

**中文回答（30 秒）**

是，部署配置下温度项被完全收缩，输出等于温度校正后的结构基线，所以它的预测分数和“纯基线”接近。保留它有三个理由：第一，它是唯一能给出“固定组合温度导数 γ·u_c^Tβ/s_T”的白盒分支；第二，γ=0 这个结果本身是科学结论——在新母体外推上，温度斜率不可靠，应该收缩；第三，它给融合模型和因果分析提供了可对照的物理参照。所以我们把它定位为“可解释分支”，不是最终预测器。

**English answer（30 s）**

Yes: at deployment the temperature term is fully shrunk, so the output equals the temperature-corrected structural baseline and its score is close to a pure baseline. We keep it for three reasons. It is the only white-box branch that gives a fixed-combination derivative γ·u_c^Tβ/s_T; the γ = 0 result is itself a finding — temperature slopes do not extrapolate reliably to unseen parents and should be shrunk; and it provides a physical reference for the blend and the causal analysis. We present it as an interpretable branch, not the final predictor.

> **关键数字**　部署 γ=0；导数 γ·u_c^Tβ/s_T；非零 γ 时 β 可解释。

> **可能追问**　追问“那它还有预测价值吗”：有，0.7164 明显优于基础 ET 0.7469；只是不如融合模型。

### Q22　白盒性具体体现在哪，β 能读出什么？

*What exactly is white-box here, and what can β tell us?*

*主答 Chunsheng Yu　·　报告 §7.2　·　证据 报告 §7.2；output/analysis/*

**中文回答（30 秒）**

对固定组合 c，温度导数是常数：dŷ/dT=γ·u_c^Tβ/s_T。这意味着我们可以直接读出“这个体系升温 1 °C 预测变化多少”，不用靠 SHAP 近似。β 的符号和大小反映结构调制：非零 γ 时，分子量差异、极性失配会通过 u_c 改变吸热斜率的方向和幅度。需要强调，这个解释只在“同一组合内”成立；跨母体比较要重新做组内变换。

**English answer（30 s）**

For a fixed combination c the temperature derivative is constant: dŷ/dT = γ·u_c^Tβ/s_T. We can read directly how much the prediction changes per °C for that system, without a SHAP approximation. The sign and magnitude of β reflect structural modulation: with non-zero γ, molecular-weight differences and polarity mismatch change the direction and size of the endothermic slope through u_c. This interpretation holds only within a combination; cross-parent comparisons require a new within-group transformation.

> **关键数字**　dŷ/dT = γ·u_c^Tβ/s_T；γ=0 时导数为 0。

> **可能追问**　追问“β 的某个系数为正说明什么”：说明该结构维度让升温带来的溶解度增加更大；但这是条件关联，不是普适机理。

### Q23　SOLAR-H 0.7164，为什么不用它做最终模型？

*SOLAR-H scores 0.7164; why not use it as the final model?*

*主答 Chunsheng Yu　·　报告 §6.2；§9　·　证据 报告表 4；README*

**中文回答（30 秒）**

因为最终目标是预测精度，而融合模型是 0.6668，比它低 0.0496。SOLAR-H 的定位是“可解释、可消融的物理参照”，它证明了温度项需要自适应收缩、母体加权必要、结构基线是主要承载者；这些结论反过来指导了融合模型的设计。硬把它当最终模型，会为了解释性牺牲 7% 左右的误差，而我们的部署场景需要的是尽量准的初筛排序。

**English answer（30 s）**

Because the final target is predictive accuracy, and the blend reaches 0.6668, lower by 0.0496. SOLAR-H is positioned as an interpretable, ablatable physical reference: it shows that the temperature term needs adaptive shrinkage, that parent weighting is necessary, and that the structural baseline carries most of the signal. Those findings guided the blend design. Making it the final model would sacrifice roughly 7% of the error for interpretability, while our deployment needs the most accurate possible screening ranking.

> **关键数字**　0.7164 vs 0.6668；差 0.0496。

> **可能追问**　追问“那为什么不把 SOLAR-H 和融合模型再融一次”：试过增加分支，三支和五支都更差；SOLAR-H 与树分支误差高度相关，加权只会引入噪声。

# 3　特征、ExtraTrees 与融合

*Features, ExtraTrees and the blend: how 869 dimensions, parent weighting and TabPFN are put together*

### Q24　为什么选 ExtraTrees，而不是随机森林或 GBDT？

*Why ExtraTrees rather than random forest or gradient boosting?*

*主答 Yaorong Huang　·　报告 §5.1–5.2；§6.2　·　证据 README；附录 B*

**中文回答（30 秒）**

三个原因。第一，ExtraTrees 的分裂阈值是随机抽的，方差比 RF 更低，在我们这种 128 个母体、1507 条的小样本外推任务上更稳。第二，它的叶节点可以精确加样本权重，母体等权能直接进分裂准则，RF 和 GBDT 要做同样的加权更别扭。第三，它的轴对齐分段与 TabPFN 的连续注意力机制误差互补——两者残差符号 15.0% 不一致，这是融合仍有增益的一个证据。要诚实说：RF 单支 0.6815，比 Rich ET 0.6831 还低 0.0016，所以我们不能说 ET 是唯一最强单支；我们没跑 RF+TabPFN 融合，这是未做的对照。

**English answer（30 s）**

Three reasons. ExtraTrees draws split thresholds at random, so its variance is lower than random forest and it is more stable in a small-sample extrapolation task with 128 parents and 1,507 rows. Its leaves accept exact sample weights, so parent-equal weighting enters the splitting criterion directly; doing the same in RF or GBDT is clumsier. Its axis-aligned piecewise fits are complementary to TabPFN's continuous attention — the two disagree in residual sign 15.0% of the time, one reason the blend still helps. To be honest: RF alone scores 0.6815, 0.0016 lower than the 0.6831 Rich ET, so we cannot claim ET is the single best branch; we did not run an RF + TabPFN blend, and that is an untested control.

> **关键数字**　RF 0.6815；Rich ET 0.6831；CatBoost 0.6931；残差符号不一致 15.0%。

> **可能追问**　追问“那为什么不是 RF”：RF 的 bootstrap 加随机特征子集方差更大，且加权叶实现不如 ET 直接；但差距只有 0.0016，属于噪声量级，我们不硬说 ET 显著更好。

### Q25　869 维特征具体怎么来的？

*Where do the 869 features come from?*

*主答 Yaorong Huang　·　报告 §5.3　·　证据 报告 §5.3；表 2；output/analysis/*

**中文回答（30 秒）**

药物 217 个 RDKit 描述符，溶剂 217 个，温度 1 个，再加两组显式交互：217 维 Hadamard 积和 217 维绝对差，合计 869。乘积和绝对差是“相似相溶”的直接编码：极性匹配、氢键给受体匹配，靠这两个块显式写进特征，而不是等树自己去学。朴素拼接只有 435 维，交互块是后面消融里真正带来增益的部分。

**English answer（30 s）**

There are 217 RDKit descriptors for the drug, 217 for the solvent, one temperature column, and two explicit interaction blocks: 217 Hadamard products and 217 absolute differences, giving 869. Products and absolute differences encode like-dissolves-like directly: polarity matching and hydrogen-bond donor–acceptor matching are written into the features instead of being left for the tree to discover. Naive concatenation has only 435 dimensions; the interaction blocks are what the ablation shows to be valuable.

> **关键数字**　217 + 217 + 1 + 217 + 217 = 869；朴素拼接 435。

> **可能追问**　追问“为什么不用指纹”：指纹也试过多视角核岭（0.7277），在这个数据规模上不如描述符交互稳；指纹稀疏、可解释性差。

### Q26　1086 维怎么变成 665 维，为什么必须折内做？

*How do 1,086 dimensions become 665, and why must this happen inside the fold?*

*主答 Yaorong Huang　·　报告 §5.3　·　证据 报告 §5.3；output/analysis/*

**中文回答（30 秒）**

在 869 维之外再加 217 个母体骨架描述符，得到 1086 维候选。折内先做中位数插补处理非有限值，再去掉零方差和近零方差列，保留 665 维。关键是全部在训练折内拟合：如果用全量数据算中位数或方差，测试折的分布信息会漏进特征处理，外层评估就不再干净。这也是嵌套交叉验证存在的原因。

**English answer（30 s）**

We add 217 parent-scaffold descriptors to the 869, giving 1,086 candidates. Inside each training fold we median-impute non-finite values, then drop zero-variance and near-zero-variance columns, retaining 665. Crucially, all of this is fitted inside the training fold: computing medians or variances on the full data would leak test-fold distribution information into preprocessing and contaminate the outer estimate. That is exactly why the nested protocol exists.

> **关键数字**　1086 → 665；插补与方差过滤只在训练折内。

> **可能追问**　追问“665 是固定的吗”：报告口径是筛选后保留 665 维；不同折的方差过滤可能略有差异，但流程一致。

### Q27　交互特征的消融结果是什么？

*What does the interaction-feature ablation show?*

*主答 Yaorong Huang　·　报告 §5.7；表 2　·　证据 报告表 2；图 3*

**中文回答（30 秒）**

同样用外层五折、三种子，只改特征。435 维朴素拼接：行等权 0.7112，母体等权 0.6853；869 维加交互：行等权 0.6985，母体等权 0.6760。也就是说，交互块本身带来约 0.0127（行）到 0.0093（母体）的改善；再叠加母体权重，从 0.6985 降到 0.6760，改善 0.0225。两个机制是叠加的，不是互相替代。

**English answer（30 s）**

With the same outer five folds and three seeds, changing only the features: 435-dimensional naive concatenation gives 0.7112 row-wise and 0.6853 parent-weighted; 869 dimensions with interactions gives 0.6985 and 0.6760. The interaction block alone improves by about 0.0127 row-wise and 0.0093 parent-weighted; adding parent weighting then takes 0.6985 to 0.6760, a further 0.0225. The two mechanisms stack rather than substitute for each other.

> **关键数字**　435：0.7112 / 0.6853；869：0.6985 / 0.6760。

> **可能追问**　追问“交互项是不是过拟合”：869 维确实高，但树的分裂是随机的、有正则；消融显示测试折上更好，不是训练集好看。

### Q28　母体权重怎么进到树里，为什么有效？

*How does parent weighting enter the trees, and why does it work?*

*主答 Yaorong Huang　·　报告 §5.4；§3.5.2　·　证据 报告 §5.4；output/evidence/*

**中文回答（30 秒）**

每条样本权重 w_i∝1/n_{g_i}，同一母体的记录权重之和为常数。叶节点预测变成加权均值，分裂准则用加权不纯度下降：权重大的母体对“这块区域纯不纯”影响更大。效果是从 0.6985 降到 0.6760。直观解释是：行等权时，头部母体的几百条记录会把叶均值拉向自己；母体等权后，只有一个记录的稀有母体也有发言权，模型被迫学可迁移的结构规律，而不是记头部。

**English answer（30 s）**

Each record gets weight w_i ∝ 1/n_{g_i}, so every parent contributes the same total weight. Leaf predictions become weighted means, and splits use weighted impurity decrease: high-weight parents matter more when deciding whether a region is pure. The effect is 0.6985 → 0.6760. Intuitively, with row-equal weights the hundreds of records from head parents pull leaf means toward themselves; with parent-equal weights, a rare parent with one record still has a voice, forcing the model to learn transferable structure rather than memorise the head.

> **关键数字**　w_i ∝ 1/n_{g_i}；0.6985 → 0.6760（−0.0225）。

> **可能追问**　追问“会不会让噪声大的小母体影响过大”：会有一点，但小母体方差高，加权后仍被树的正则和集成平均压住；q=1 比 q=2 稳。

### Q29　ExtraTrees 的超参怎么定的？

*How were the ExtraTrees hyperparameters chosen?*

*主答 Yaorong Huang　·　报告 §5.4；表 3　·　证据 报告表 3；output/analysis/*

**中文回答（30 秒）**

在内层三折里做小网格搜索，按母体加权 MAE 选。最终配置是 300 棵树、每次分裂随机考察 70% 的特征（feature ratio 0.7）、叶节点最少 2 条、不限制深度。基础 ET 对照是 200 棵树、最小叶 1。我们没有用贝叶斯调参或大规模搜索，因为在 128 个母体的外层协议下，搜索空间越大越过拟合内层；固定一个适度空间，反而让比较更干净。

**English answer（30 s）**

We run a small grid inside the three-fold inner loop and select by parent-weighted MAE. The final configuration is 300 trees, a feature ratio of 0.7, a minimum leaf size of 2, and no depth limit. The base ExtraTrees control uses 200 trees and a minimum leaf of 1. We did not use Bayesian optimisation or a large search: under the 128-parent outer protocol, a larger space overfits the inner folds, and a modest fixed space keeps the comparison clean.

> **关键数字**　300 树 / 0.7 / min_leaf 2 / 无深度限制；基础 200 / min_leaf 1。

> **可能追问**　追问“为什么 min_leaf 从 1 提到 2”：1 容易记住单条记录，2 稍微平滑；这是内层选出来的，不是拍脑袋。

### Q30　TabPFN v2 是什么，用它算不算“调包”？

*What is TabPFN v2, and is using it just calling a package?*

*主答 Yaorong Huang　·　报告 §5.5　·　证据 报告 §5.5；README*

**中文回答（30 秒）**

TabPFN v2 是在大量合成表格任务上预训练的 Transformer，做预测时把训练集当上下文一次性输入，通过注意力做“上下文学习”，输出后验均值；它不在我们的数据上训练，也不微调。说“调包”不公平：我们做了三件事——把它作为异构分支，验证它与树的误差互补；用折外凸组合决定权重；把它放进统一的母体分组协议里和 12 个基线同台比较。模型是现成的，但“怎么用、何时有用、和谁互补”是我们的工作。

**English answer（30 s）**

TabPFN v2 is a Transformer pretrained on many synthetic tabular tasks. At prediction time it takes the training set as context, performs in-context learning through attention, and returns a posterior mean; it is neither trained nor fine-tuned on our data. Calling it “just a package” is unfair: we use it as a heterogeneous branch, show that its errors are complementary to the tree's, decide its weight by out-of-fold convex blending, and compare it against twelve baselines under one parent-grouped protocol. The model is off-the-shelf; how to use it, when it helps, and what it complements is our work.

> **关键数字**　TabPFN 单支 0.6827；冻结参数；全训练上下文。

> **可能追问**　追问“预训练数据里有没有我们的数据”：TabPFN 的预训练语料是合成的，不含本课程数据；我们也没有用它做任何监督微调。

### Q31　TabPFN 分支具体怎么训练和推理？

*How exactly is the TabPFN branch trained and used?*

*主答 Yaorong Huang　·　报告 §5.5；§6.2　·　证据 报告 §5.5；models/manifest.json*

**中文回答（30 秒）**

训练阶段没有梯度更新：每个外层训练折把全部 1507 条（或该折的 1256 条）作为上下文，标签是标准化后的 logS；推理时对新样本做一次前向，得到后验均值。我们没有调它的内部超参，也没有 early stopping。代价是上下文越长越慢，所以系统里它和 ET 并行跑；收益是它提供了一种与轴对齐树完全不同的归纳偏置——连续空间里的度量式匹配。

**English answer（30 s）**

There is no gradient update: each outer training fold passes all 1,507 records (or the fold's 1,256) as context, with standardised logS as labels; inference is a single forward pass returning the posterior mean. We did not tune its internal hyperparameters or use early stopping. The cost is that longer context is slower, so the system runs it in parallel with ExtraTrees; the benefit is a different inductive bias — metric-like matching in continuous space rather than axis-aligned splits.

> **关键数字**　每折上下文 1256 条；无微调；单次前向。

> **可能追问**　追问“上下文长度上限怎么办”：1507 条在 v2 的能力范围内；再大需要分块或检索式上下文，这是未来工作。

### Q32　折外凸组合具体怎么选 α？

*How is the out-of-fold convex weight α chosen?*

*主答 Yaorong Huang　·　报告 §5.6　·　证据 报告 §5.6；output/evidence/*

**中文回答（30 秒）**

在外层训练集里再做三折内层，得到每条训练样本的折外预测：ET 一支、TabPFN 一支。然后在这个折外预测上做非负、和为 1 的凸组合 ŷ=(1−α)f_ET+αf_PFN，α 在 [0,1] 上网格搜索，目标是母体加权 MAE。选好 α 后，两支分别在外层全量训练集上重拟合，再对真正的外层测试折做预测——测试折从头到尾没参与 α 选择。部署时固定 α=0.25。

**English answer（30 s）**

Inside each outer training set we run a three-fold inner split and obtain out-of-fold predictions from the ET branch and the TabPFN branch. On these predictions we fit a non-negative convex combination ŷ = (1−α)f_ET + αf_PFN, grid-searching α over [0,1] for parent-weighted MAE. The chosen α is then applied after refitting both branches on the full outer training set, and the outer test fold is predicted — it never participated in choosing α. Deployment fixes α = 0.25.

> **关键数字**　α 各折 0.25 / 0.25 / 0 / 0.25 / 0.5；部署 0.25。

> **可能追问**　追问“为什么不用 stacking 元学习器”：样本只有一千多，元学习器容易过拟合；单参数凸组合更稳、更可解释。

### Q33　α 的敏感性如何，0.25 是不是碰巧？

*How sensitive is α, and is 0.25 a lucky choice?*

*主答 Yaorong Huang　·　报告 §6.5　·　证据 报告 §6.5；图 6b*

**中文回答（30 秒）**

不是碰巧。固定折外预测，扫一个全局 α：α=0.25 时 0.6734，α=0.5 时 0.6708，α=0.75 时 0.6732；两端单支分别是 0.6831 和 0.6827。也就是说 [0.25, 0.75] 是一个平坦的低谷，融合增益不依赖某个脆弱最优点。各折自适应选出来的 α 是 0.25/0.25/0/0.25/0.5，部署取 0.25，落在这个平台内。

**English answer（30 s）**

No. Fixing the out-of-fold predictions and sweeping a global α: 0.6734 at α = 0.25, 0.6708 at 0.5, 0.6732 at 0.75; the two single-branch endpoints are 0.6831 and 0.6827. So [0.25, 0.75] is a flat basin, and the gain does not depend on a brittle optimum. The per-fold adaptive weights are 0.25, 0.25, 0, 0.25 and 0.5; deployment uses 0.25, which lies inside this plateau.

> **关键数字**　0.6734 / 0.6708 / 0.6732；端点 0.6831 / 0.6827。

> **可能追问**　追问“有一折 α=0 说明什么”：说明那一折 TabPFN 没帮上忙；自适应选择允许它退出，比强制固定权重更稳。

### Q34　为什么三支、五支反而更差？

*Why do the three- and five-branch blends perform worse?*

*主答 Yaorong Huang　·　报告 §6.6；表 4　·　证据 报告表 4；README*

**中文回答（30 秒）**

三支是 ET+CatBoost+TabPFN，0.6729；五支全上，0.6767；都不如两支的 0.6668。原因有三：CatBoost 单支 0.6931，本身比 ET/TabPFN 弱，加进来要给它权重，等于用差模型稀释好模型；三支权重在 1256 条折外样本上估计，方差比单参数大；而且 CatBoost 与 ET 都是树，误差相关，互补性不如 ET 与 TabPFN。集成不是越多越好，关键看误差是否独立。

**English answer（30 s）**

The three-branch blend (ET + CatBoost + TabPFN) scores 0.6729; the five-branch blend scores 0.6767; both trail the two-branch 0.6668. Three reasons: CatBoost alone is 0.6931, weaker than ET or TabPFN, so giving it weight dilutes the strong models; the three weights are estimated on 1,256 out-of-fold rows, so their variance is higher than a single parameter; and CatBoost and ET are both trees with correlated errors, so their complementarity is lower than ET versus TabPFN. More ensemble members is not automatically better; error independence is what matters.

> **关键数字**　0.6729 / 0.6767 vs 0.6668；CatBoost 0.6931。

> **可能追问**　追问“那为什么还跑三支五支”：为了证明“两支最优”不是没试过；消融的意义就是把否定的选项也摆出来。

### Q35　融合的增益到底来自哪几步？

*Where exactly does the gain come from?*

*主答 Yaorong Huang　·　报告 §6.3；§5.7　·　证据 报告 §6.3；表 2、4*

**中文回答（30 秒）**

可以拆成三段，正好加总 0.0801。第一步，23 维基础特征换到 869 维交互特征，行等权 MAE 从 0.7469 降到 0.6985，贡献 0.0484；第二步，母体等权把 0.6985 压到 0.6760，贡献 0.0225；第三步，加入 TabPFN 分支并做折外凸组合，从 0.6760 到 0.6668，贡献 0.0092。三段相加 0.0801，和主模型的 10.73% 对得上。

**English answer（30 s）**

It splits into three stages that sum to 0.0801. First, moving from 23 base features to 869 interaction features takes row-equal MAE from 0.7469 to 0.6985, contributing 0.0484. Second, parent-equal weighting takes 0.6985 to 0.6760, contributing 0.0225. Third, adding the TabPFN branch through the out-of-fold convex blend takes 0.6760 to 0.6668, contributing 0.0092. The three add to 0.0801, matching the 10.73% headline.

> **关键数字**　0.0484 + 0.0225 + 0.0092 = 0.0801。

> **可能追问**　追问“哪一步最重要”：特征交互最大，母体加权次之，融合最小但它是把前两步的收益锁住的一步。

### Q36　融合相对 Rich ET 或 TabPFN 显著吗？

*Is the blend significantly better than Rich ET or TabPFN?*

*主答 Yaorong Huang　·　报告 §6.2；图 6a　·　证据 presentation/index.html:180；output/evidence/*

**中文回答（30 秒）**

必须分开说。对基础 ET，Δ=−0.0801，95% CI [−0.1366, −0.0276]，显著。对 Rich ET（0.6831）和 TabPFN（0.6827），点估计更好（对 Rich ET 胜 61/128 个母体），但配对 bootstrap 区间跨零，所以不能说“显著优于强单支”。我们的准确表述是：四项指标点估计第一，对基础树显著，对强单支是方向一致但不显著。这个区分很重要，不能把“第一”说成“全面显著”。

**English answer（30 s）**

They must be separated. Against base ExtraTrees, Δ = −0.0801 with 95% CI [−0.1366, −0.0276], significant. Against Rich ET (0.6831) and TabPFN (0.6827), the point estimate is better — the blend wins 61 of 128 parents against Rich ET — but the paired bootstrap intervals cross zero, so we cannot claim significance against the strong single branches. The accurate statement is: first on all four point estimates, significant against the base tree, directionally better but not significant against the strong branches.

> **关键数字**　对基础 ET：−0.0801，CI [−0.1366, −0.0276]；对强单支：区间跨零。

> **可能追问**　追问“那融合的意义是什么”：它把两个 0.68 量级的单支稳定压到 0.6668，且在 α 平台上稳健；显著性不足是因为 128 个母体的检验力有限，不是方向反了。

### Q37　怎么保证没有泄漏、结果可复现？

*How do you ensure there is no leakage and the results are reproducible?*

*主答 Yaorong Huang　·　报告 §3.5；§6.1　·　证据 datasets/splits/；models/manifest.json*

**中文回答（30 秒）**

四条。第一，划分按 ChargeParent 后的母体分组，同一母体的盐型、电荷态不会跨折。第二，所有使用标签的步骤——插补、方差过滤、超参、γ、α——都封在内层三折，外层测试折只在最后预测一次。第三，固定种子 2026/17/42，报告三种子平均，避免单次抽签。第四，模型清单、特征列表、划分文件都写进 manifest，系统部署时按同一清单加载。需要承认：我们没有做独立的第三方复现，也没有把 33 母体盲测跑完。

**English answer（30 s）**

Four controls. First, splits are grouped by the post-ChargeParent parent, so salt forms and charge states of the same parent cannot cross folds. Second, every label-using step — imputation, variance filtering, hyperparameters, γ, α — is sealed inside the three inner folds, and the outer test fold is predicted once at the end. Third, seeds 2026, 17 and 42 are fixed and the three-seed mean is reported, avoiding a single draw. Fourth, the model manifest, feature list and split files are recorded, and deployment loads from the same manifest. We should acknowledge: we did not run an independent third-party reproduction, nor did we complete the 33-parent blind test.

> **关键数字**　5 外层 × 3 内层 × 3 种子；所有拟合步骤折内；manifest 固定。

> **可能追问**　追问“如果评委现场要复现”：给仓库、环境文件、manifest 和种子；说明一次完整外层 CV 的算力成本，不承诺现场跑完。

# 4　结果、误差与稳健性

*Results, error structure and robustness: what the numbers do and do not support*

### Q38　主结果怎么读？

*How should the main result be read?*

*主答 Chunsheng Yu　·　报告 §6.2；表 4　·　证据 报告表 4；output/evidence/*

**中文回答（30 秒）**

在 128 个未见母体、1507 条开发记录上，融合模型的四项指标是：母体加权 MAE 0.6668、逐行 MAE 0.6510、RMSE 0.8842、R² 0.5234，全部是点估计第一。第二好的是三支 0.6729，强单支 Rich ET 0.6831、TabPFN 0.6827，基础 ET 0.7469。读法是：相对基础树降 0.0801（10.73%），相对强单支只领先 0.016 左右，且不显著。四项第一不等于全面碾压，要按比较对象分开说。

**English answer（30 s）**

On 128 unseen parents and 1,507 development records, the blend scores 0.6668 parent-weighted MAE, 0.6510 row-wise MAE, 0.8842 RMSE and 0.5234 R², first on all four point estimates. The next best is the three-branch blend at 0.6729; the strong single branches are Rich ET at 0.6831 and TabPFN at 0.6827; base ET is 0.7469. The reading: 0.0801 (10.73%) better than the base tree, only about 0.016 ahead of the strong single branches, and not significant there. First on four metrics is not universal dominance; separate the comparisons.

> **关键数字**　0.6668 / 0.6510 / 0.8842 / 0.5234；基础 ET 0.7469。

> **可能追问**　追问“0.016 的领先有意义吗”：点估计有意义，统计上不显著；在 128 个母体的检验力下，这个差距需要更多母体才能分辨。

### Q39　到底是 8.54% 还是 10.73%？

*Is the improvement 8.54% or 10.73%?*

*主答 Chunsheng Yu　·　报告 §1.4；§6.2；演示第 12 页　·　证据 presentation/index.html:180,188*

**中文回答（30 秒）**

这是报告里的一处口径错误，必须当面说清。8.54% 是“特征丰富 ET 相对基础 ET”的阶段降幅：0.7469→0.6831，Δ=0.0638，配对 95% CI [−0.1219, −0.0082]。10.73% 是“最终融合模型相对基础 ET”：0.7469→0.6668，Δ=0.0801，CI [−0.1366, −0.0276]。报告摘要和 §6.2 把 8.54% 挂在了融合模型上，这是错的。答辩以 10.73% 为主；如果评委拿报告追问，先承认这是两个阶段，再把两组数字和区间分别给全。

**English answer（30 s）**

This is a wording error in the report and should be stated plainly. 8.54% is the stage gain of the feature-rich ET over the base ET: 0.7469 → 0.6831, Δ = 0.0638, paired 95% CI [−0.1219, −0.0082]. 10.73% is the final blend over the base ET: 0.7469 → 0.6668, Δ = 0.0801, CI [−0.1366, −0.0276]. The abstract and §6.2 attach 8.54% to the blend, which is wrong. In the defence, lead with 10.73%; if a examiner follows the report, acknowledge the two stages and give both sets of numbers and intervals separately.

> **关键数字**　8.54%：0.0638，CI [−0.1219, −0.0082]；10.73%：0.0801，CI [−0.1366, −0.0276]。

> **可能追问**　追问“为什么报告会写错”：早期版本用 Rich ET 作为主模型，后来融合模型胜出，摘要数字没同步；这是版本管理问题，不是结果造假。

### Q40　分层误差说明了什么，最差的那一档有多差？

*What does the stratified error show, and how bad is the worst band?*

*主答 Chunsheng Yu　·　报告 §6.4；表 5　·　证据 报告表 5；output/evidence/*

**中文回答（30 秒）**

按实测溶解度分四档。极端带 y≤−4：只有 23 条、8 个母体，融合 MAE 2.251，SOLAR-H 2.413，两个模型都系统性高估——蔗糖/氯仿 25 °C 实测 −6.234，预测平均 −2.536，差了 3.7 个 log。低带 0.874，中带 0.465（占 54.7% 的记录，是主战场），高带 0.782。结论是：模型在“中等可溶”范围内可用，在“几乎不溶”的悬崖边上不可靠，原因是 2D 描述符看不到晶格能。

**English answer（30 s）**

Four bands by measured solubility. The extreme band y ≤ −4 has only 23 records over 8 parents; the blend's MAE is 2.251 and SOLAR-H's 2.413, and both systematically overestimate — sucrose in chloroform at 25 °C measures −6.234 while the model predicts −2.536 on average, a 3.7-log gap. The low band is 0.874, the moderate band 0.465 (54.7% of records, the main battleground), and the high band 0.782. The model is usable in the moderately soluble range and unreliable at the insoluble cliff, because 2D descriptors cannot see lattice energy.

> **关键数字**　极端 2.251（23 条/8 母体）；中带 0.465（824 条/110 母体）；蔗糖 −6.234 vs −2.536。

> **可能追问**　追问“为什么中带只有 0.465 而整体 0.6668”：整体被极端带和低带拉高；中带是模型真正能服务的区间。

### Q41　R²=0.5234 算不算低？

*Is R² = 0.5234 low?*

*主答 Chunsheng Yu　·　报告 §6.2；表 4　·　证据 报告表 4；output/evidence/*

**中文回答（30 秒）**

看和谁比、在什么协议下比。在我们的“未见母体”外推协议下，基础 ET 只有 0.4229，融合模型 0.5234，提升 0.10；文献里常见的 0.7–0.9 多来自随机划分或同分布测试，同一母体的记录同时进训练和测试，难度完全不同，不能直接比。0.5234 的含义是：模型解释了约一半的方差，剩下的是晶格能、多晶型、测量噪声和未见组合，这些不是靠调参能消掉的。

**English answer（30 s）**

It depends on the comparison and the protocol. Under our unseen-parent extrapolation protocol, base ET is 0.4229 and the blend is 0.5234, a gain of 0.10; the 0.7–0.9 often seen in the literature mostly comes from random or in-distribution splits, where records of the same parent sit in both training and test, a fundamentally easier task. R² = 0.5234 means about half the variance is explained; the rest is lattice energy, polymorphism, measurement noise and unseen combinations, which tuning cannot remove.

> **关键数字**　0.5234 vs 0.4229；提升 0.1005。

> **可能追问**　追问“能不能把 R² 做高”：换随机划分立刻会高，但那不是我们的问题；在外推协议下，0.52 是中等且诚实的水平。

### Q42　换种子结果会变吗？

*Does the result change across seeds?*

*主答 Chunsheng Yu　·　报告 §6.5　·　证据 报告 §6.5；output/analysis/*

**中文回答（30 秒）**

三种子 17、42、2026 的母体加权 MAE 分别是 0.6635、0.6679、0.6690，均值 0.6668，极差 0.0055。这个波动远小于相对基础树的 0.0801，也小于相对强单支的 0.016，说明结论不是某次抽签抽出来的。要强调：极差不是置信区间，它只描述种子带来的训练随机性；统计不确定性看配对 bootstrap 的区间。

**English answer（30 s）**

The parent-weighted MAEs for seeds 17, 42 and 2026 are 0.6635, 0.6679 and 0.6690, mean 0.6668, a spread of 0.0055. That is much smaller than the 0.0801 gain over the base tree and smaller than the 0.016 lead over the strong branches, so the conclusion is not a lucky draw. Note that the spread is not a confidence interval; it only describes training randomness. Statistical uncertainty is the paired bootstrap interval.

> **关键数字**　0.6635 / 0.6679 / 0.6690；极差 0.0055。

> **可能追问**　追问“为什么种子 2026 反而最差”：随机性没有方向性；三个种子都在 0.67 以下，排序变化在噪声内。

### Q43　每个母体的误差分布如何？

*What does the per-parent error distribution look like?*

*主答 Chunsheng Yu　·　报告 §6.4　·　证据 报告 §6.4；output/evidence/*

**中文回答（30 秒）**

128 个母体的逐母体 MAE 中位数：融合 0.544，SOLAR-H 0.599。胜率：融合在 77/128 个母体上优于 SOLAR-H，在 61/128 个母体上优于 Rich ET。也就是说它多数时候更好，但不是每个母体都赢；有约一半的母体对 Rich ET 打平或更差，这正是区间跨零的原因。中位数比均值低，说明分布右偏——少数极端母体拉高了平均误差。

**English answer（30 s）**

Over the 128 parents, the median per-parent MAE is 0.544 for the blend and 0.599 for SOLAR-H. The blend wins on 77 of 128 parents against SOLAR-H and 61 of 128 against Rich ET. So it is better most of the time but not everywhere; on roughly half the parents it ties or loses to Rich ET, which is exactly why the interval crosses zero. The median is below the mean, so the distribution is right-skewed: a few extreme parents pull the average up.

> **关键数字**　中位 0.544 vs 0.599；胜率 77/128、61/128。

> **可能追问**　追问“输的那 67 个母体是什么样”：多是极端难溶或数据稀少的母体；我们没有逐个归因，这是可补的分析。

### Q44　33 个留出母体的结果呢？

*What about the 33 held-out parents?*

*主答 Chunsheng Yu　·　报告 §3.5.1　·　证据 报告 §3.5.1；datasets/splits/*

**中文回答（30 秒）**

没有报告，这是我们的空白，不回避。161 个母体里 33 个、397 条是完全独立的盲测库，没有参与调参；主表所有数字都来自 128 个开发母体的外层交叉验证。仓库里确实有 8 个基础模型在这 397 条上的记录（例如 ET_base 0.7240、TabM 0.7040），但那是基础模型的留出成绩，不能拿来当融合模型的盲测结果。正确的下一步是：冻结融合流程，在 33 母体上一次性跑完，再报告。

**English answer（30 s）**

It is not reported, and that is a gap we do not hide. Of the 161 parents, 33 (397 records) form a fully independent blind library that was not used for tuning; every main-table number comes from outer cross-validation over the 128 development parents. The repository does contain records for eight base models on those 397 rows (for example ET_base 0.7240, TabM 0.7040), but those are base-model holdout scores, not a blind test of the blend. The correct next step is to freeze the blend pipeline, run it once on the 33 parents, and report that.

> **关键数字**　33 / 397；ET_base 0.7240；主表仅 128。

> **可能追问**　追问“为什么不现在跑”：需要冻结全部预处理、特征筛选和权重，按同一 manifest 一次性执行；仓促跑一个未复核的数字，比诚实说没跑更危险。

### Q45　主要误差来源有哪些？

*What are the main sources of error?*

*主答 Chunsheng Yu　·　报告 §6.4；§9　·　证据 报告 §6.4、§9；output/evidence/*

**中文回答（30 秒）**

四类。第一，固相效应：2D 拓扑描述符没有晶格能、熔点、多晶型信息，这是极端带高估 3.7 个 log 的主因。第二，测量噪声：86 组 205 条同条件冲突记录，占约 10.8%，构成不可约误差。第三，数据稀疏：646/8232 个组合，很多药物—溶剂对完全没数据，模型只能靠描述符外推。第四，分布偏移：新母体的骨架、分子量、极性可能落在训练分布之外，适用域预警只能提示、不能修正。

**English answer（30 s）**

Four sources. First, solid-state effects: 2D topological descriptors carry no lattice energy, melting point or polymorph information, which is the main reason the extreme band overestimates by 3.7 log units. Second, measurement noise: 86 groups and 205 records conflict under identical conditions, about 10.8% of the data, an irreducible error floor. Third, sparsity: only 646 of 8,232 possible pairs are measured, so many drug–solvent pairs rely entirely on descriptor extrapolation. Fourth, distribution shift: a new parent's scaffold, size or polarity may fall outside the training distribution, and the applicability-domain warning can flag this but not correct it.

> **关键数字**　86 组 / 205 条；646 / 8232；极端带差 3.7 log。

> **可能追问**　追问“哪类误差最致命”：固相效应，因为它系统性偏高且无法靠更多同类数据消除，需要熔点或 3D 信息。

### Q46　和文献里的溶解度模型怎么比？

*How does this compare with published solubility models?*

*主答 Chunsheng Yu　·　报告 §2；§9　·　证据 报告 §2；参考文献*

**中文回答（30 秒）**

不能直接比数字。文献里的 ESOL、FastSolv、图神经网络等，多数在自己的数据集、随机划分或同分布测试上报告 R² 或 RMSE；我们的协议是母体分组、未见母体外推，而且标签是 49 种溶剂、宽温度范围的条件溶解度，不是水溶解度。硬把 0.6668 和文献的 RMSE 比，是拿两种任务比。能比的是机制：我们复现了“树集成在中小规模表格数据上仍然很强”这个结论，并额外证明了显式交互和母体加权在外推设定下的价值。

**English answer（30 s）**

The numbers are not directly comparable. Published models such as ESOL, FastSolv or graph networks mostly report R² or RMSE on their own datasets under random or in-distribution splits; our protocol is parent-grouped, unseen-parent extrapolation, and the label is conditional solubility across 49 solvents and a wide temperature range, not aqueous solubility. Comparing 0.6668 directly with a literature RMSE compares two different tasks. What is comparable is the mechanism: we reproduce the finding that tree ensembles remain strong on small and medium tabular data, and add evidence that explicit interactions and parent weighting matter under extrapolation.

> **关键数字**　任务不同：条件溶解度 / 49 溶剂 / 未见母体 vs 水溶解度 / 随机划分。

> **可能追问**　追问“那你们怎么证明方法好”：靠同一协议下的 13 个基线对照和消融，不靠跨论文数字。

# 5　可解释性与温度因果

*Interpretability and the temperature effect: attribution is not causation*

### Q47　为什么用 TreeSHAP，具体怎么算？

*Why TreeSHAP, and how is it computed?*

*主答 Yaorong Huang　·　报告 §7.1；§7.3.1　·　证据 报告 §7.3；output/figures/*

**中文回答（30 秒）**

TreeSHAP 对树集成是精确算法，满足局部准确性：每个样本的各特征归因之和等于预测值减背景期望。我们从 128 个开发母体里均匀抽 227 条解释样本，覆盖化学空间；在 665 维上算，然后把特征归到四组，再在母体内汇总、对 128 个母体等权，避免头部母体主导。重构偏差小于 1.3×10⁻⁸，背景期望是 −1.1632，说明实现是对的。

**English answer（30 s）**

TreeSHAP is exact for tree ensembles and satisfies local accuracy: for each sample, the attributions sum to the prediction minus the background expectation. We draw 227 explanation samples evenly across the 128 development parents to cover chemical space, compute on the 665 retained features, group them into four blocks, aggregate within parent, and average equally over the 128 parents so head parents do not dominate. The reconstruction bias is below 1.3×10⁻⁸ and the background expectation is −1.1632, confirming a correct implementation.

> **关键数字**　227 样本；665 维；128 母体等权；重构偏差 <1.3e−8；背景 −1.1632。

> **可能追问**　追问“为什么不全部样本都算”：TreeSHAP 成本随样本和树数上升；227 条分层样本已能稳定估计组级归因，报告也做了覆盖说明。

### Q48　四组归因 0.466 / 0.432 / 0.084 / 0.033 怎么读？

*How should the four-group attributions 0.466 / 0.432 / 0.084 / 0.033 be read?*

*主答 Yaorong Huang　·　报告 §7.3.1；图 7a　·　证据 报告 §7.3；output/figures/*

**中文回答（30 秒）**

这是母体等权后的平均绝对归因，不是方差解释比例。药物描述符 0.466 和显式交互 0.432 占主导，合计约 90%；溶剂 0.084，温度 0.033。化学上说得通：药物分子大、晶格能高，是溶解的主要阻力；溶质—溶剂极性匹配和氢键决定能不能克服这个阻力；49 种溶剂结构规则、库小，单独贡献集中；温度只是微调。注意这是“模型怎么用特征”，不是“物理上谁更重要”。

**English answer（30 s）**

These are mean absolute attributions after parent-equal averaging, not shares of explained variance. Drug descriptors at 0.466 and explicit interactions at 0.432 dominate, together about 90%; solvent is 0.084 and temperature 0.033. This is chemically sensible: drug molecules are large with high lattice energy, the main barrier to dissolution; solute–solvent polarity matching and hydrogen bonding decide whether that barrier can be overcome; the 49 solvents are regular and the library is small, so their standalone contribution is concentrated; temperature fine-tunes. This is how the model uses features, not a physical ranking.

> **关键数字**　药物 0.466 / 交互 0.432 / 溶剂 0.084 / 温度 0.033；合计约 90%。

> **可能追问**　追问“温度只有 3.3%，是不是说明温度不重要”：不是。3.3% 是跨数据的平均绝对归因，温度变化幅度小；组内固定效应显示每 °C 有 +0.01538 的稳定斜率。

### Q49　温度归因只有 0.033，和 +0.01538/°C 矛盾吗？

*Temperature attribution is only 0.033; does that contradict +0.01538 per °C?*

*主答 Yaorong Huang　·　报告 §7.3；§7.5　·　证据 报告 §7.3、§7.5；output/analysis/*

**中文回答（30 秒）**

不矛盾，因为两者量的不是一回事。SHAP 的 0.033 是温度这一组在总归因中的占比只有 3.3%；数据里温度跨度有限，而且大部分溶解度差异来自母体和溶剂，所以温度的边际归因小。+0.01538 是“同一组合内部，温度每升 1 °C 的条件平均变化”，是组内斜率。一个回答“预测方差里温度占多少”，一个回答“给定体系升温会怎样”。把 SHAP 当归因、把 FE 当效应，两者可以同时成立。

**English answer（30 s）**

They do not conflict because they measure different things. The 0.033 means the temperature block accounts for only 3.3% of total attribution; temperature spans a limited range and most solubility variation comes from parent and solvent, so its marginal attribution is small. The +0.01538 is the conditional average change per °C inside the same combination, a within-group slope. One answers “how much of the prediction variance is temperature”, the other “what happens when a given system is heated”. SHAP is attribution, FE is an effect, and both can hold.

> **关键数字**　0.033 是归因份额；+0.01538 是组内斜率；口径不同。

> **可能追问**　追问“那评委该信哪个”：看你问什么。问“模型靠什么预测”看 SHAP；问“升温会怎样”看 FE，但要注意它的因果假设。

### Q50　什么是辛普森悖论，你们怎么发现的？

*What is Simpson's paradox here, and how did you find it?*

*主答 Yaorong Huang　·　报告 §7.5.2　·　证据 报告 §7.5.2；图 8*

**中文回答（30 秒）**

把 1118 条记录混在一起做 OLS，温度斜率是 −0.00746：看起来“越热越不溶”，和吸热溶解的物理常识相反。原因是采样：难溶体系更常在高温下测，高温和“难溶母体”绑在一起，合并回归把母体差异误读成温度效应。把每个药物—溶剂组合作为一组、组内去均值后再回归，斜率变成 +0.01538，符号翻转。这就是典型的辛普森悖论：合并趋势和组内趋势方向相反。

**English answer（30 s）**

Pooling all 1,118 records in an OLS gives a temperature slope of −0.00746: hotter looks less soluble, contrary to endothermic dissolution. The cause is sampling: poorly soluble systems are measured more often at high temperature, so high temperature is tied to insoluble parents, and the pooled regression misreads parent differences as a temperature effect. Treating each drug–solvent combination as a group and de-meaning within it flips the slope to +0.01538. That is Simpson's paradox: the pooled trend and the within-group trend point in opposite directions.

> **关键数字**　合并 OLS −0.00746；组内 FE +0.01538；1118 条 / 157 组合 / 73 母体。

> **可能追问**　追问“怎么证明不是反向因果”：温度是实验设定，不是由溶解度决定的；但环境混杂仍可能存在，所以我们做了敏感性分析，而不是宣称无混杂。

### Q51　固定效应模型具体怎么设定？

*How exactly is the fixed-effects model specified?*

*主答 Yaorong Huang　·　报告 §7.5.2–7.5.3　·　证据 报告 §7.5；output/analysis/*

**中文回答（30 秒）**

只保留至少有两个不同温度的完整药物—溶剂组合：157 个组合、73 个母体、1118 条。模型是 y_ct=α_c+β·T_ct+ε_ct，α_c 是组合固定效应，允许每个组合有自己的基线溶解度；β 只用组内温度变化识别。等价做法是组内去均值后跑一个不含截距的回归。标准误按母体聚类，因为同一母体的组合可能相关；再加 2000 次母体聚类 bootstrap 和逐个去掉一个母体的 jackknife。

**English answer（30 s）**

We keep complete drug–solvent combinations with at least two distinct temperatures: 157 combinations, 73 parents, 1,118 records. The model is y_ct = α_c + β·T_ct + ε_ct, where α_c is a combination fixed effect allowing each combination its own baseline solubility; β is identified only from within-combination temperature variation. Equivalently, de-mean within combination and run a regression without an intercept. Standard errors are clustered by parent because combinations of the same parent may correlate; we add a 2,000-draw parent-cluster bootstrap and a leave-one-parent-out jackknife.

> **关键数字**　157 / 73 / 1118；y_ct = α_c + β·T_ct + ε_ct；聚类到母体。

> **可能追问**　追问“为什么不加母体固定效应”：组合固定效应比母体更细，已经吸收了母体差异；再加母体会共线。

### Q52　固定效应的假设是什么，区间为什么用三种方法？

*What are the fixed-effects assumptions, and why three interval methods?*

*主答 Yaorong Huang　·　报告 §7.5.3　·　证据 报告 §7.5.3；output/analysis/*

**中文回答（30 秒）**

核心假设是“组合内没有随温度变化、又同时影响溶解度的未观测混杂”，也就是严格外生性；组合固定效应只能消掉不随时间变的混杂。三种区间是交叉验证：母体聚类稳健区间 [0.0121, 0.0186]、2000 次聚类 bootstrap [0.01236, 0.01902]、jackknife [0.01424, 0.01599]。三者都严格为正，说明斜率不是靠某一个母体或某一种方差估计撑起来的。

**English answer（30 s）**

The key assumption is strict exogeneity: no unobserved confounder that varies with temperature within a combination and also affects solubility. Combination fixed effects only remove time-invariant confounding. The three intervals cross-check each other: parent-clustered robust [0.0121, 0.0186], 2,000-draw cluster bootstrap [0.01236, 0.01902], and leave-one-parent-out jackknife [0.01424, 0.01599]. All are strictly positive, so the slope does not depend on one parent or one variance estimator.

> **关键数字**　[0.0121, 0.0186] / [0.01236, 0.01902] / [0.01424, 0.01599]。

> **可能追问**　追问“jackknife 为什么更窄”：它只反映去掉一个母体的影响，不含抽样方差；三种方法一起看，是为了稳健而不是挑一个最好看的。

### Q53　54% 的敏感性分析怎么解释？

*How should the 54% sensitivity result be interpreted?*

*主答 Yaorong Huang　·　报告 §7.5.4　·　证据 报告 §7.5.4；output/analysis/*

**中文回答（30 秒）**

这是 Cinelli–Hazlett 的遗漏变量偏差框架。结论是：一个未观测混杂要同时解释温度和溶解度各自残差方差的至少 54%，才能把 +0.01538 拉到 0。54% 是很强的共变，超过我们在仪器、操作和批次差异里能合理想象的范围，所以我们认为斜率不太可能被一个未观测变量完全推翻。但它不是“证明无混杂”，只是“要推翻它，需要一个很强的混杂”。

**English answer（30 s）**

This is the Cinelli–Hazlett omitted-variable-bias framework. The result: an unobserved confounder would have to explain at least 54% of the residual variance of both temperature and solubility to drive +0.01538 to zero. That is very strong co-variation, beyond what instrument, protocol and batch differences plausibly produce, so the slope is unlikely to be entirely overturned by one omitted variable. It is not proof of no confounding; it says overturning it would require a strong confounder.

> **关键数字**　54%；同时解释 T 与 Y 的残差方差；不是“因果已证明”。

> **可能追问**　追问“54% 是怎么算的”：用偏 R² 和 OVB 恒等式反解使 β 归零所需的混杂强度；报告给了公式和实现。

### Q54　洛伐他汀–乙酸丁酯的温度曲线说明什么？

*What does the lovastatin–butyl acetate temperature curve show?*

*主答 Yaorong Huang　·　报告 §7.4；图 7b　·　证据 报告 §7.4；README*

**中文回答（30 秒）**

固定这个组合，取 20 个实测温度点，从 5.95 °C 到 50.2 °C 做密集扫描。ET 单支给出阶梯状折线——这是轴对齐分裂的典型形态；融合曲线平滑、单调上升，大约从 −1.59 升到 −1.07，穿过实测点的中间，符合吸热溶解的预期。这个例子用来说明融合不只是降 MAE，还改善了温度响应的形状；但它只是一个组合，不能推广成“所有组合都平滑”。

**English answer（30 s）**

Fixing this combination, we take its 20 measured temperature points from 5.95 °C to 50.2 °C and scan densely. The ET branch gives a staircase, typical of axis-aligned splits; the blend is smooth and monotonically increasing, rising from about −1.59 to −1.07 and passing through the middle of the measurements, consistent with endothermic dissolution. The example shows the blend improves the shape of the temperature response, not only the MAE; but it is one combination and does not generalise to all.

> **关键数字**　20 点；5.95–50.2 °C；约 −1.59 → −1.07；ET 阶梯 vs blend 平滑。

> **可能追问**　追问“这是不是过拟合出来的平滑”：平滑来自两支平均和 TabPFN 的连续先验，不是人工插值；但确实只展示了一个体系，报告没有做全组合的单调性统计。

### Q55　TabPFN 的两个纠偏案例能说明什么？

*What do the two TabPFN calibration cases show?*

*主答 Yaorong Huang　·　报告 §7.3.2；表 6　·　证据 报告表 6；output/figures/*

**中文回答（30 秒）**

两个案例都在丙酮里，方向相反。赤藓糖醇 13.2 °C：ET 把这种多元醇拉向室温平均值，明显高估；TabPFN 识别出“高极性小分子在低极性溶剂里难溶”，把预测往下拉，融合误差下降。4-羟基苯甘氨酸 Dane 盐 70.2 °C：ET 偏保守，TabPFN 捕捉到高温下的热力学增溶，往上拉。说明 TabPFN 不是单向“修正偏差”，而是在不同化学空间里做双向校准。具体数值报告表 6 留空，我不在这里补数字。

**English answer（30 s）**

Both cases are in acetone, with opposite directions. Erythritol at 13.2 °C: ET pulls this polyol toward the room-temperature mean and clearly overestimates; TabPFN recognises that a highly polar small molecule is poorly soluble in a low-polarity solvent and pulls the prediction down, reducing the blend error. The 4-hydroxyphenylglycine Dane salt at 70.2 °C: ET is conservative, while TabPFN captures the thermodynamic solubilisation at high temperature and pulls up. TabPFN is not a one-way bias correction; it calibrates in both directions across chemical spaces. The exact numbers in Table 6 are blank in the report, so I will not fill them in here.

> **关键数字**　13.2 °C 赤藓糖醇（向下）；70.2 °C Dane 盐（向上）；均为丙酮。

> **可能追问**　追问“具体预测值是多少”：报告表 6 数值未填，只有方向；现场不编数字，答“以报告表格为准，方向是 ET 高估/低估、TabPFN 反向修正”。

### Q56　你们能说“温度导致溶解度变化”吗？

*Can you claim that temperature causes the solubility change?*

*主答 Yaorong Huang　·　报告 §7.5；§9　·　证据 报告 §7.5、§9；output/analysis/*

**中文回答（30 秒）**

只能在一个严格限定的范围内说：在观测到的药物—溶剂组合内，控制组合固定效应后，升温 1 °C 平均伴随 +0.01538 log10（约 3.6%）的溶解度变化；这个结论对未观测的、随温度变化的混杂是敏感的，54% 的敏感性边界说明它需要很强的混杂才能推翻。不能说的是：这个斜率对任何新母体都成立；也不能说“我们证明了普遍因果律”。观测数据 + 固定效应，识别的是组合内平均效应，不是机制。

**English answer（30 s）**

Only within a strictly limited scope: inside the observed drug–solvent combinations, controlling for combination fixed effects, a 1 °C increase is associated with +0.01538 log10 (about 3.6%) on average; the estimate is sensitive to unobserved temperature-varying confounders, and the 54% bound says a strong confounder would be needed to overturn it. What we cannot say: that this slope holds for any new parent, or that we have proved a universal causal law. Observational data plus fixed effects identify a within-combination average effect, not a mechanism.

> **关键数字**　+0.01538 / °C ≈ +3.6%；54% 敏感性；限定“组合内”。

> **可能追问**　追问“那这个结论有什么用”：它纠正了合并数据里的负相关，给工艺升温方向一个可辩护的量化依据，同时明确外推边界。

# 6　系统与应用

*The demonstration system: what was built, what was measured, and what it is for*

### Q57　系统架构是什么样的？

*What is the system architecture?*

*主答 Haoyang He　·　报告 §8.1–8.3　·　证据 报告 §8；图 11*

**中文回答（30 秒）**

四层。最上面是浏览器界面；下面是 FastAPI 服务层，负责请求校验、字段过滤和错误处理；再往下是分子处理层，用 RDKit 解析 SMILES、做标准化、生成 217 个描述符，再拼成 869 维交互向量；最后是模型调度层，ET、TabPFN、SOLAR-H 按清单加载，可以单跑也可以并行。输出层把 log10 摩尔溶解度反算成 g/L 或 mol/L，附上分支权重和历史覆盖度提示。整个链路一次请求走完。

**English answer（30 s）**

Four layers. The browser interface sits on top; below it a FastAPI service layer handles request validation, field filtering and error handling; then a molecular layer parses SMILES with RDKit, standardises it, computes 217 descriptors and assembles the 869-dimensional interaction vector; finally a model-dispatch layer loads ET, TabPFN and SOLAR-H from the manifest and runs them singly or in parallel. The output layer converts log10 molar solubility to g/L or mol/L and attaches branch weights and a historical-coverage flag. One request traverses the whole chain.

> **关键数字**　UI → FastAPI → RDKit（217 → 869）→ 模型调度（ET ∥ TabPFN ∥ SOLAR-H）→ 输出反算。

> **可能追问**　追问“为什么用 FastAPI 而不是 Flask”：自带类型校验和 OpenAPI 文档，请求体校验和错误码更规范，适合做演示 API。

### Q58　系统里到底有多少个模型，13 还是 14？

*How many models are in the system, 13 or 14?*

*主答 Haoyang He　·　报告 §8.2；README　·　证据 报告 §8；models/manifest.json*

**中文回答（30 秒）**

两个口径，不要混。开发基准是 13 个模型，就是 README 和附录 B 那张表；系统 manifest 注册了 14 个可切换条目，多出来的是部署用的融合模型条目和分支/基线的组织方式不同，不是又多训练了一个新模型。答辩时说“基准 13 个、系统注册 14 个条目”，并说明 14 是部署清单口径，不要说“我们做了 14 个模型”。

**English answer（30 s）**

Two different counts; do not mix them. The development benchmark has 13 models, the table in the README and Appendix B; the system manifest registers 14 switchable entries. The extra entry comes from how the deployed blend and its branches or baselines are organised, not from training an additional model. Say “13 benchmark models, 14 registry entries”, and make clear that 14 is the deployment-manifest count; do not say “we built 14 models”.

> **关键数字**　13 个基准；14 个注册条目；口径不同。

> **可能追问**　追问“多出来的到底是哪个”：以 manifest 为准，现场可以打开清单指出融合条目；不要在答辩里凭记忆猜名字。

### Q59　系统有哪些功能，分别对应什么使用场景？

*What can the system do, and which use case does each function serve?*

*主答 Haoyang He　·　报告 §8.4　·　证据 报告 §8.4；presentation/assets/screenshots/*

**中文回答（30 秒）**

六个功能。单点预测：输入药物、溶剂、温度，给出 logS、浓度和分支贡献，用于快速查一个条件。模型对比：同一输入并排显示 SOLAR-H 与融合模型，用于判断两支是否一致。变温扫描：在用户选定的窗口里生成 61 个点，画两条响应曲线并叠加历史实测点，用于看趋势。溶剂筛选：在 49 种溶剂里排序，用于初筛。批量 CSV：一次 1 到 100 行，用于跑一组候选。适用域提示：覆盖度不足时给黄色预警，用于防止外推。

**English answer（30 s）**

Six functions. Single-point prediction takes drug, solvent and temperature and returns logS, concentration and branch contributions for a quick lookup. Model comparison shows SOLAR-H and the blend side by side for the same input, to judge agreement. Temperature scan generates 61 points over a user-chosen window, plots both response curves and overlays historical measurements for trend inspection. Solvent screening ranks the 49 solvents for initial selection. Batch CSV handles 1 to 100 rows for a candidate set. The applicability-domain flag warns in amber when coverage is thin, to prevent extrapolation.

> **关键数字**　单点 / 对比 / 61 点扫描 / 49 溶剂筛选 / 批量 1–100 / 适用域预警。

> **可能追问**　追问“哪个功能最有用”：对工艺工程师是变温扫描和溶剂筛选；对建模评审是模型对比，因为它把两支的分歧暴露出来。

### Q60　1.70 秒到底测的是什么，和“小于 1 秒”矛盾吗？

*What exactly does 1.70 s measure, and does it contradict “under one second”?*

*主答 Haoyang He　·　报告 §8.5；表 7　·　证据 报告表 7；output/deployment/*

**中文回答（30 秒）**

不矛盾，是两个口径。1.70 秒是端到端 API 延迟：5 次请求的均值，范围 1.68–1.73 秒，包含 HTTP、校验、RDKit 解析、869 维特征、ET 和 TabPFN 推理、输出组装，在 GPU 上跑。小于 1 秒是模型前向本身，不含前后处理。答辩时必须说清“端到端 1.7 秒、模型前向小于 1 秒”，不能把 1.7 秒说成模型推理时间，也不能承诺“系统 1 秒内返回”。

**English answer（30 s）**

They do not conflict; they are two scopes. 1.70 s is end-to-end API latency: the mean of five requests, range 1.68–1.73 s, covering HTTP, validation, RDKit parsing, the 869-dimensional features, ET and TabPFN inference, and output assembly, on GPU. Under one second is the model forward pass alone, excluding pre- and post-processing. Say “1.7 s end-to-end, under 1 s for the forward pass”; do not describe 1.7 s as model inference time, and do not promise sub-second system response.

> **关键数字**　1.70 s（1.68–1.73，5 次，端到端）；模型前向 <1 s。

> **可能追问**　追问“为什么 TabPFN 不慢”：上下文 1507 条在 GPU 上是一次注意力前向；如果换 CPU 或更大上下文，端到端会明显变慢。

### Q61　在线结果和离线结果一致吗，怎么验证的？

*Do online and offline results agree, and how was it verified?*

*主答 Haoyang He　·　报告 §8.5；表 7　·　证据 报告表 7；output/deployment/*

**中文回答（30 秒）**

一致。验证方法是：同一批输入分别走在线 API 和离线脚本，逐条比较 logS，最大绝对偏差是 0；变温扫描的 61 个点与逐点单次调用比较，最大偏差 4.92×10⁻⁷，属于浮点累加误差。这个检查很重要，因为演示系统最容易出的问题不是模型不准，而是特征拼错、标准化参数没对齐、单位换算出错；偏差为 0 说明部署链路和训练链路用的是同一套变换。

**English answer（30 s）**

They agree. The check runs the same inputs through the online API and the offline script and compares logS record by record; the maximum absolute deviation is 0. The 61-point temperature scan compared with individual point calls differs by at most 4.92×10⁻⁷, a floating-point accumulation effect. This matters because the usual failure in a demo system is not model accuracy but mis-assembled features, mismatched standardisation parameters or unit-conversion errors; a zero deviation shows the deployment and training pipelines use the same transformations.

> **关键数字**　单点偏差 0；扫描偏差 4.92e−7；同一套特征与标准化。

> **可能追问**　追问“0 是不是因为缓存”：不是，离线脚本独立加载模型和特征；现场可以换一个新 SMILES 重跑对比。

### Q62　批量预测怎么处理异常输入？

*How does batch prediction handle invalid input?*

*主答 Haoyang He　·　报告 §8.5　·　证据 报告 §8.5；output/deployment/*

**中文回答（30 秒）**

批量接口接受 1 到 100 行 CSV，逐行校验：SMILES 能否解析、溶剂是否在 49 种清单内、温度是否在实测范围内、数值是否有限。非法行不会让整批失败，而是返回该行的错误码和原因，合法行照常预测；这样用户可以一次跑完、再修坏行。超过 100 行会被拒绝，避免单请求占用过多 GPU 时间。这个设计是演示系统的工程细节，不是模型贡献，但它决定了系统能不能被真正使用。

**English answer（30 s）**

The batch endpoint accepts 1 to 100 CSV rows and validates each row: whether the SMILES parses, whether the solvent is in the 49-solvent list, whether the temperature is inside the measured range, and whether values are finite. An invalid row does not fail the batch; it returns that row's error code and reason while valid rows are predicted, so users can run once and fix the bad rows. More than 100 rows is rejected to avoid monopolising GPU time. This is engineering, not a modelling contribution, but it determines whether the system is usable.

> **关键数字**　1–100 行；逐行校验；坏行不拖垮整批。

> **可能追问**　追问“为什么限 100 行”：演示环境的显存和队列限制；生产环境应该改成异步任务队列。

### Q63　适用域预警是怎么做的，可靠吗？

*How is the applicability-domain warning implemented, and is it reliable?*

*主答 Haoyang He　·　报告 §8.4　·　证据 报告 §8.4；output/deployment/*

**中文回答（30 秒）**

目前是一个基于历史覆盖的启发式：检查该药物母体或相似骨架、该溶剂、该温度区间在训练数据里有没有足够记录；覆盖不足就给出黄色提示，并显示最近的历史组合。它不是严格的分布外检测，也没有做置信区间校准，所以只能提示“这个预测可能不可靠”，不能给出“不可用”的硬结论。我们把它定位为安全阀，不是质量保证。25 项系统测试覆盖了正常、边界和异常输入，但不是对预警准确率的统计验证。

**English answer（30 s）**

It is currently a coverage heuristic: it checks whether the parent or a similar scaffold, the solvent and the temperature range have enough records in the training data; thin coverage triggers an amber flag and shows the nearest historical combinations. It is not a rigorous out-of-distribution detector and is not calibrated, so it can say “this prediction may be unreliable” but not “this is unusable”. We present it as a safety valve, not a quality guarantee. The 25 system tests cover normal, boundary and invalid inputs, but they are not a statistical validation of the warning's accuracy.

> **关键数字**　覆盖启发式；黄色提示；25 项测试，非预警准确率验证。

> **可能追问**　追问“为什么不做一个正经的 OOD 检测”：可以用马氏距离、密度估计或集成方差；这是明确的未来工作，当前版本没有做。

### Q64　现场演示跑什么，为什么选这个例子？

*What do you demo live, and why that example?*

*主答 Haoyang He　·　报告 §8.4　·　证据 报告 §8.4；presentation/assets/screenshots/*

**中文回答（30 秒）**

演示洛伐他汀在丙酮中 25 °C：预测 logS=−0.7270，对应 0.1875 mol/L，端到端小于 2 秒。选它是因为这个组合在数据里有 20 条实测记录，覆盖 5.5–49.5 °C，可以现场把预测曲线和实测点叠在一起看；同时它落在适用域内，不会一上来就暴露极端带的问题。演示流程是：输入 SMILES 和溶剂 → 单点预测 → 变温扫描 61 点 → 切到模型对比 → 展示历史覆盖提示。如果网络或 GPU 出问题，用预录视频和截图兜底。

**English answer（30 s）**

We demo lovastatin in acetone at 25 °C: predicted logS = −0.7270, corresponding to 0.1875 mol/L, under 2 s end-to-end. It was chosen because the combination has 20 measured records spanning 5.5–49.5 °C, so the predicted curve and measurements can be overlaid live, and it lies inside the applicability domain, so the demo does not immediately expose the extreme-band weakness. The flow is: enter SMILES and solvent, single-point prediction, 61-point temperature scan, switch to model comparison, show the coverage flag. If the network or GPU fails, a recorded video and screenshots are the fallback.

> **关键数字**　−0.7270（0.1875 mol/L）；20 条实测、5.5–49.5 °C；<2 s。

> **可能追问**　追问“为什么不是蔗糖/氯仿”：那个例子会展示 3.7 log 的高估，适合在“局限”页主动讲，不适合作为开场演示。

# 7　局限、未来与合规

*Limitations, future work and compliance: what this work does not claim*

### Q65　最大的局限是什么？

*What is the biggest limitation?*

*主答 Haoyang He　·　报告 §9；§6.4　·　证据 报告 §9、§6.4*

**中文回答（30 秒）**

固相信息缺失。我们用的是 2D 拓扑描述符，没有晶格能、熔点、多晶型和 3D 堆积，所以模型在“几乎不溶”的极端带上系统性高估：蔗糖/氯仿实测 −6.234，预测 −2.536，差 3.7 个 log。这不是调参能解决的，因为 2D 描述符从原理上看不到固相稳定性。第二个局限是测量噪声，86 组 205 条同条件冲突记录构成不可约误差。第三个是适用域窄：只覆盖小中分子和 49 种常见溶剂。

**English answer（30 s）**

Missing solid-state information. We use 2D topological descriptors without lattice energy, melting point, polymorph or 3D packing, so the model systematically overestimates the nearly insoluble extreme band: sucrose in chloroform measures −6.234 and is predicted at −2.536, a 3.7-log gap. Tuning cannot fix this because 2D descriptors cannot see solid-state stability in principle. The second limitation is measurement noise: 86 groups and 205 conflicting records under identical conditions form an irreducible error floor. The third is a narrow applicability domain: small and medium molecules and 49 common solvents only.

> **关键数字**　蔗糖 −6.234 vs −2.536；86 组 / 205 条；适用域窄。

> **可能追问**　追问“为什么不做 3D”：3D 构象生成和量化计算成本高，而且很多记录没有晶体结构；这是未来工作，不是本课程周期内能完成的。

### Q66　数据噪声这么大，结论还可信吗？

*With this much data noise, are the conclusions still credible?*

*主答 Haoyang He　·　报告 §3.3；§6.4　·　证据 报告 §3.3；output/evidence/*

**中文回答（30 秒）**

可信度要分开看。相对比较是可信的：所有模型用同一划分、同一噪声标签、同一评估协议，噪声对大家的影响方向一致，所以“融合比基础树好”这个结论不会被噪声推翻，配对 bootstrap 也已经把母体层面的波动算进去。绝对精度要谨慎：0.6668 里有一部分是不可约噪声，不能解读成“模型误差还有 0.67 的改进空间”。至于因果斜率，我们用 1118 条同组合多温度记录和三种区间，噪声只会让区间变宽，不会让符号反转。

**English answer（30 s）**

Separate the two. Comparative conclusions are credible: all models share the same split, noisy labels and evaluation protocol, so noise affects them in the same direction, and “the blend beats the base tree” is not overturned by noise; the paired bootstrap already accounts for parent-level variation. Absolute accuracy needs caution: part of 0.6668 is irreducible noise, so it should not be read as “0.67 of model error remains to be removed”. For the causal slope, we use 1,118 within-combination multi-temperature records and three interval methods; noise widens the interval but does not flip the sign.

> **关键数字**　同一协议下的相对比较可信；绝对值含不可约噪声；区间已含不确定性。

> **可能追问**　追问“能不能估计噪声下限”：可以用重复测量做方差分解；报告没有做，这是可补的分析。

### Q67　适用域具体覆盖什么，超出会怎样？

*What exactly does the applicability domain cover, and what happens outside it?*

*主答 Haoyang He　·　报告 §8.4；§9　·　证据 报告 §8.4、§9*

**中文回答（30 秒）**

覆盖范围是：小到中等分子（大致分子量 200–800）、49 种常见工业溶剂、温度 −59.5 到 130 °C 的实测区间、以及有历史记录的药物—溶剂组合附近。超出时系统给黄色预警，但不会拒绝预测；模型仍然输出数字，只是可信度下降。明确不覆盖：全新溶剂、共溶剂/混合溶剂、离子液体、大分子/生物制剂、极端 pH 或含添加剂体系。答辩时不要把这些说成“可外推”。

**English answer（30 s）**

Coverage means small to medium molecules (roughly MW 200–800), the 49 common industrial solvents, the measured temperature range of −59.5 to 130 °C, and regions near drug–solvent combinations with historical records. Outside this, the system shows an amber warning but does not refuse; it still returns a number with lower credibility. It explicitly does not cover new solvents, cosolvent or mixed systems, ionic liquids, large molecules or biologics, extreme pH, or additive-containing systems. Do not present these as extrapolable.

> **关键数字**　MW 200–800；49 溶剂；−59.5–130 °C；不覆盖共溶剂/新溶剂/大分子。

> **可能追问**　追问“为什么分子量 200–800”：训练数据的实际分布；超出这个范围的母体在描述符空间里没有近邻，模型没有依据。

### Q68　如果继续做，最先补什么？

*If you continued, what would you fix first?*

*主答 Haoyang He　·　报告 §9　·　证据 报告 §9*

**中文回答（30 秒）**

按优先级三件。第一，冻结融合流程，在 33 个留出母体上一次性跑完盲测，把报告里最大的空白补上；这件事成本最低、可信度收益最高。第二，引入固相信息：实验熔点作为辅助任务或特征，或者 3D 构象加量化描述符，专门攻极端带和溶解度悬崖。第三，做校准：现在只有点预测，没有区间；对工艺决策来说，“0.67±多少”比“0.67”有用得多。

**English answer（30 s）**

Three things in priority order. First, freeze the blend pipeline and run the 33 held-out parents once as a blind test, closing the report's biggest gap at the lowest cost and highest credibility gain. Second, add solid-state information: experimental melting point as an auxiliary task or feature, or 3D conformers with quantum-chemical descriptors, aimed at the extreme band and solubility cliffs. Third, add calibration: we currently provide point predictions only, no intervals, and for process decisions “0.67 ± what” is far more useful than “0.67”.

> **关键数字**　33 母体盲测 → 固相/熔点/3D → 区间校准。

> **可能追问**　追问“为什么熔点有用”：熔点直接反映晶格能，是溶解的主要阻力；很多药物有实验熔点，获取成本远低于 3D 量化计算。

### Q69　还有哪些未来方向？

*What other future directions are there?*

*主答 Haoyang He　·　报告 §9　·　证据 报告 §9*

**中文回答（30 秒）**

三条线。数据侧：主动学习和贝叶斯优化，用模型不确定性挑下一批实验，把有限的测量预算花在最能降低误差的组合上；同时补共溶剂、绿色溶剂和混合体系，因为工业上很少用纯溶剂。方法侧：把 SOLAR-H 的温度项扩展到非线性（比如二次项或分段），并检验它在新母体上的可迁移性。验证侧：多中心、统一 SOP、双盲留出，解决单实验室数据和批次效应的问题。

**English answer（30 s）**

Three lines. On data: active learning and Bayesian optimisation to choose the next experiments by model uncertainty, spending a limited measurement budget where it most reduces error, plus cosolvents, green solvents and mixed systems, since industry rarely uses pure solvents. On methods: extend the SOLAR-H temperature term to nonlinear forms, such as quadratic or piecewise, and test its transferability to new parents. On validation: multi-centre data with a common SOP and a double-blind holdout, to address single-lab and batch effects.

> **关键数字**　主动学习 / 贝叶斯优化；共溶剂 / 绿色溶剂；多中心 SOP / 双盲。

> **可能追问**　追问“为什么现在不做”：课程周期和数据获取权限有限；这些是明确的研究路线，不是答辩现场能补的实验。

### Q70　数据、伦理和 Gen AI 合规怎么处理？

*How do you handle data, ethics and Gen AI compliance?*

*主答 Jiayun Song　·　报告 课程要求；报告封面　·　证据 课程 Project Description；Gen AI policy form*

**中文回答（30 秒）**

数据是课程提供的公开实验记录，不含个人隐私；我们只在课程范围内使用，没有外传或商用。引用按 IEEE 格式，报告按 MPU 模板，参考文献 15 条，方法、数据和结论都能追溯到出处。Gen AI 使用按课程 policy form 申报：用于文字润色、代码调试和格式检查，不用于生成实验结果或代替人工分析；所有数字都从代码和输出文件核对过。系统明确标注“研究演示，不用于临床、法规或生产决策”。

**English answer（30 s）**

The data are public experimental records provided by the course and contain no personal information; we use them only within the course and did not redistribute or commercialise them. Citations follow IEEE, the report follows the MPU template, and the 15 references let methods, data and conclusions be traced. Gen AI use is declared on the course policy form: text polishing, code debugging and format checking, not generating experimental results or replacing human analysis; every number was checked against code and output files. The system is labelled “research demo, not for clinical, regulatory or production decisions”.

> **关键数字**　公开课程数据；IEEE 引用；MPU 模板；Gen AI policy form；研究演示声明。

> **可能追问**　追问“哪些文字是 AI 写的”：按 policy form 如实说明使用范围；核心分析、数字和结论由成员完成并核对，AI 只做辅助。

### Q71　如果重做一次，你会改什么？

*If you did it again, what would you change?*

*主答 Yaorong Huang　·　报告 §9；个人反思　·　证据 报告 §9*

**中文回答（30 秒）**

四件事。第一，先冻结评估协议再迭代，避免摘要和正文的口径漂移——8.54% 与 10.73% 的混用就是版本管理不严的代价。第二，把 33 母体盲测放进时间表，而不是留到最后。第三，补两个对照：随机划分对照（量化泄漏有多大）和 RF+TabPFN 融合（检验 ET 是否真的最适合做分支）。第四，更早做校准和误差分解，而不是最后才看分层表。这些不是“结果不好”，是流程可以更严谨。

**English answer（30 s）**

Four things. First, freeze the evaluation protocol before iterating, to avoid the drift between abstract and body — mixing 8.54% and 10.73% was the price of loose version control. Second, schedule the 33-parent blind test instead of leaving it to the end. Third, add two controls: a random-split control to quantify leakage, and an RF + TabPFN blend to test whether ET is really the best branch. Fourth, do calibration and error decomposition earlier rather than discovering the stratified table at the end. These are process improvements, not bad results.

> **关键数字**　冻结协议；33 盲测排期；随机划分对照；RF+TabPFN；早期校准。

> **可能追问**　追问“最大的教训”：不是模型选错，而是评估口径和版本管理；数字一旦进摘要，全组必须用同一张表。

# 8　分工与现场策略

*Division of labour and defence strategy: who answers what, and how to handle the unknown*

### Q72　每个人负责哪部分，现场怎么分工？

*Who owns which part, and how is the defence divided?*

*主答 Jiayun Song　·　报告 演示分工；报告章节　·　证据 presentation/notes/source-map.md*

**中文回答（30 秒）**

按演示单元分：Jiayun 负责 01–07，问题定义、数据、分布和评估协议，主答 Q01–Q13；Chunsheng 负责 08–11，SOLAR-H、消融和温度项，主答 Q14–Q23 以及 Q38–Q46 的结果部分；Yaorong 负责 12–18，融合、消融、性能、敏感性、可解释性和因果，主答 Q24–Q37、Q47–Q56；Haoyang 负责 19–24，系统、应用检查、误差带和结论，主答 Q57–Q71。Q72–Q76 由当前最相关的人先答，其他人补一句。

**English answer（30 s）**

By presentation unit: Jiayun owns 01–07 — problem definition, data, distributions and evaluation protocol — and leads Q01–Q13. Chunsheng owns 08–11 — SOLAR-H, ablation and the temperature term — and leads Q14–Q23 plus the results in Q38–Q46. Yaorong owns 12–18 — the blend, ablation, performance, sensitivity, interpretability and causality — and leads Q24–Q37 and Q47–Q56. Haoyang owns 19–24 — the system, application checks, the error band and conclusions — and leads Q57–Q71. For Q72–Q76, the most relevant person answers first and others add one sentence.

> **关键数字**　Jiayun Q01–13；Chunsheng Q14–23、Q38–46；Yaorong Q24–37、Q47–56；Haoyang Q57–71。

> **可能追问**　追问“跨章节的问题谁答”：谁的主场谁先答，答完主动交给下一环；不要四个人同时开口。

### Q73　遇到不会答的问题怎么办？

*What do you do when you cannot answer a question?*

*主答 Jiayun Song　·　报告 现场策略　·　证据 内部约定*

**中文回答（30 秒）**

三步，不硬编。第一步，确认问题：“您问的是 X，对吗？”给自己两秒，也避免答错方向。第二步，说清已知边界：“这个我们没有做/报告没有覆盖，我们做的是 Y，结论只到 Z。”第三步，给下一步：“如果要回答，需要补 A 实验或 B 分析。”绝对不要编数字、不要说“应该是”、不要把“没做”包装成“做了但没写”。评委更在意你是否知道边界，而不是你是否无所不知。

**English answer（30 s）**

Three steps, no bluffing. First, confirm the question: “You are asking about X, correct?” — buying two seconds and avoiding the wrong target. Second, state the boundary: “We did not do that, or the report does not cover it; what we did is Y, and the conclusion only reaches Z.” Third, give the next step: “Answering it would require experiment A or analysis B.” Never invent a number, never say “it should be”, and never dress “not done” as “done but unwritten”. Examiners care more about whether you know the boundary than whether you know everything.

> **关键数字**　确认问题 → 说边界 → 给下一步；不编数字。

> **可能追问**　追问“如果评委逼问一个不存在的数字”：重复边界，并给一个可验证的替代数字；例如“33 母体没跑，但 128 母体上是 0.6668”。

### Q74　最后陈述怎么说？

*How should the closing statement go?*

*主答 Jiayun Song　·　报告 汇报收尾　·　证据 演示第 23–24 页*

**中文回答（30 秒）**

三句话。第一，问题：我们预测的是未见母体在多种溶剂、连续温度下的条件溶解度，评估按母体分组、嵌套交叉验证，不用随机划分粉饰。第二，结果：融合模型母体加权 MAE 0.6668，比基础树低 0.0801（10.73%），对基础树显著；对强单支是点估计更优但不显著。第三，边界与价值：它在中等可溶区间可用于初筛和溶剂排序，在几乎不溶的极端带会高估，固相信息是下一步。不喊口号，不称 SOTA。

**English answer（30 s）**

Three sentences. First, the problem: we predict conditional solubility for unseen parents across many solvents and continuous temperature, evaluated by parent-grouped nested cross-validation rather than a flattering random split. Second, the result: the blend reaches 0.6668 parent-weighted MAE, 0.0801 (10.73%) below the base tree and significant against it; against the strong single branches it is better on point estimates but not significant. Third, the boundary and value: it supports screening and solvent ranking in the moderately soluble range, overestimates the nearly insoluble extreme band, and solid-state information is the next step. No slogans, no SOTA claim.

> **关键数字**　0.6668；0.0801 / 10.73%；对基础树显著；极端带高估；固相是下一步。

> **可能追问**　追问“一句话总结贡献”：把物理解耦、显式交互、母体等权和异构融合放进同一个无泄漏评估，并交付可用的演示系统。

### Q75　多人回答时怎么避免口径冲突？

*How do you avoid contradictions when several people answer?*

*主答 Yaorong Huang　·　报告 现场策略　·　证据 0.6 数字口径表*

**中文回答（30 秒）**

四条约定。第一，所有数字以 0.6 表为准，任何人说之前先看表；不确定就说“我确认一下，请 X 补充”。第二，一个人主答，其他人只补“补充一点”，不重复、不纠正细节。第三，敏感口径提前分工：8.54/10.73 由 Chunsheng 统一说，33 母体由 Jiayun 统一说，显著性由 Yaorong 统一说，系统时延由 Haoyang 统一说。第四，如果两个人已经说岔了，后一个不要硬圆，直接说“刚才那个数字我说错了，正确的是 X”，现场纠正比将错就错可信。

**English answer（30 s）**

Four rules. First, 0.6 is the single source; check it before speaking, and if unsure say “let me confirm, X will add”. Second, one person leads, others only add a one-sentence supplement; no repetition and no nit-picking. Third, assign sensitive numbers in advance: Chunsheng owns 8.54/10.73, Jiayun owns the 33 parents, Yaorong owns significance, Haoyang owns latency. Fourth, if two people have already contradicted each other, do not improvise a reconciliation; say “that number was wrong, the correct one is X”. A live correction is more credible than saving face.

> **关键数字**　0.6 表唯一口径；一人主答；敏感数字定人；错了当场改。

> **可能追问**　追问“如果评委抓住矛盾不放”：承认版本问题，给两组数字的完整定义和区间，不解释动机、不甩锅。

### Q76　15 分钟汇报和 15 分钟问答怎么排练？

*How do you rehearse the 15-minute talk and 15-minute Q&A?*

*主答 Jiayun Song　·　报告 课程要求　·　证据 Project Description*

**中文回答（30 秒）**

汇报按 13 分钟排，留 2 分钟缓冲；24 页里 18 页主稿，平均每页 40–45 秒，开场和目标 2 分钟、数据与协议 3 分钟、两个模型 5 分钟、结果与解释 3 分钟、系统与结论 2 分钟。问答按 15 分钟准备：先练 20 道高频题，每题 30 秒；再练 10 道“不会答”的题，练边界表述。全组至少合练两次，一次计时、一次录像；录像回看只查三件事——数字是否说错、是否有人说“显著优于所有”、是否超时。

**English answer（30 s）**

Plan the talk for 13 minutes with a 2-minute buffer. Of the 24 slides, 18 are the main deck at 40–45 seconds each: 2 minutes opening and goal, 3 minutes data and protocol, 5 minutes the two models, 3 minutes results and interpretation, 2 minutes system and conclusion. For the 15-minute Q&A, rehearse the 20 high-frequency questions at 30 seconds each, then 10 “unknown” questions to practise boundary statements. Rehearse together at least twice, once timed and once recorded; review the recording for only three things — wrong numbers, anyone saying “significantly better than all baselines”, and overrun.

> **关键数字**　13 分钟 + 2 分钟缓冲；18 页主稿；20 道高频 × 30 秒；两次合练。

> **可能追问**　追问“如果超时怎么办”：砍系统细节和文献综述，保留问题、协议、主结果、边界；结论页必须讲到。

# A　数字速查表

*Key figures at a glance*

按“数据—协议—结果—解释—系统”排列。表中每个数字都能在报告、README 或 output/ 文件中找到出处；答辩前只背粗体行。

| 类别 | 指标 | 数值 | 出处 / 说明 |
|---|---|---|---|
| **数据** | 记录 / 药物名 / 结构 / 母体 | 1904 / 186 / 168 / 161 | 报告 §3.2；ChargeParent 归并 |
| **数据** | 溶剂 / 实测组合 / 理论组合 | 49 / 646 / 8232 | 报告 §3.2；稀疏度 92.15% |
| **数据** | 温度范围 / 标签范围 | −59.5–130 °C / −6.2343–2.2168 | 报告 §3.2 |
| **数据** | 头部 30 母体占比 | 56.6% | 报告 §3.2；长尾证据 |
| **数据** | 冲突组 / 条数 | 86 / 205 | 报告 §3.3；11 组差 >1 log |
| **协议** | 开发 / 留出 | 128 母体·1507 条 / 33 母体·397 条 | 报告 §3.5 |
| **协议** | 外层 / 内层 / 种子 | 5 / 3 / 3（2026、17、42） | 报告 §3.5、§6.1 |
| **协议** | 配对 bootstrap | 10,000 次，按 128 外层母体重采样 | 报告 §6.2 |
| **结果** | 主模型四项 | 0.6668 / 0.6510 / 0.8842 / 0.5234 | 报告表 4；母体 MAE / 行 MAE / RMSE / R² |
| **结果** | 基础 ET 四项 | 0.7469 / 0.7491 / 0.9730 / 0.4229 | 报告表 4 |
| **结果** | 主模型降幅 | 0.0801 / 10.73% | 配对区间 [−0.1366, −0.0276] |
| **结果** | Rich ET 降幅 | 0.0638 / 8.54% | 配对区间 [−0.1219, −0.0082] |
| **结果** | 三种子 | 0.6635 / 0.6679 / 0.6690 | 17 / 42 / 2026；极差 0.0055 |
| **结果** | 三支 / 五支 | 0.6729 / 0.6767 | 报告表 4 |
| **结果** | 分层 MAE（极端/低/中/高） | 2.251 / 0.874 / 0.465 / 0.782 | 报告表 5；极端 23 条、中带 824 条 |
| **结果** | 每母体中位 MAE | 0.544（blend）/ 0.599（SOLAR-H） | 报告 §6.4 |
| **结果** | 胜率 | 77/128（对 SOLAR-H）/ 61/128（对 Rich ET） | 报告 §6.4 |
| **解释** | 四组归因 | 药物 0.466 / 交互 0.432 / 溶剂 0.084 / 温度 0.033 | 报告 §7.3；128 母体等权 |
| **解释** | 合并 OLS / 固定效应 | −0.00746 / +0.01538 每 °C | 报告 §7.5；后者约 +3.6%/°C |
| **解释** | FE 样本 / 组合 / 母体 | 1118 / 157 / 73 | 报告 §7.5 |
| **解释** | 三种区间 | [0.0121,0.0186] / [0.01236,0.01902] / [0.01424,0.01599] | 聚类稳健 / bootstrap 2000 / jackknife |
| **解释** | 敏感性 | 54% | Cinelli–Hazlett 偏 R² |
| **解释** | 洛伐他汀–乙酸丁酯 | −1.587 → −1.074（5.95–50.2 °C） | README；20 个温度点 |
| **系统** | 单点端到端 / 模型前向 | 1.70 s（1.68–1.73）/ <1 s | 报告表 7；5 次 GPU 请求 |
| **系统** | 在线–离线 / 扫描–单点 | 0 / 4.92e−7 | 报告表 7；浮点容差 |
| **系统** | 批量 / 测试 | 1–100 行 / 25 项、100% 覆盖 | 报告 §8.5–8.6 |
| **系统** | 模型数 | 13 个基准 / 14 个注册 | README；系统 manifest |
| **系统** | 演示查询 | 洛伐他汀/丙酮 25 °C：0.1875 mol/L → −0.7270 | 报告 §8.4；<2 s |

# B　13 模型总表

*The complete benchmark, including the baselines not shown in Table 4*

下表为开发集 128 母体、外层嵌套 CV、三种子平均的完整基准。**加粗**为主模型；Table 4 只展示其中 7 行，答辩时若被问“为什么没有 RF/CatBoost”，用这张表回答。

| 模型 | 母体 MAE | 行 MAE | RMSE | R² | 备注 |
|---|---|---|---|---|---|
| **ExtraTrees–TabPFN（主模型）** | **0.6668** | **0.6510** | **0.8842** | **0.5234** | 两支凸融合 |
| 三支（ET + CatBoost + TabPFN） | 0.6729 | 0.6631 | 0.8882 | 0.5191 | 增加分支反而更差 |
| 五支 | 0.6767 | 0.6568 | 0.8899 | 0.5172 | 同上 |
| 随机森林 RF | 0.6815 | 0.7057 | 0.9254 | 0.4780 | 869 维；单支最强之一 |
| TabPFN v2 | 0.6827 | 0.6698 | 0.9117 | 0.4933 | 冻结参数、全上下文 |
| Rich ExtraTrees | 0.6831 | 0.6720 | 0.8981 | 0.5083 | 869 维、母体等权 |
| CatBoost | 0.6931 | 0.7168 | 0.9462 | 0.4542 | 869 维；6 组调参 |
| SOLAR-H | 0.7164 | 0.7520 | 1.0016 | 0.3884 | 自适应 γ；部署 γ=0 |
| RBF SVR | 0.7226 | 0.6600 | 0.9125 | 0.4924 | 869 维 |
| 多视角核岭 | 0.7277 | 0.7388 | 0.9501 | 0.4497 | 指纹 + 理化多核 |
| Base ExtraTrees | 0.7469 | 0.7491 | 0.9730 | 0.4229 | 23 维、200 树、行等权 |
| TabM | 0.7694 | 0.7679 | 1.0104 | 0.3777 | 深度表格基线 |
| Ridge | 0.8746 | 0.9155 | 1.2087 | 0.1094 | 线性基线 |

> **一个必须主动说的细节**
> 随机森林的单支母体 MAE 是 0.6815，比 Rich ExtraTrees 的 0.6831 还低 0.0016。我们选择 ExtraTrees 作为融合分支，是因为它的极端随机分裂与加权叶实现更适合母体等权目标，且与 TabPFN 的误差互补；我们没有跑 RF + TabPFN 的融合，所以不能声称 ET 是唯一最好的单支。如果评委追问，如实说这是未做的对照，不要硬说 ET 全面更优。

# C　术语中英对照

*Glossary*

| 中文 | English | 一句话解释 |
|---|---|---|
| **条件溶解度** | conditional solubility | 给定药物—溶剂—温度条件下的 log10 摩尔溶解度。 |
| **母体 / 母核** | parent compound / parent scaffold | 去掉盐型、电荷与立体标记后的拓扑母核，是分组单位。 |
| **ChargeParent** | ChargeParent standardisation | RDKit 的标准化：中和电荷、剥离反离子、去立体标记。 |
| **未见母体** | unseen parent | 训练集中完全没出现过的母体；本项目的外推目标。 |
| **嵌套交叉验证** | nested cross-validation | 外层评估、内层调参；防止调参泄漏。 |
| **母体加权 MAE** | parent-weighted MAE | 先母体内平均，再对母体等权平均。 |
| **配对 bootstrap** | parent-paired bootstrap | 按母体重采样，估计模型间差异的区间。 |
| **折外预测** | out-of-fold (OOF) prediction | 内层留出折上的预测，用于选融合权重。 |
| **凸组合** | convex combination | 权重非负且和为 1 的线性融合。 |
| **显式交互** | explicit interaction | 用乘积与绝对差把溶质—溶剂匹配关系直接写进特征。 |
| **母体等权** | parent-equal weighting | 每个母体在损失中占相同总质量，w∝1/n_g。 |
| **固定效应** | fixed effects | 组内去均值，消掉不随时间变化的组级基线。 |
| **辛普森悖论** | Simpson's paradox | 合并数据与分组内的趋势方向相反。 |
| **组内斜率** | within-group slope | 只由同一组合内部温度变化识别的斜率。 |
| **平均边际效应** | average marginal effect | 对样本平均的温度导数。 |
| **TreeSHAP** | TreeSHAP | 树集成的精确 Shapley 值归因算法。 |
| **背景期望** | background expectation | SHAP 的基准输出，本项目为 −1.1632。 |
| **适用域** | applicability domain | 模型可信的输入范围；超出时预警而非外推。 |
| **校准** | calibration | 预测值与实测值在局部的一致性。 |
| **溶解度悬崖** | solubility cliff | 结构微小变化导致溶解度突变，2D 描述符难以捕捉。 |
| **晶格能** | lattice energy | 晶体中分子间作用的总和，是溶解的主要阻力。 |
| **多晶型** | polymorph | 同一分子不同晶体堆积，溶解度不同。 |
| **共溶剂** | cosolvent | 两种以上溶剂混合体系；本项目未覆盖。 |
| **主动学习** | active learning | 用模型不确定性挑选下一批实验。 |
| **贝叶斯优化** | Bayesian optimisation | 用代理模型与采集函数做实验设计。 |
| **盲测库** | blind holdout library | 完全不参与开发与调参的母体集合。 |

# D　证据索引

*Where each claim lives*

答辩时不必背文件路径，但要知道每个结论能在哪找到。**报告章节**用于评委翻报告，**仓库文件**用于需要现场核对的极端情况。

| 结论 | 报告位置 | 仓库证据 |
|---|---|---|
| **数据规模、母体归并、冲突记录** | §3.2–3.3；表 1 | datasets/；output/data_audit/ |
| **128/33 划分与嵌套 CV** | §3.5；图 2 | datasets/splits/；output/cv_results.csv |
| **基础 ET 与 Rich ET** | §5.2–5.4；表 2、4 | output/cv_results.csv |
| **869 维特征与消融** | §5.3、§5.7；表 2 | output/analysis/ |
| **TabPFN 与融合权重** | §5.5–5.6；表 4 | models/manifest.json |
| **主结果与配对区间** | §6.2；表 4 | output/evidence/ |
| **分层误差与极端带** | §6.4；表 5 | output/evidence/ |
| **种子与 α 敏感性** | §6.5；图 5 | output/analysis/ |
| **TreeSHAP 归因** | §7.3；图 7 | output/figures/ |
| **固定效应与三种区间** | §7.5；表 6（编号以报告为准） | output/analysis/ |
| **洛伐他汀温度曲线** | §7.4；图 8 | output/figures/ |
| **系统架构与 API** | §8.1–8.3；图 9 | src/ 或 app/；报告 §8 |
| **系统验证表** | §8.5；表 7 | output/deployment/ |
| **演示查询** | §8.4 | presentation/assets/screenshots/ |
| **13 模型完整基准** | §6.2；表 3（部分） | README；presentation Backup A |

# E　禁语与替代表述

*Things not to say, and what to say instead*

以下句子在答辩中一旦说出口，会把可辩护的结论变成不可辩护的夸大。左边是禁语，右边是同一事实的准确表述。

| 不要说 | 改成 |
|---|---|
| “我们的模型显著优于所有基线。” | “四项点估计第一；对基础 ET 显著，对强单支差异不显著。” |
| “我们在 33 个未见母体上验证了泛化。” | “33 个母体是盲测库，主表报告的是 128 个开发母体的外层 CV。” |
| “8.54% 是融合模型的提升。” | “融合对基础树是 10.73%；8.54% 是特征丰富树阶段的降幅。” |
| “温度不重要，SHAP 只有 0.033。” | “温度在全局方差归因中占 3.3%，但组内固定效应显示每 °C +0.01538。” |
| “我们证明了温度的因果效应。” | “在组合固定效应假设下，识别出组合内平均斜率；外推到新母体需额外假设。” |
| “随机划分会高估 X%。” | “机制上会高估；我们没有跑随机划分对照，不报具体数字。” |
| “SOLAR-H 是最终模型。” | “SOLAR-H 是可解释分支，最终部署是 ET–TabPFN 融合。” |
| “模型可以直接用于配方设计。” | “可用于早期排序与溶剂初筛；精确配方需要更高精度与实验验证。” |
| “数据已经清洗干净。” | “保留了 86 组冲突记录以反映真实噪声；描述符在折内插补。” |
| “这是 SOTA。” | “这是在我们的分组协议与数据上的结果；与文献数字不可直接比。” |

# F　答辩前 24 小时检查清单

*The last-24-hours checklist*

| 类别 | 检查项 |
|---|---|
| **口径** | 把 0.6 表打印出来，每人手写一遍 0.6668 / 0.0801 / 10.73% / [−0.1366, −0.0276] / +0.01538 / 54%。 |
| **口径** | 确认全组统一：8.54% 只用于 Rich ET 阶段；主模型说 10.73%。 |
| **口径** | 确认没人会说“显著优于所有基线”或“在 33 母体上验证”。 |
| **内容** | 每人脱稿回答自己章节的全部题目；跨章节的至少能答 Q01、Q39、Q75。 |
| **内容** | 准备三个“不知道”的标准回答：未做对照、报告未覆盖、需要后续实验。 |
| **数字** | 抽查 10 个数字的出处：报告页码 / README / output 文件，至少能说出一个。 |
| **演示** | 本地启动系统，跑通洛伐他汀/丙酮 25 °C 查询；保存截图与 JSON。 |
| **演示** | 准备离线视频/截图；确认投影分辨率下表格与图不糊。 |
| **分工** | 确定 Q&A 主答人；约定“补一句”的手势，避免多人同时开口。 |
| **时间** | 15 分钟汇报按 13 分钟排练，留 2 分钟缓冲；每页不超过 45 秒。 |
| **材料** | 报告 PDF、幻灯片 PDF、代码仓库、Gen AI policy form 各一份，放在桌面同一文件夹。 |
| **状态** | 答辩前一晚不熬夜；把 0.4 的 60 秒陈述大声读三遍，录一遍听节奏。 |

—　END　—

COMP6133 Group 08　·　内部准备材料　·　2026-11-26
