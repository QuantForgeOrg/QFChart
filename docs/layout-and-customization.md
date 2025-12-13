---
layout: default
title: Layout & Customization
nav_order: 3
permalink: /layout
---

# Layout & Customization

QFChart offers flexible layout options to adapt to different screen sizes and user preferences.

## Tooltip Positioning

The tooltip is the primary way to view precise values. You can configure its behavior using `options.tooltip.position`.

### Modes

1. **Floating (Default)**
   - Follows the mouse cursor.
   - Automatically switches sides to avoid going off-screen.
   - Best for maximizing chart space.

   ```javascript
   tooltip: {
       position: 'floating'
   }
   ```

2. **Sidebar (Left/Right)**
   - Dedicates a fixed sidebar (250px) for data display.
   - Chart automatically resizes to fill remaining width.
   - Prevents the tooltip from obscuring the chart data.
   - Ideal for desktop views with detailed indicators.

   ```javascript
   tooltip: {
       position: 'left' // or 'right'
   }
   ```

## Multi-Pane Indicators

When adding indicators with `isOverlay: false`, QFChart automatically manages vertical stacking.

### Independent Heights

You can specify the height of each indicator pane as a percentage of the total container height.

```javascript
// Add RSI with 15% height
chart.addIndicator("RSI", rsiPlots, { 
    isOverlay: false, 
    height: 15 
});

// Add MACD with 20% height
chart.addIndicator("MACD", macdPlots, { 
    isOverlay: false, 
    height: 20 
});
```

**Layout Algorithm:**
1. Sums up all explicit indicator heights.
2. Calculates gaps (default 20px dynamic equivalent).
3. Allocates remaining space to the Main Chart (Candlesticks).
4. If remaining space is too small (<20%), it clamps the main chart height.

## DataZoom Control

The zoom slider allows users to navigate history.

```javascript
dataZoom: {
    visible: true,
    position: 'top', // 'top' or 'bottom'
    height: 6        // Height in %
}
```

- **Top**: Places slider at the very top. Chart starts below.
- **Bottom**: Places slider at the bottom.
- **Hidden**: Set `visible: false` to control zoom only via mouse wheel/drag.

