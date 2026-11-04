#!/usr/bin/env python3
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
import os
ROOT = Path(__file__).resolve().parent
os.chdir(ROOT)
PORT = 8765
class Handler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cross-Origin-Resource-Policy', 'same-origin')
        self.send_header('X-Content-Type-Options', 'nosniff')
        super().end_headers()
server = ThreadingHTTPServer(('0.0.0.0', PORT), Handler)
print(f'ANISS STUDIO disponible sur http://localhost:{PORT}/')
print('Laissez cette fenêtre ouverte pendant l’utilisation. Ctrl+C pour arrêter.')
try:
    server.serve_forever()
except KeyboardInterrupt:
    print('\nArrêt du serveur.')
finally:
    server.server_close()
