# COMP6133 HTML 汇报

以正式中文报告 `Assignment_Report_v2/` 为主，包含 13 页英文主幻灯片、3 页答辩备用页、15 分钟中文讲稿、可放大原图和完整双语 SOLAR Studio 录屏。

## 打开与投影

双击 `index.html`，用 Edge、Chrome 等现代浏览器打开。每张幻灯片都显示在独立的 16:9 画面内。使用底部的 **Previous / Next** 按钮翻页。图片、公式、报告 PDF、实验来源文件和视频均随文件夹提供。

- **← / →** 或 **空格**翻页，**Shift + 空格**上一页，**Home / End**跳至首尾。
- **F** 或 **Full screen**全屏，**N**打开独立中文备注窗口。投影时仅共享幻灯片标签页。也可直接阅读 [中文讲稿](notes/speaker-notes-zh.md)。
- **Contents** 打开目录。第 13 页是致谢与答疑，可从该页打开备用页。也可按 **B**进入备用页，再按一次回到主汇报。
- **Print PDF** 打开浏览器打印窗口，选择 **Save as PDF / 另存为 PDF**，按 16:9 一张一页导出 13 页主汇报。
- 点击图片放大，Esc 关闭图片或目录。页脚的出处链接打开本地报告相应页码。
- 第 11 页直接内嵌完整的 SOLAR Studio 双语录屏。解压 ZIP 后打开 `index.html`，点击 **Play demo** 播放，或用 **Video chapters** 选择片段。浏览器允许时，视频会在播放时自动全屏，播完回到第 11 页。翻页时视频暂停，打印版显示录屏封面。
- 消融页可切换报告中的改进阶段和固定融合权重。点击 **View original evidence** 查看配对区间和原始图，关闭后回到当前页。

## 打开实际系统

将整个 `presentation/` 放在项目根目录，保持与 `webapp/`、`models/` 同级。Windows 用户双击 `Start-Presentation.bat`。汇报文件夹放在仓库外时，启动器会要求输入项目根目录，也可将该目录拖到启动器上。

已准备原项目 Python 3.12 环境时，也可从仓库根目录执行：

```sh
uv sync --frozen
uv run --frozen python -X utf8 presentation/launch.py
```

启动器打开 `http://127.0.0.1:8502/presentation/`。保持本地 Studio 服务运行，在第 11 页点击 **Open Local SOLAR Studio**，即可在新标签页直接打开系统首页。从本地 `index.html` 打开汇报时，按钮使用 Studio 的默认地址 `http://127.0.0.1:8502/`。更改条件后，根据 Studio 界面提示点击 Run 计算。按 Ctrl+C 停止启动器。

启动器用原项目界面与权重提供推理。CPU 模式下，点预测入口仍使用 v2 主融合模型。曲线、筛选和批量入口优先选择较快的 ExtraTrees，双模型对照的另一分支为 SOLAR-H。可在界面上改选模型。CPU 上的主融合推断可能较慢，课上可直接播放相应章节。

## 数字与素材出处

- [内容和来源映射](notes/source-map.md) 按页对应报告、图表、CSV/JSON 和讲解结论，也记录可复核的数字差异。
- [正式报告 v2 PDF](assets/evidence/report-v2.pdf) 与 `assets/evidence/` 中的关键产物可离线查看。主要图来自 v2 复用的矢量 PDF，转为高分辨率 WebP。SHAP 图裁取原图 A 面板。
- 主比较条形图由 v2 §6.2 主表生成。条形图节选，备用 A 保留 13 种方案。
- 录屏封面取自 SOLAR Studio 原录屏的 00:14.5 帧。视频采用项目原文件 `SOLAR_Studio_Demo_Bilingual.mp4`，保留全长、双语字幕和音轨。`assets/video/` 同时附原始完整字幕文件。[Windows 实机截屏](assets/screenshots/studio-live.png)显示同一案例在 CPU 上的末位差异，课堂主稿保留 v2 记录值。
- 主融合相对基础树的 10.73% 和丰富特征树相对基础树的 8.54% 来自 v2 配对结果中两个独立比较项。备用 B 报告冻结的早期 ExtraTrees 保留集结果。
- 第 1 页按小组提供的顺序列出四位成员的英文名。

审核基于仓库提交 `ebdbc92f55ef4d2f4cafd4cbf8aa9d34941b283f`。[项目原始仓库](https://github.com/EmpyreanHYR/MPU-ML-Project3-Drug-Solubility-Prediction/tree/ebdbc92f55ef4d2f4cafd4cbf8aa9d34941b283f)
