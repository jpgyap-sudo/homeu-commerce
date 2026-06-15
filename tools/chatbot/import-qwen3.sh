#!/bin/bash
set -e

# Download Qwen3 4B Q3_K_M GGUF from HuggingFace
echo "Downloading Qwen3 4B Q3_K_M GGUF..."
cd /tmp
curl -L -o qwen3-4b-q3_k_m.gguf "https://huggingface.co/bartowski/Qwen3-4B-GGUF/resolve/main/Qwen3-4B-Q3_K_M.gguf" --progress-bar -C -

echo "Creating Modelfile..."
cat > /tmp/Modelfile << 'MODELFILE'
FROM /tmp/qwen3-4b-q3_k_m.gguf

TEMPLATE "{{- if .System }}{{ .System }}{{ end }}{{ .Prompt }}"

PARAMETER temperature 0.7
PARAMETER top_p 0.9
PARAMETER stop "</s>"
MODELFILE

echo "Importing to Ollama..."
ollama create qwen3:4b-q3_k_m -f /tmp/Modelfile

echo "Cleaning up..."
rm -f /tmp/qwen3-4b-q3_k_m.gguf /tmp/Modelfile

echo "Done! Model imported."
ollama list | grep qwen3
