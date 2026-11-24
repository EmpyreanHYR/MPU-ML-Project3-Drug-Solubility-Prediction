"""Double-click launcher shared by Windows and macOS; no extra dependencies."""
import argparse
import json
import os
from pathlib import Path
import socket
import subprocess
import sys
import threading
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
        return health.get('status') == 'ok' and title in ('SOLAR Studio', 'Solubility Studio')
    except (OSError, ValueError):
        return False


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
    try:
        with socket.create_connection(('127.0.0.1', port), timeout=1):
            occupied = True
    except OSError:
        occupied = False
    if occupied:
        if not studio_ready(url):
            print(f'Port {port} is in use by another service, or Studio is still starting. '
                  'Try again later or set PORT to another port.', flush=True)
            return 1
        print('Studio is already running; opening the existing service.', flush=True)
        if not args.no_browser:
            webbrowser.open(url)
        return 0

    print('Starting the server. Keep this window open; press Ctrl+C to stop.', flush=True)
    process = subprocess.Popen(
        [sys.executable, '-m', 'uvicorn', 'webapp.server:app',
         '--host', '127.0.0.1', '--port', str(port)], cwd=ROOT,
    )
    stopped = threading.Event()

    def open_when_ready():
        for _ in range(90):
            if stopped.is_set() or process.poll() is not None:
                return
            if studio_ready(url):
                print('Studio is ready.', flush=True)
                if not args.no_browser and not webbrowser.open(url):
                    print(f'Open this URL manually: {url}', flush=True)
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
