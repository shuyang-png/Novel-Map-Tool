#!/usr/bin/env python3
"""启动小说地图工具 HTTP 服务，供浏览器预览。"""
import http.server
import socketserver
import os
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8765

os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "assets"))

handler = http.server.SimpleHTTPRequestHandler
with socketserver.TCPServer(("", PORT), handler) as httpd:
    print(f"小说地图工具已启动: http://localhost:{PORT}/小说地图工具.html")
    httpd.serve_forever()
