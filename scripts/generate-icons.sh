#!/bin/bash
# 图标生成脚本
# 需要安装 ImageMagick: brew install imagemagick

SOURCE_SVG="assets/icon-source.svg"
OUTPUT_DIR="src-tauri/icons"

echo "🎨 开始生成 Markhere 应用图标..."

# 检查 ImageMagick
if ! command -v convert &> /dev/null; then
    echo "❌ 需要安装 ImageMagick"
    echo "   macOS: brew install imagemagick"
    echo "   Linux: sudo apt-get install imagemagick"
    echo "   Windows: 下载 https://imagemagick.org"
    exit 1
fi

# 检查源文件
if [ ! -f "$SOURCE_SVG" ]; then
    echo "❌ 源图标文件不存在: $SOURCE_SVG"
    exit 1
fi

# 创建输出目录
mkdir -p "$OUTPUT_DIR"

# 生成各尺寸 PNG
sizes=(32 128 256 512 1024)

for size in "${sizes[@]}"; do
    echo "生成 ${size}x${size}..."
    
    if [ $size -eq 256 ]; then
        output_file="$OUTPUT_DIR/128x128@2x.png"
    else
        output_file="$OUTPUT_DIR/${size}x${size}.png"
    fi
    
    convert -background none -resize ${size}x${size} "$SOURCE_SVG" "$output_file"
done

# 使用 Tauri CLI 生成完整图标集（如果已安装）
if command -v npx &> /dev/null; then
    echo "使用 Tauri CLI 生成 .icns 和 .ico..."
    npx tauri icon "$SOURCE_SSVG"
fi

echo "✅ 图标生成完成！"
echo ""
echo "生成的文件:"
ls -la "$OUTPUT_DIR"

echo ""
echo "📝 下一步:"
echo "1. 检查生成的图标效果"
echo "2. 运行 'npm run tauri:build' 测试应用图标"
echo "3. 如需调整设计，修改 assets/icon-source.svg 后重新运行此脚本"