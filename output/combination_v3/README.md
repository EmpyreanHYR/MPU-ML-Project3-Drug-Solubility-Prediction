# 本轮模型改进实验

候选融合实验的结果目录，模型权重位于 models/。

评价采用1507行、128个药物母体的母体分组五折；每折内部再以三折母体交叉验证选择参数与凸组合权重。训练种子2026/17/42；397行保留测试集不参与评分。

## 主要结果

|方法|母体MAE ↓|样本MAE ↓|RMSE ↓|R² ↑|
|---|---:|---:|---:|---:|
|Original_AdaptiveHybrid|0.7164|0.7520|1.0016|0.3884|
|Original_ExtraTrees|0.7469|0.7491|0.9730|0.4229|
|RichExtraTrees|0.6831|0.6720|0.8981|0.5083|
|Blend_RichExtraTrees_RichCatBoost|0.6755|0.6758|0.8967|0.5098|
|MultiViewBlend|0.6897|0.6699|0.8958|0.5109|
|TabPFN|0.6827|0.6698|0.9117|0.4933|
|TabPFN_TwoTreeBlend|0.6729|0.6631|0.8882|0.5191|
|TabPFN_ExtraTreesBlend|0.6668|0.6510|0.8842|0.5234|
|TabPFN_FiveViewBlend|0.6767|0.6568|0.8899|0.5172|

当前最低探索分数：TabPFN_ExtraTreesBlend，母体MAE 0.66680，相对原SOLAR-H降低6.92%。这只是已试方法中的开发集探索结果。
研究协议在主方法上先确定：第一轮主方法为MultiViewBlend，第二轮补充主方法为TabPFN_TwoTreeBlend，其他子集只作探索比较。
paired_comparisons_all.csv记录逐母体配对bootstrap区间；区间没有校正反复开发和多方案筛选造成的选择偏差。seed_ensemble_comparison.csv另列“先平均3个种子预测”的结果，不与主表“先计算每种子指标再平均”混用。

## 保存的文件

- [全部嵌套结果](all_nested_comparison.csv)
- [各模型配对差值及区间](paired_comparisons_all.csv)
- [最终完整性检查](combined_checks.json)
- [第一轮研究模型](../../models/combination_v3/deployment/model.joblib)
- [双树研究模型](../../models/combination_v3/deployment/two_tree_model.joblib)
- [第一轮复现入口](../../scripts/reproduce.sh)

研究模型使用完整开发集重新选择参数与权重后拟合，保存在实验目录；未替换应用的现有模型。模型版本、训练数据、参数、权重与哈希见对应metadata.json。

## 实现内容

扩展217个RDKit描述符、相互作用与母体均衡训练；比较ExtraTrees、CatBoost、Tanimoto/描述符多视角KRR/SVR与TabM，并穷举有限凸组合。TabPFN补充实验明确固定Nature2025对应的原始v2权重，仅本地推理，关闭遥测。
算法组合受已发表工作启发，不宣称原创模型或按论文默认配置复现。温度保持CSV原数值尺度。

第一轮的序列化断言要求逐位相同，ExtraTrees并行求和存在4.44e-16的浮点差异，断言容差取1e-12；协议初版与修订记录在protocol_initial.json与protocol_amendment.json。训练、选择与外层预测不受影响。

第二轮完整结果见[tabpfn_nested/comparison.csv](tabpfn_nested/comparison.csv)，TabPFN v2 权重与许可保存在models/combination_v3/tabpfn_probe/，第二轮协议与逐行预测保存在tabpfn_nested/。

- [TabPFN＋ExtraTrees研究模型](../../models/combination_v3/tabpfn_nested/deployment/TabPFN_ExtraTreesBlend.joblib)
- [TabPFN＋双树研究模型](../../models/combination_v3/tabpfn_nested/deployment/TabPFN_TwoTreeBlend.joblib)
- [第二轮复现入口](../../scripts/reproduce_tabpfn.sh)

预测入口：在项目根目录运行 `.venv/bin/python scripts/predict_combination_v3.py --drug-smiles CCO --solvent-smiles O --temperature 25`。输出为CSV目标字段的log10预测值；温度输入仍使用CSV原始数值尺度。
TabPFN研究模型需同时保留项目适配器和models/combination_v3/tabpfn_probe/tabpfn-v2-regressor.ckpt；权重未嵌入joblib，首次预测时在本机重建。

## 未升格的对照

- [标准化相互作用](pair_pilot/comparison.csv)：8候选开发3折，未稳定超过原始交互。
- [TabPFN训练上下文均衡](tabpfn_balancing_pilot/comparison.csv)：固定完整验证行，小幅收益未升格。
- [CPU/MPS速度探测](tabpfn_cpu_probe/result.json)：单折探测，正式模型统一使用MPS。
