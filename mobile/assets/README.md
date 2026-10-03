# Assets

```
assets/
├── images/   app icon, splash, illustrations, role avatars
├── icons/    in-app SVG icons rendered with react-native-svg
└── fonts/    custom font files loaded through expo-font
```

## Branding files to add

Icon and splash keys are intentionally absent from `app.json` so the project builds on a
clean checkout. Once the artwork exists, drop these files into `images/` and add the keys
back:

| File                | Size                        | `app.json` key                              |
| ------------------- | --------------------------- | ------------------------------------------- |
| `icon.png`          | 1024 × 1024                 | `expo.icon`                                 |
| `adaptive-icon.png` | 1024 × 1024, safe area 66 % | `expo.android.adaptiveIcon.foregroundImage` |
| `splash.png`        | 1284 × 2778                 | `expo.splash.image`                         |
| `favicon.png`       | 48 × 48                     | `expo.web.favicon`                          |

Tamil and Sinhala text needs a font with those glyphs — `Noto Sans Tamil` and
`Noto Sans Sinhala` cover both. Place the `.ttf` files in `fonts/` and load them in
`app/_layout.tsx` before hiding the splash screen.
