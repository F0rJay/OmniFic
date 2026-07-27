# OmniFic 品牌说明

OmniFic 的标志由两片首尾相接、向内翻动的书页构成。紫色与青色页形共同形成字母 `O`，上下两个内翻页尖让圆环带有持续书写、循环生长的运动感。

## 设计原则

- 用户选定的 `generated/omnific-logo-transparent.png` 是当前视觉母版，保留原始渐变与翻页高光
- 所有 PWA 与桌面位图从同一张 1024px Alpha 母版派生，不混用其他轮廓
- SVG 文件是便于排版和配色的品牌包装文件，并引用同目录下的透明母版
- Maskable 图标在母版自身留白之外额外保留 10% 安全区
- `32px` 及以下只使用独立标志，不使用横向字标
- 不使用机器人、大脑、魔法书、羽毛笔、星光等通用 AI / 写作符号

## 色彩

| 名称 | 色值 | 用途 |
|---|---|---|
| Electric Violet | `#8B5CF6` | 左页渐变基色、主要品牌色 |
| Cyan | `#22D3EE` | 右页渐变基色、强调色 |
| Deep | `#070A12` | 深色背景与深色单色版 |
| Light | `#F7F8FC` | 浅色背景与浅色单色版 |

渐变只用于 Logo 本身；页面文字、控件和文档装饰仍使用稳定的品牌基色。

## 文件

- `generated/omnific-logo-transparent.png`：当前 1024px Alpha 视觉母版
- `generated/omnific-logo-dark-preview.png`：深色背景预览
- `generated/omnific-logo-concept.png`：原始概念图
- `omnific-mark.svg`：透明背景彩色标志包装文件
- `omnific-mark-on-dark.svg` / `omnific-mark-on-light.svg`：深浅实底版本
- `omnific-mark-mono-dark.svg` / `omnific-mark-mono-light.svg`：纯黑白单色版本
- `omnific-wordmark.svg` / `omnific-wordmark-on-dark.svg` / `omnific-wordmark-on-light.svg`：横向字标
- `omnific-mark-{size}.png`：小尺寸检查与通用 PNG
- `../../../frontend/public/pwa-icons/`：PWA 与 Apple Touch Icon
- `../../../desktop/build/`：桌面端 PNG、ICO 与 ICNS
- `../readme/omnific-hero.svg`：README 横幅的可编辑源文件
- `../readme/omnific-hero.webp`：GitHub README 使用的横幅

运行 `python3 scripts/generate_brand_assets.py` 可从同一视觉母版重新生成平台位图与 README WebP。

## Imagegen 概念探索

当前标志采用用户最终选定的生成方案。为了避免不同平台出现形态偏差，透明 Alpha 版本作为唯一视觉母版，应用图标均由它缩放与合成；单色版则由它的 Alpha 轮廓派生。

### Logo 概念提示词

```text
Use case: logo-brand. Explore a single clean symbol made from exactly two continuous turning book-page ribbons that form both a rounded O and a subtle infinity motion. A narrow central negative space should hint at a text caret or pen-nib slit. Flat electric violet #8B5CF6 and cyan #22D3EE, broad shapes, strong silhouette, generous negative space, readable at 16px. No text, gradient, shadow, glow, robot, brain, magic book, feather, sparkles, chat bubble, literal infinity glyph, or watermark.
```

初期探索分别强调几何圆环、流动曲线和书页折叠。最终采用保留紫青渐变、上下内翻页尖与柔和立体高光的版本。

### README 横幅提示词

```text
Use case: ads-marketing. Create a 1600 × 560 abstract editorial technology banner for an open-source long-form fiction writing project. Flowing streams of tiny luminous glyph-like marks and digital page fragments arc through deep navy #070A12 space. Use restrained electric violet #8B5CF6 and cyan #22D3EE light, leaving a calm title area for the exact SVG logo and wordmark. No readable generated text, product UI, screenshot, people, robot, brain, magic book, feather, watermark, or busy cyberpunk scenery.
```

生成结果用于确定字流方向、留白和霓虹强度；最终横幅同样以可编辑 SVG 重绘，并将准确字标排版后输出为 WebP。
