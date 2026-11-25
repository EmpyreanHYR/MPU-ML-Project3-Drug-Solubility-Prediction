"""Double-click launcher shared by Windows and macOS; no extra dependencies."""
import argparse
import json
import os
from pathlib import Path
import socket
import subprocess
import sys
import threading
import time
import urllib.request
import webbrowser

ROOT = Path(__file__).resolve().parents[1]


def studio_ready(url):
    try:
        # Ignore proxy environment variables for this strictly local service.
        opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
        with opener.open(url + 'api/health', timeout=2) as response:
            health = json.load(response)
        with opener.open(url + 'openapi.json', timeout=2) as response:
            title = json.load(response).get('info', {}).get('title')
        # The health endpoint alone also passes for a stale process whose page
        # can no longer be served, so require the real landing page as well.
        with opener.open(url, timeout=2) as response:
            page = response.read(8192).decode('utf-8', 'replace')
        return (health.get('status') == 'ok'
                and title in ('SOLAR Studio', 'Solubility Studio')
                and 'SOLAR Studio' in page)
    except (OSError, ValueError):
        return False


def port_available(port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as probe:
        probe.settimeout(1)
        return probe.connect_ex(('127.0.0.1', port)) != 0


def open_browser(url, disabled):
    if not disabled and not webbrowser.open(url):
        print(f'Open this URL manually: {url}', flush=True)


def main():
    parser = argparse.ArgumentParser(description='Start SOLAR Studio and open a browser.')
    parser.add_argument('--no-browser', action='store_true', help='Do not open a browser.')
    args = parser.parse_args()
    try:
        port = int(os.environ.get('PORT', '8502'))
        if not 1 <= port <= 65535:
            raise ValueError
    except ValueError:
        print('PORT must be an integer from 1 to 65535.', flush=True)
        return 1
    url = f'http://127.0.0.1:{port}/'
    print(f'SOLAR Studio: {url}', flush=True)
    if not port_available(port):
        # A just-started instance answers health before its page is ready, so
        # retry briefly instead of mistaking it for a stale process.
        deadline = time.monotonic() + 5
        ready = studio_ready(url)
        while not ready and time.monotonic() < deadline:
            time.sleep(0.5)
            ready = studio_ready(url)
        if ready:
            print('Studio is already running; opening the existing service.', flush=True)
            open_browser(url, args.no_browser)
            return 0
        print(f'Port {port} is used by another service or an outdated Studio process '
              'that can no longer serve the page.', flush=True)
        requested = port
        port = next((candidate for candidate in range(requested + 1, requested + 21)
                     if port_available(candidate)), None)
        if port is None:
            print(f'No free port between {requested} and {requested + 20}; set PORT to another value.', flush=True)
            return 1
        url = f'http://127.0.0.1:{port}/'
        print(f'Starting on {url} instead. Stop the old process to reuse port {requested}.', flush=True)

    print('Starting the server. Keep this window open; press Ctrl+C to stop.', flush=True)
    process = subprocess.Popen(
        [sys.executable, '-m', 'uvicorn', 'hehaoran.webapp.server:app',
         '--host', '127.0.0.1', '--port', str(port)], cwd=ROOT,
    )
    stopped = threading.Event()

    def open_when_ready():
        for _ in range(90):
            if stopped.is_set() or process.poll() is not None:
                return
            if studio_ready(url):
                print('Studio is ready.', flush=True)
                open_browser(url, args.no_browser)
                return
            if stopped.wait(1):
                return
        print(f'Browser opening timed out. Check the server log, then open {url}', flush=True)

    threading.Thread(target=open_when_ready, daemon=True).start()
    try:
        return process.wait()
    except KeyboardInterrupt:
        print('\nStopping Studio...', flush=True)
        process.terminate()
        try:
            process.wait(timeout=10)
        except subprocess.TimeoutExpired:
            process.kill()
            process.wait()
        return 130
    finally:
        stopped.set()


if __name__ == '__main__':
    raise SystemExit(main())
