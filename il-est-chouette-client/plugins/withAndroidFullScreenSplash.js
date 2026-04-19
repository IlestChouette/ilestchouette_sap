/**
 * Config plugin: affiche splash.png en plein écran sur Android.
 *
 * L'API Android 12+ (Theme.SplashScreen) limite l'icône à une petite zone centrale.
 * Ce plugin remplace windowSplashScreenBackground par un drawable bitmap plein écran
 * et supprime l'icône centré, donnant un vrai splash plein écran.
 *
 * Utilise withDangerousMod (phase "last") pour s'exécuter APRÈS expo-splash-screen.
 */
const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

function withAndroidFullScreenSplash(config, { image } = {}) {
  const splashImageRelPath = image || 'assets/images/splash.png';

  config = withDangerousMod(config, [
    'android',
    (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const platformRoot = config.modRequest.platformProjectRoot;
      const resDir = path.join(platformRoot, 'app/src/main/res');
      const drawableDir = path.join(resDir, 'drawable');

      // 1. Copier l'image splash plein écran
      if (!fs.existsSync(drawableDir)) {
        fs.mkdirSync(drawableDir, { recursive: true });
      }
      const src = path.join(projectRoot, splashImageRelPath);
      fs.copyFileSync(src, path.join(drawableDir, 'splash_fullscreen.png'));

      // 2. Créer le drawable XML (remplit tout l'écran)
      const bitmapXml = `<?xml version="1.0" encoding="utf-8"?>
<bitmap xmlns:android="http://schemas.android.com/apk/res/android"
  android:src="@drawable/splash_fullscreen"
  android:gravity="fill" />
`;
      fs.writeFileSync(path.join(drawableDir, 'splash_fullscreen_bg.xml'), bitmapXml);

      // 3. Patcher styles.xml directement (après expo-splash-screen)
      const stylesPath = path.join(resDir, 'values/styles.xml');
      if (fs.existsSync(stylesPath)) {
        let styles = fs.readFileSync(stylesPath, 'utf8');

        // Remplacer la couleur de fond par le drawable plein écran
        styles = styles.replace(
          /<item name="windowSplashScreenBackground">.*?<\/item>/,
          '<item name="windowSplashScreenBackground">@drawable/splash_fullscreen_bg</item>'
        );

        // Supprimer l'icône centré (lui qui apparaît "trop petit")
        styles = styles.replace(
          /\s*<item name="windowSplashScreenAnimatedIcon">.*?<\/item>/g,
          ''
        );

        // Supprimer le comportement icon_preferred
        styles = styles.replace(
          /\s*<item name="android:windowSplashScreenBehavior">.*?<\/item>/g,
          ''
        );

        fs.writeFileSync(stylesPath, styles, 'utf8');
      }

      return config;
    },
  ]);

  return config;
}

module.exports = withAndroidFullScreenSplash;
