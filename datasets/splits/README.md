# 数据划分

训练、评价与应用共用这一份划分，其中的母体角色在项目中的所有实验里保持一致。

- `data_policy.json`：数据来源哈希与解释策略。
- `split_manifest.csv`：按行记录药物母体及开发/保留角色。
- `development_folds.csv`：开发集的交叉验证划分。

主评价使用 1507 条开发记录、128 个母体。397 条保留记录由 `scripts/evaluate_test_set.py` 单独评分，脚本只读取 `split_manifest.csv` 中标记为 `reserved_holdout_unscored` 的行，不重新拟合、调参或选择模型，结果写入 `output/combination_v3/test_set/`。
