# 模型权重

此目录是仓库中所有模型权重的唯一位置；指标、参数、模型元数据和预测结果统一存入 `../output/`，不在此重复保存。

- `revision_v2/deployment/<模型>/model.joblib`：当前应用的 12 个原始对照模型。
- `combination_v3/tabpfn_nested/deployment/`：TabPFN＋ExtraTrees 主模型与 TabPFN＋双树对照模型。
- `combination_v3/tabpfn_probe/tabpfn-v2-regressor.ckpt`：本地推理所需的公开 TabPFN v2 基础权重；许可见同目录 `LICENSE.txt`。
- `combination_v3/deployment/`：第一轮融合实验的两个模型。
- `deployment/` 与 `final_models/`：早期基线实验的已拟合模型，供对应结果和画图代码核对。

`manifest.json` 记录每个权重的相对路径、字节数与 SHA-256。更换或增加权重时同步更新清单；只有来源可信的本项目权重才可交给 joblib 加载。

TabPFN 适配器默认使用 MPS 设备，完整推理验证在 Apple Silicon 上完成；在其他设备上运行需把适配器配置改为对应设备（如 CPU 或 CUDA）。
