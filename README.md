# 药物溶解度预测：TabPFN＋ExtraTrees

机器学习小组项目。报告与 SOLAR Studio 以 TabPFN＋ExtraTrees 为主模型，保留原 SOLAR 系列等 12 个模型及 TabPFN＋双树用于对比，共 14 个可选模型。主模型母体等权 MAE 为 0.6668，逐行 MAE 为 0.6510；结果来自五折外层、三折内层、三个种子的嵌套分组评价，属于开发集探索证据。

报告：[Assignment_Report/Assignment-main.pdf](Assignment_Report/Assignment-main.pdf)。结果入口：[output/README.md](output/README.md)。模型入口：[models/README.md](models/README.md)。

## 仓库保存范围

仓库只保存交付和复现所需文件，本地工作目录可以额外保留草稿、日志和备份。

| 路径 | 保存内容 |
|---|---|
| `datasets/` | 原始 CSV、数据策略、冻结母体划分与交叉验证折清单 |
| `src/` | 数据处理、特征工程、各模型定义、训练/推理公共实现和评价指标 |
| `scripts/` | 训练、参数选择、模型导出、结果分析、应用启动和报告编译入口 |
| `models/` | 所有模型权重、必要的第三方权重许可、权重 SHA-256 清单 |
| `output/` | 模型指标、参数选择记录、逐折与逐行预测、统计比较、部署元数据等 CSV/JSON |
| `webapp/` | 当前 FastAPI 应用与前端静态文件 |
| `plotting/` | 画图代码；读取 `output/`，报告图写入 `Assignment_Report/figures/` |
| `Assignment_Report/` | 当前 LaTeX 正文、样式、报告图片、可编辑图源及最终 PDF |
| `Question/` | 原始项目题目与要求 |
| `bibliography/` | 文献数据库、来源核验记录与构建脚本 |
| `assets/fonts/` | 报告和画图实际使用的字体、许可与来源说明 |
| `tests/`、`tools/`、`configs/` | 必要的测试、图表校验工具与配置 |
| 根目录配置 | `pyproject.toml`、`uv.lock`、`.python-version`、`.gitignore`、README 和平台启动入口 |

权重只放在 `models/`；模型元数据和结果只放在 `output/`。不要在数据目录、报告目录或结果目录重复保存权重。原始历史 JSON 中的旧路径和原始代码哈希保留为证据，不为适配新目录而修改历史数值记录。

不跟踪：`.venv/`、`.cache/`、浏览器会话、日志、临时导出、逐页报告截图、旧报告和修改快照、LaTeX 中间文件、历史一次性修稿脚本及上一版 Streamlit 应用。旧 `artifacts/`、`analysis/`、`docs/` 和 `output/playwright/` 留在原本地位置，由 `.gitignore` 排除；它们不是运行依赖。

## 安装与运行

需要 Python 3.12 和 uv。字体随仓库提供；编译报告还需 XeLaTeX、latexmk 及所用 LaTeX 宏包。

```bash
source scripts/env.sh
uv sync --frozen
uv run --frozen python scripts/launch_studio.py
```

打开 <http://127.0.0.1:8502/>。macOS 和 Windows 也可使用根目录对应的 `启动Studio` 文件。命令行启动服务可使用 `bash scripts/start_web.sh`；更改端口可设置 `PORT`。

Studio 提供单点预测、同条件模型比较、温度与溶剂探索、批量 CSV、数据与模型证据和互动学习。先选择药物、溶剂、温度和模型，再运行；批量 CSV 列名为 `drug,solvent,temperature`，分子须来自应用目录。界面显示的指标来自保存的嵌套评价，不是当前单条预测的误差。

仓库已包含运行所需权重及结果，无须先重训。TabPFN 原配置使用 MPS，本次验证环境为 Apple Silicon；其他硬件需相应设置适配器设备，不能假定跨设备耗时或数值逐位相同。

## 训练、结果核对与报告

```bash
# 原 11 个模型与 SOLAR-H 自适应模型，共 12 个原始对照
uv run --frozen python scripts/run_revision.py
uv run --frozen python scripts/run_adaptive_revision.py

# 第一轮丰富特征与融合实验，随后运行 TabPFN 补充实验
bash scripts/reproduce.sh
bash scripts/reproduce_tabpfn.sh

# 基于保存的实验结果绘图，然后编译报告
uv run --frozen python plotting/eda_revision.py
uv run --frozen python plotting/revision_figures.py
bash scripts/build_report.sh
```

脚本会复用匹配冻结协议的已保存结果，运行这些命令不等于从零重训。需要全新训练时，在独立副本中先归档相应 `output/` 实验子目录及对应权重，再运行；原始数据与 `datasets/splits/` 始终保留。主模型依赖先完成的原始模型结果、第一轮融合结果与公开 TabPFN v2 权重。复现脚本不重新对历史保留集建立“全新盲测”结论。

本次整理只改变文件布局与读取/写入路径，没有重新训练模型或改动已保存预测。`output/layout_migration.json` 记录代码迁移前后哈希；冻结协议校验只接受清单中明确记录的迁移，再修改训练实现仍会触发检查。新增方法、修改数据或协议，应建立新的实验版本，不能重写原结果来冒充原实验。

## 日后提交与推送规则

1. 将文件放入上述对应目录。缓存、日志、截图和临时检查写入 `.cache/`；仅用于报告交付的正式图才进入报告目录。
2. 新权重统一存入 `models/`，同步更新 `models/manifest.json` 中的路径、字节数和 SHA-256；指标、参数与预测同步放入 `output/`，保留实验版本及数据划分对应关系。
3. 只暂存本次任务需要的具体文件或子目录，检查差异后按功能提交。不要使用 `git add -f` 绕过忽略规则，也不要提交整个本地工作目录。
4. 提交前运行以下检查，再检查暂存列表。若增加新的顶层交付目录，须同时更新 `.gitignore`、README 与仓库检查脚本。

```bash
# 先明确暂存本次变更，例如 git add src/models/xxx.py output/new_run/
uv run --frozen pytest -q
uv run --frozen python scripts/check_repository.py
git diff --cached --stat
git diff --cached --name-status
git diff --cached --check

# 按实际变更填写提交信息；多个独立功能分批提交
git commit -m "feat: describe the specific change"
git push origin main
```

`check_repository.py` 检查 Git 跟踪范围、忽略规则、权重位置与哈希，以及当前报告引用文件是否齐全。它不代替模型训练正确性测试、科学结论审核或报告视觉检查。

本地存在已退休的测试时，验证交付版本应使用干净克隆或仅导出 Git 跟踪文件的副本，避免本地遗留文件混入测试。取消跟踪应使用 `git rm --cached`，保留本地文件；本次整理保留已有 Git 历史，不重写历史提交。
