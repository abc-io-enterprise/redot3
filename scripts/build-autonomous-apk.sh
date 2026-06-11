#!/usr/bin/env bash
# ABC-IO Autonomous Operator APK Build
# Owner: Christopher Porreca / redot1
# Builds the hardcoded owner-only biometric cellular failsafe APK.
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
PROJECT_DIR="$PROJECT_ROOT/apk/android-project"
OUTPUT_DIR="$PROJECT_ROOT/apk"
APK_NAME="redot2-operator-autonomous.apk"

echo "================================================"
echo "ABC-IO Autonomous Operator APK Build"
echo "Version: 2.1.0-autonomous"
echo "Features: Biometric owner login, cellular failsafe, hardcoded backend"
echo "================================================"

cd "$PROJECT_DIR"

# Use Gradle wrapper if available, otherwise system gradle
if [ -f "$PROJECT_DIR/gradlew" ]; then
    GRADLE="$PROJECT_DIR/gradlew"
elif command -v gradle >/dev/null 2>&1; then
    GRADLE="gradle"
else
    echo "ERROR: Gradle not found. Install Gradle or run from Android Studio."
    exit 1
fi

# Set Android SDK if present
if [ -d "$PROJECT_ROOT/android-sdk" ]; then
    export ANDROID_HOME="$PROJECT_ROOT/android-sdk"
    export ANDROID_SDK_ROOT="$PROJECT_ROOT/android-sdk"
fi

if [ -z "$ANDROID_HOME" ]; then
    echo "WARNING: ANDROID_HOME not set. Gradle may fail to find SDK."
fi

echo "[1/4] Cleaning previous build..."
$GRADLE clean

echo "[2/4] Building release APK..."
$GRADLE assembleRelease

echo "[3/4] Aligning APK..."
BUILD_TOOLS="$ANDROID_HOME/build-tools/34.0.0"
if [ -d "$BUILD_TOOLS" ]; then
    "$BUILD_TOOLS/zipalign" -f -v 4 \
        "$PROJECT_DIR/app/build/outputs/apk/release/app-release-unsigned.apk" \
        "$OUTPUT_DIR/${APK_NAME%.apk}-aligned.apk"
else
    cp "$PROJECT_DIR/app/build/outputs/apk/release/app-release-unsigned.apk" "$OUTPUT_DIR/${APK_NAME%.apk}-aligned.apk"
fi

echo "[4/4] Signing APK..."
if [ ! -f "$OUTPUT_DIR/keystore.jks" ]; then
    keytool -genkey -v -keystore "$OUTPUT_DIR/keystore.jks" -alias abcio \
        -keyalg RSA -keysize 2048 -validity 10000 \
        -storepass abcio123 -keypass abcio123 \
        -dname "CN=ABC-IO, O=redot1, C=US"
fi

if [ -d "$BUILD_TOOLS" ]; then
    "$BUILD_TOOLS/apksigner" sign --ks "$OUTPUT_DIR/keystore.jks" --ks-pass pass:abcio123 \
        --key-pass pass:abcio123 --out "$OUTPUT_DIR/$APK_NAME" \
        "$OUTPUT_DIR/${APK_NAME%.apk}-aligned.apk"
    "$BUILD_TOOLS/apksigner" verify "$OUTPUT_DIR/$APK_NAME"
else
    echo "WARNING: Build tools not found; signed APK not created."
    cp "$OUTPUT_DIR/${APK_NAME%.apk}-aligned.apk" "$OUTPUT_DIR/$APK_NAME"
fi

echo ""
echo "================================================"
echo "AUTONOMOUS APK BUILD COMPLETE"
echo "Output: $OUTPUT_DIR/$APK_NAME"
if [ -f "$OUTPUT_DIR/$APK_NAME" ]; then
    ls -lh "$OUTPUT_DIR/$APK_NAME"
fi
echo "================================================"
