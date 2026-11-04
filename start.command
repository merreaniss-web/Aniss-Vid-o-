#!/bin/bash
cd "$(dirname "$0")"
python3 server.py &
SERVER_PID=$!
sleep 1
open "http://localhost:8765/"
wait "$SERVER_PID"
