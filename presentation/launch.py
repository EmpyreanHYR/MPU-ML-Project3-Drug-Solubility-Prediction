"""Run the presentation alongside the local SOLAR Studio project."""

import argparse
import os
from pathlib import Path
import re
import sys
import threading
import webbrowser


DECK = Path(__file__).resolve().parent
STUDIO_VIEWS = {
    "predict": "switchView('predict');",
    "compare": "state.compareDeck = 'radar'; switchView('compare');",
    "curves": "state.compareDeck = 'curves'; switchView('compare');",
    "screen": "state.screenSubTab = 'ranking'; switchView('screen');",
    "explore": "state.screenSubTab = 'explore'; switchView('screen');",
    "insights": "state.insightsDeck = 'ablation'; switchView('insights');",
    "mechanism": "state.insightsDeck = 'mechanism'; switchView('insights');",
    "batch": "switchView('batch');",
}


def configure_device(studio):
    import torch

    if torch.backends.mps.is_available():
        device = "mps"
    else:
        device = "cuda" if torch.cuda.is_available() else "cpu"
    if device == "cpu":
        os.environ.setdefault("TABPFN_ALLOW_CPU_LARGE_DATASET", "1")
    original_bundle = studio.bundle
    load_lock = threading.Lock()

    def portable_bundle(model_id, signature):
        # Studio v5 loads several models from worker threads on its first comparison.
        # Serialize deserialization so lazy sklearn imports complete before another load.
        with load_lock:
            model, metadata = original_bundle(model_id, signature)
            if device != "mps" and model_id in studio.NEW_MODELS:
                branch = model.models.get("TabPFN")
                if branch is not None and branch.device == "mps":
                    branch.device = device
        return model, metadata

    studio.bundle = portable_bundle
    return device


def mount_presentation(app, original_static, device):
    from fastapi import HTTPException
    from fastapi.responses import HTMLResponse, Response
    from fastapi.staticfiles import StaticFiles

    index = (original_static / "index.html").read_text(encoding="utf-8")
    script = (original_static / "app.js").read_text(encoding="utf-8")
    script_tag = re.compile(r'src="/static/app\.js(?:\?[^"]*)?"')
    start = "      switchView(state.tab || 'predict');"
    if len(script_tag.findall(index)) != 1 or script.splitlines().count(start) != 1:
        raise ValueError("Use the SOLAR Studio v5 checkout documented in presentation/README.md.")

    @app.get("/presentation/studio", response_class=HTMLResponse)
    def studio_section(view: str = "predict"):
        if view not in STUDIO_VIEWS:
            raise HTTPException(status_code=404, detail="Unknown Studio view")
        return script_tag.sub(f'src="/presentation/studio-script/{view}.js"', index)

    @app.get("/presentation/studio-script/{view}.js")
    def studio_script(view: str):
        if view not in STUDIO_VIEWS:
            raise HTTPException(status_code=404, detail="Unknown Studio view")
        preset = "resetConditions(); "
        if device == "cpu" and view in {"compare", "curves", "screen", "explore"}:
            preset += "$('model').value = 'ExtraTrees'; updateModels(); "
        if device == "cpu" and view == "batch":
            preset += "$('batch-model').value = 'ExtraTrees'; "
        adjusted = script.replace(start, "      " + preset + STUDIO_VIEWS[view], 1)
        return Response(adjusted, media_type="text/javascript", headers={"Cache-Control": "no-store"})

    app.mount("/presentation", StaticFiles(directory=DECK, html=True), name="presentation")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("repo", type=Path, nargs="?", default=DECK.parent)
    parser.add_argument("--port", type=int, default=8502)
    parser.add_argument("--no-browser", action="store_true")
    args = parser.parse_args()
    root = args.repo.resolve()
    if not (root / "hehaoyang" / "webapp" / "server.py").is_file():
        parser.error("Select the SOLAR Studio project root containing hehaoyang/webapp/server.py.")
    if not 1 <= args.port <= 65535:
        parser.error("--port must be between 1 and 65535.")

    for variable in ("OMP_NUM_THREADS", "OPENBLAS_NUM_THREADS", "MKL_NUM_THREADS"):
        os.environ.setdefault(variable, "2")
    os.chdir(root)
    sys.path.insert(0, str(root))
    try:
        from hehaoyang.webapp import server as studio
        import uvicorn
        device = configure_device(studio)
        mount_presentation(studio.app, root / "hehaoyang" / "webapp" / "static", device)
    except ModuleNotFoundError as error:
        parser.exit(1, f"Missing Studio dependency: {error.name}. Run uv sync --frozen in the project.\n")
    except ValueError as error:
        parser.exit(1, f"{error}\n")

    url = f"http://127.0.0.1:{args.port}/presentation/"
    print(f"Presentation: {url} (TabPFN device: {device})", flush=True)
    server = uvicorn.Server(uvicorn.Config(studio.app, host="127.0.0.1", port=args.port))
    stopped = threading.Event()

    def open_when_ready():
        while not stopped.wait(0.2):
            if server.started:
                webbrowser.open(url)
                return

    if not args.no_browser:
        threading.Thread(target=open_when_ready, daemon=True).start()
    try:
        server.run()
    except KeyboardInterrupt:
        return 130
    finally:
        stopped.set()


if __name__ == "__main__":
    raise SystemExit(main())
