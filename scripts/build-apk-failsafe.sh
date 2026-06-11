#!/usr/bin/env bash
# ABC-IO Failsafe Cellular APK Build Script
# Owner: Christopher Porreca / redot1
# Contact: cporreca@abc-io.com | 585-629-9120
#
# Builds a hardened Android APK that acts as a cellular failsafe relay
# for the ABC-IO public VPS infrastructure. The APK is intended as an
# offline hard copy backup for owner use only.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
APK_DIR="${PROJECT_ROOT}/apk"
BUILD_DIR="${APK_DIR}/android-project"
KEYSTORE="${APK_DIR}/keystore.jks"
APK_OUT="${APK_DIR}/redot2-operator.apk"
FINAL_APK="${APK_DIR}/redot2-latest.apk"

PUBLIC_PORTAL="https://abc-io.com"
OWNER_DASHBOARD="http://162.254.32.142:8500"
MOBILE_GATEWAY="http://162.254.32.142:5050"

echo "=================================="
echo "ABC-IO Failsafe APK Builder"
echo "=================================="

# Ensure Android SDK exists
if [ ! -d "${PROJECT_ROOT}/android-sdk" ]; then
  echo "ERROR: android-sdk directory not found at ${PROJECT_ROOT}/android-sdk"
  echo "Please extract the Android SDK there first."
  exit 1
fi

export ANDROID_HOME="${PROJECT_ROOT}/android-sdk"
export PATH="${ANDROID_HOME}/cmdline-tools/latest/bin:${ANDROID_HOME}/platform-tools:${PATH}"

# Ensure keystore exists
if [ ! -f "$KEYSTORE" ]; then
  echo "Creating release keystore..."
  mkdir -p "$APK_DIR"
  keytool -genkey -v \
    -keystore "$KEYSTORE" \
    -alias redot1 \
    -keyalg RSA -keysize 4096 -validity 9125 \
    -storepass redot1secure \
    -keypass redot1secure \
    -dname "CN=Christopher Porreca, O=redot1, OU=ABC-IO, L=Rochester, ST=NY, C=US"
fi

# Create minimal Android project if not present
if [ ! -d "$BUILD_DIR" ]; then
  echo "Creating minimal Android project..."
  mkdir -p "$BUILD_DIR"
  
  cat > "${BUILD_DIR}/AndroidManifest.xml" <<EOF
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.abcio.operator">
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <application
        android:label="ABC-IO Operator"
        android:theme="@android:style/Theme.NoTitleBar.Fullscreen"
        android:usesCleartextTraffic="true">
        <activity android:name=".MainActivity" android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>
EOF

  mkdir -p "${BUILD_DIR}/src/com/abcio/operator"
  cat > "${BUILD_DIR}/src/com/abcio/operator/MainActivity.java" <<EOF
package com.abcio.operator;

import android.app.Activity;
import android.os.Bundle;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

public class MainActivity extends Activity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        WebView webView = new WebView(this);
        setContentView(webView);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        webView.setWebViewClient(new WebViewClient());
        webView.setWebChromeClient(new WebChromeClient());
        webView.loadUrl("${OWNER_DASHBOARD}");
    }
}
EOF
fi

# Build APK using aapt2 and apksigner
echo "Building APK..."
mkdir -p "${BUILD_DIR}/bin"

AAPT2="${ANDROID_HOME}/build-tools/34.0.0/aapt2"
DX="${ANDROID_HOME}/build-tools/34.0.0/dx"
ZIPALIGN="${ANDROID_HOME}/build-tools/34.0.0/zipalign"
APKSIGNER="${ANDROID_HOME}/build-tools/34.0.0/apksigner"
ANDROID_JAR="${ANDROID_HOME}/platforms/android-33/android.jar"

if [ ! -f "$AAPT2" ]; then
  echo "ERROR: aapt2 not found. Check Android SDK build-tools."
  exit 1
fi

# Compile resources
"$AAPT2" link -I "$ANDROID_JAR" \
  --manifest "${BUILD_DIR}/AndroidManifest.xml" \
  -o "${BUILD_DIR}/bin/app.apk" \
  2>&1 || true

# Compile Java
mkdir -p "${BUILD_DIR}/bin/classes"
javac -source 1.8 -target 1.8 \
  -bootclasspath "$ANDROID_JAR" \
  -d "${BUILD_DIR}/bin/classes" \
  "${BUILD_DIR}/src/com/abcio/operator/MainActivity.java"

# Package classes
"$DX" --dex --output="${BUILD_DIR}/bin/classes.dex" "${BUILD_DIR}/bin/classes"

cd "${BUILD_DIR}/bin"
zip -q -u app.apk classes.dex

# Align and sign
"$ZIPALIGN" -f 4 app.apk aligned.apk
"$APKSIGNER" sign --ks "$KEYSTORE" \
  --ks-pass pass:redot1secure \
  --key-pass pass:redot1secure \
  --out "$APK_OUT" aligned.apk

# Create latest symlink/copy
cp "$APK_OUT" "$FINAL_APK"

echo ""
echo "=================================="
echo "APK build complete:"
echo "  $APK_OUT"
echo "  $FINAL_APK"
echo "=================================="
echo "Install on Android device: adb install -r $FINAL_APK"
