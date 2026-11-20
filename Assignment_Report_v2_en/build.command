#!/bin/bash
# ===================================================================
#  LaTeX 一键快捷编译与编译产物清理脚本 (macOS / Linux .command)
#  功能:
#    1. 自动注入 macOS TeX 常用路径 (/Library/TeX/texbin 等)
#    2. 自动将 ../Assignment_Report_v2 加入 TEXINPUTS 以复用 assignment.cls
#    3. 优先使用 latexmk，缺失时自动降级 XeLaTeX 完整编译流程
#    4. 编译成功后自动清理所有临时中间辅助文件，仅保留最终 PDF
#
#  用法:
#    - 双击运行: 自动编译并清理中间产物
#    - ./build.command          : 默认编译并清理
#    - ./build.command build    : 仅编译，保留中间文件
#    - ./build.command clean    : 仅清理中间文件
#    - ./build.command <文件名> : 指定编译特定的 tex 文件
# ===================================================================

set -e

# 确保工作目录为脚本所在目录
cd -- "$(dirname -- "${BASH_SOURCE[0]}")"

# 针对 macOS 注入常见 TeX 发行版路径，并复用 v2 目录下的 assignment.cls
export PATH="/Library/TeX/texbin:/usr/local/bin:/opt/homebrew/bin:$HOME/bin:$PATH"
export TEXINPUTS=".:../Assignment_Report_v2:${TEXINPUTS:-}"

# 退出处理函数（双击运行时若出错，暂停窗口便于排查）
pause_on_exit() {
    local status=$?
    if [[ -t 0 && -n "${TERM_PROGRAM:-}" && "$status" -ne 0 ]]; then
        echo ""
        read -n 1 -s -r -p "按任意键退出..."
        echo ""
    fi
    exit $status
}
trap pause_on_exit EXIT

# ---- 1. 解析参数与探测目标 ----
MODE="all"
TARGET=""

if [[ "${1:-}" =~ ^(clean|build)$ ]]; then
    MODE="$1"
    TARGET="${2:-}"
else
    TARGET="${1:-}"
fi

# 去除可能携带的 .tex 后缀
if [[ -n "$TARGET" ]]; then
    TARGET="${TARGET%.tex}"
fi

# 自动探测主文件
if [[ -z "$TARGET" ]]; then
    if [[ -f "Assignment-main-en.tex" ]]; then
        TARGET="Assignment-main-en"
    elif [[ -f "Assignment-main.tex" ]]; then
        TARGET="Assignment-main"
    elif [[ -f "main.tex" ]]; then
        TARGET="main"
    else
        FIRST_TEX=$(ls -1 *.tex 2>/dev/null | head -n 1 || true)
        if [[ -n "$FIRST_TEX" ]]; then
            TARGET="${FIRST_TEX%.tex}"
        fi
    fi
fi

if [[ -z "$TARGET" ]]; then
    echo "[ERROR] 未在当前目录下找到可编译的 .tex 文件！" >&2
    exit 1
fi

TEX_FILE="${TARGET}.tex"
PDF_FILE="${TARGET}.pdf"

# ---- 清理函数 ----
do_clean() {
    echo "==================================================================="
    echo "[3/3] 正在清理编译中间产物..."
    echo "==================================================================="

    local ext_list=(aux bbl blg fdb_latexmk fls log out toc synctex synctex.gz "synctex.gz(busy)" xdv bcf run.xml lof lot nav snm vrb idx ind ilg upa upb)
    for ext in "${ext_list[@]}"; do
        rm -f -- "${TARGET}.${ext}" 2>/dev/null || true
    done

    # 递归清理子目录中的 .aux 文件
    find . -type f -name "*.aux" -delete 2>/dev/null || true

    echo "[SUCCESS] 中间辅助产物已清理干净！"
    if [[ -f "$PDF_FILE" ]]; then
        echo "[保留] 目标产物: $PDF_FILE 已完好保留。"
    fi
}

if [[ "$MODE" == "clean" ]]; then
    do_clean
    exit 0
fi

# ---- 2. 检查编译工具链 ----
echo "==================================================================="
echo "[1/3] 检查编译工具链..."
echo "==================================================================="

if ! command -v xelatex >/dev/null 2>&1; then
    echo "[ERROR] 未在系统环境中找到 xelatex！" >&2
    echo "请确认已安装 MacTeX 或 TeX Live，并已将路径加入 PATH (如 /Library/TeX/texbin)。" >&2
    exit 1
fi

HAS_LATEXMK=0
if command -v latexmk >/dev/null 2>&1; then
    HAS_LATEXMK=1
    echo "-> 检测到 latexmk 工具，将使用全自动智能编译流程。"
else
    echo "-> 未检测到 latexmk，将自动使用 [XeLaTeX - BibTeX - XeLaTeX - XeLaTeX] 经典编译链。"
fi

echo "-> 主目标文件: $TEX_FILE"
echo "-> 目标生成物: $PDF_FILE"
echo ""

# ---- 3. 执行编译 ----
echo "==================================================================="
echo "[2/3] 开始编译 LaTeX 文档..."
echo "==================================================================="

if [[ "$HAS_LATEXMK" -eq 1 ]]; then
    LATEXMK_OPTS=(-xelatex -synctex=1 -interaction=nonstopmode -file-line-error)
    if [[ -f ".latexmkrc" ]]; then
        latexmk -norc -r .latexmkrc "${LATEXMK_OPTS[@]}" "$TEX_FILE"
    else
        latexmk "${LATEXMK_OPTS[@]}" "$TEX_FILE"
    fi
else
    echo "[Pass 1/3] 正在执行 XeLaTeX 初始扫描..."
    xelatex -interaction=nonstopmode -file-line-error "$TEX_FILE"

    if [[ -f "${TARGET}.aux" ]] && grep -q '\\bibdata' "${TARGET}.aux" 2>/dev/null; then
        echo "[BibTeX] 正在处理参考文献引用..."
        bibtex "$TARGET"
    fi

    echo "[Pass 2/3] 正在执行 XeLaTeX 交叉引用解析..."
    xelatex -interaction=nonstopmode -file-line-error "$TEX_FILE"

    echo "[Pass 3/3] 正在执行 XeLaTeX 最终排版确认..."
    xelatex -interaction=nonstopmode -file-line-error "$TEX_FILE"
fi

if [[ ! -s "$PDF_FILE" ]]; then
    echo "[ERROR] 编译结束，但未生成目标 PDF 或文件大小为 0 字节！" >&2
    exit 1
fi

echo ""
echo "[SUCCESS] PDF 编译成功: $PDF_FILE"
echo ""

if [[ "$MODE" == "build" ]]; then
    echo "[INFO] 当前为 build 模式，保留编译中间产物。"
    exit 0
fi

# ---- 4. 清理编译产物 ----
do_clean

echo ""
echo "---------------------------------------------------"
echo "全部操作已顺利完成！"
echo "---------------------------------------------------"
