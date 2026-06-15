#!/bin/bash
echo "=== Loading model ==="
curl -s -X POST http://localhost:11434/api/generate \
  -H "Content-Type: application/json" \
  -d '{"model":"qwen2.5:7b","prompt":"hello","stream":false}' \
  -o /tmp/ollama-resp3.json \
  -w "HTTP %{http_code}"
echo ""
sleep 3
echo "=== RAM ==="
free -h
echo ""
echo "=== Ollama Processes ==="
ps aux | grep -v grep | grep ollama
echo ""
echo "=== Response ==="
head -c 200 /tmp/ollama-resp3.json 2>/dev/null
echo ""
echo "=== Model File Size ==="
find /root/.ollama/models/blobs/ -type f -exec ls -lh {} \; 2>/dev/null | tail -5
du -sh /root/.ollama/models/blobs/ 2>/dev/null
