#!/bin/bash
# Manual Android APK Build Script
set -e

PROJECT_DIR="/c/Users/cplexmath/OneDrive/Documents/redot2/apk/android-project"
SDK_DIR="/c/Users/cplexmath/OneDrive/Documents/redot2/android-sdk"
BUILD_TOOLS="$SDK_DIR/build-tools/34.0.0"
PLATFORM="$SDK_DIR/platforms/android-34"
OUTPUT_DIR="/c/Users/cplexmath/OneDrive/Documents/redot2/apk"

echo "=== ABC-IO Android APK Build ==="

# Clean and create build dirs
rm -rf "$PROJECT_DIR/build"
mkdir -p "$PROJECT_DIR/build/gen" "$PROJECT_DIR/build/intermediates" "$PROJECT_DIR/build/classes"

# 1. Compile resources
echo "[1/6] Compiling resources..."
"$BUILD_TOOLS/aapt2.exe" compile --dir "$PROJECT_DIR/app/src/main/res" -o "$PROJECT_DIR/build/intermediates/compiled_res.zip"
"$BUILD_TOOLS/aapt2.exe" link -I "$PLATFORM/android.jar" --manifest "$PROJECT_DIR/app/src/main/AndroidManifest.xml" \
    -o "$PROJECT_DIR/build/intermediates/resources.ap_" -R "$PROJECT_DIR/build/intermediates/compiled_res.zip" \
    --java "$PROJECT_DIR/build/gen" --auto-add-overlay

# 2. Compile Java
echo "[2/6] Compiling Java sources..."
mkdir -p "$PROJECT_DIR/build/classes"
JAVAC_FILES="$PROJECT_DIR/app/src/main/java/com/abcio/gateway/MainActivity.java $PROJECT_DIR/app/src/main/java/com/abcio/gateway/GatewayService.java $PROJECT_DIR/build/gen/com/abcio/gateway/R.java"

javac -d "$PROJECT_DIR/build/classes" -source 1.8 -target 1.8 \
    -bootclasspath "$PLATFORM/android.jar" \
    -cp "$PROJECT_DIR/app/libs/nanohttpd-2.3.1.jar" \
    $JAVAC_FILES

# 3. Convert to DEX
echo "[3/6] Converting to DEX..."
# Use jar instead of individual class files to avoid path issues
cd "$PROJECT_DIR/build/classes"
"/c/Program Files/Java/jdk-26.0.1/bin/jar.exe" cvf "$PROJECT_DIR/build/intermediates/classes.jar" .
cd "$PROJECT_DIR"
"$BUILD_TOOLS/d8.bat" --no-desugaring --min-api 21 \
    --lib "$PLATFORM/android.jar" \
    --output "$PROJECT_DIR/build/intermediates" \
    "$PROJECT_DIR/build/intermediates/classes.jar" \
    "$PROJECT_DIR/app/libs/nanohttpd-2.3.1.jar"

# 4. Package APK
echo "[4/6] Packaging APK..."
cp "$PROJECT_DIR/build/intermediates/resources.ap_" "$PROJECT_DIR/build/intermediates/unsigned.apk"
cd "$PROJECT_DIR/build/intermediates"
"$BUILD_TOOLS/aapt.exe" add "$PROJECT_DIR/build/intermediates/unsigned.apk" classes.dex

# 5. Sign APK
echo "[5/6] Signing APK..."
if [ ! -f "$OUTPUT_DIR/keystore.jks" ]; then
    "/c/Program Files/Java/jdk-26.0.1/bin/keytool.exe" -genkey -v -keystore "$OUTPUT_DIR/keystore.jks" -alias abcio \
        -keyalg RSA -keysize 2048 -validity 10000 \
        -storepass abcio123 -keypass abcio123 \
        -dname "CN=ABC-IO, O=ABC-IO, C=US"
fi
"$BUILD_TOOLS/apksigner.bat" sign --ks "$OUTPUT_DIR/keystore.jks" --ks-pass pass:abcio123 \
    --key-pass pass:abcio123 --out "$OUTPUT_DIR/redot2-operator.apk" \
    "$PROJECT_DIR/build/intermediates/unsigned.apk"

# 6. Verify
echo "[6/6] Verifying APK..."
"$BUILD_TOOLS/apksigner.bat" verify "$OUTPUT_DIR/redot2-operator.apk"

echo ""
echo "=================================="
echo "APK BUILD SUCCESSFUL"
echo "Output: $OUTPUT_DIR/redot2-operator.apk"
echo "Size: $(du -h $OUTPUT_DIR/redot2-operator.apk | cut -f1)"
echo "=================================="
