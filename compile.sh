#!/bin/bash

echo "🚀 Starte Kompilierung..."

# Einmaliger Build (TS und SCSS nacheinander)
echo "📦 Kompiliere TypeScript (tsc)..."
npm run build

echo "🎨 Kompiliere SCSS (sass)..."
npm run sass:build

echo "✅ Fertig!"
