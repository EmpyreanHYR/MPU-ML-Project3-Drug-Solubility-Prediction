# huangyaorong：SOLAR-H 及结构—温度分解消融

SOLAR-H 结构--温度分解模型及其消融对照的实现。模型把条件对数溶解度解耦为结构基线与结构调制的温度响应，梯度增益由内层嵌套验证选定。代码依赖仓库根目录的公共数据、特征与指标工具，通过本目录的 `run.py` 统一入口调用。

## 目录内容

| 路径 | 内容 |
|---|---|
| `models/` | 温度 MLP、条件交互模型、普通 MLP、混合条件模型与公共条件建模组件 |
| `revision_models/` | 自适应混合模型（SOLAR-H） |
| `run_adaptive_revision.py` | SOLAR-H 的训练、消融与评测 |
| `revision_diagnostics.py` | 分解项与温度响应诊断 |
| `run.py` | 统一入口，按脚本名分发并统一模块名与资源路径 |

## 运行

在仓库根目录执行，参数透传给对应脚本：

```bash
uv run --frozen python huangyaorong/run.py run_adaptive_revision.py
uv run --frozen python huangyaorong/run.py revision_diagnostics.py
```

训练通过本目录的 `run.py` 运行，已保存模型的模块名与资源路径才能正确解析。数据位于根目录 `datasets/`，实验结果写入 `output/`，权重写入 `models/`，测试位于 `tests/`。
