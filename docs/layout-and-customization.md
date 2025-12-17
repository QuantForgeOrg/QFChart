---
layout: default
title: Layout & Customization
nav_order: 3
permalink: /layout
---

# Layout & Customization

QFChart offers flexible layout options to adapt to different screen sizes and user preferences.

## Databox Positioning

The databox is the primary way to view precise values. You can configure its behavior using `options.databox.position`.

### Modes

1. **Floating (Default)**

   - Follows the mouse cursor.
   - Automatically switches sides to avoid going off-screen.
   - Best for maximizing chart space.

   ```javascript
   databox: {
     position: "floating";
   }
   ```

2. **Sidebar (Left/Right)**

   - Dedicates a fixed sidebar (250px) for data display.
   - Chart automatically resizes to fill remaining width.
   - Prevents the databox from obscuring the chart data.
   - Ideal for desktop views with detailed indicators.

   ```javascript
   databox: {
     position: "left"; // or 'right'
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
  height: 15,
});

// Add MACD with 20% height
chart.addIndicator("MACD", macdPlots, {
  isOverlay: false,
  height: 20,
});
```

**Layout Algorithm:**

1. Sums up all explicit indicator heights.
2. Calculates gaps (default 20px dynamic equivalent).
3. Allocates remaining space to the Main Chart (Candlesticks).
4. If remaining space is too small (<20%), it clamps the main chart height.

## Pane Controls

You can enable interactive controls for each pane (Main Chart and Indicators) to allow users to customize their view at runtime.

### Available Controls

- **Collapse (`+` / `−`)**: Minimizes the pane to a small strip, giving more space to other panes.
- **Maximize (`□` / `❐`)**: Expands the pane to fill the entire chart container (viewport), hiding other panes.
- **Fullscreen (`⛶`)**: Expands the chart container to fill the entire monitor screen (Browser Fullscreen). _Only available for Main Chart._

### Configuration

Controls are configured via the `controls` object in `QFChartOptions` (for the main chart) or the options object in `addIndicator`.

```javascript
// Main Chart Configuration
const chart = new QFChart(container, {
  controls: {
    collapse: true, // Enable collapse button
    maximize: true, // Enable maximize pane button
    fullscreen: true, // Enable browser fullscreen button
  },
});

// Indicator Configuration
chart.addIndicator("MACD", plots, {
  isOverlay: false,
  controls: {
    collapse: true,
    maximize: true,
  },
});
```

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
