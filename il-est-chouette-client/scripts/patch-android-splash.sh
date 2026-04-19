#!/bin/bash
# Patch le splash Android pour afficher splash.png en plein écran.
# À exécuter APRÈS expo prebuild --platform android.

STYLES="android/app/src/main/res/values/styles.xml"
DRAWABLE="android/app/src/main/res/drawable"

# Copier l'image splash plein écran
cp assets/images/splash.png "$DRAWABLE/splash_fullscreen.png"

# Créer le drawable XML (remplit tout l'écran)
cat > "$DRAWABLE/splash_fullscreen_bg.xml" << 'EOF'
<?xml version="1.0" encoding="utf-8"?>
<bitmap xmlns:android="http://schemas.android.com/apk/res/android"
  android:src="@drawable/splash_fullscreen"
  android:gravity="fill" />
EOF

# Remplacer la couleur par le drawable plein écran
sed -i '' 's|<item name="windowSplashScreenBackground">@color/splashscreen_background</item>|<item name="windowSplashScreenBackground">@drawable/splash_fullscreen_bg</item>|' "$STYLES"

# Supprimer l'icône centré et le comportement icon_preferred
sed -i '' '/<item name="windowSplashScreenAnimatedIcon">/d' "$STYLES"
sed -i '' '/<item name="android:windowSplashScreenBehavior">/d' "$STYLES"

echo "✅ Splash plein écran appliqué."
