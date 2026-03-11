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
        position: 'floating';
    }
    ```

2. **Sidebar (Left/Right)**

    - Dedicates a fixed sidebar (250px) for data display.
    - Chart automatically resizes to fill remaining width.
    - Prevents the databox from obscuring the chart data.
    - Ideal for desktop views with detailed indicators.

    ```javascript
    databox: {
        position: 'left'; // or 'right'
    }
    ```

### Trigger Behavior

Control when the databox and crosshair appear:

```javascript
databox: {
    position: 'floating',
    triggerOn: 'mousemove' // 'mousemove', 'click', or 'none'
}
```

-   **`mousemove` (default)**: Tooltip and crosshair follow mouse movement (desktop behavior)
-   **`click`**: Tooltip and crosshair appear only when user clicks/taps (mobile-friendly). Automatically hides when dragging the chart.
-   **`none`**: Disable tooltip and crosshair entirely

**Example for mobile devices**:

```javascript
const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

databox: {
    position: 'floating',
    triggerOn: isMobile ? 'click' : 'mousemove' // Tap on mobile, hover on desktop
}
```

## Multi-Pane Indicators

When adding indicators with `overlay: false`, QFChart automatically manages vertical stacking.

### Independent Heights

You can specify the height of each indicator pane as a percentage of the total container height.

```javascript
// Add RSI with 15% height
chart.addIndicator('RSI', rsiPlots, {
    overlay: false,
    height: 15,
});

// Add MACD with 20% height
chart.addIndicator('MACD', macdPlots, {
    overlay: false,
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

-   **Collapse (`+` / `−`)**: Minimizes the pane to a small strip, giving more space to other panes.
-   **Maximize (`□` / `❐`)**: Expands the pane to fill the entire chart container (viewport), hiding other panes.
-   **Fullscreen (`⛶`)**: Expands the chart container to fill the entire monitor screen (Browser Fullscreen). _Only available for Main Chart._

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
chart.addIndicator('MACD', plots, {
    overlay: false,
    controls: {
        collapse: true,
        maximize: true,
    },
});
```

## Y-Axis Configuration

QFChart provides flexible Y-axis configuration options to control how price scales are displayed.

### Y-Axis Padding

Adds breathing room above and below the visible data range to prevent candles from touching the chart edges.

```javascript
const chart = new QFChart(container, {
    yAxisPadding: 5, // 5% padding above and below (default)
});
```

**Behavior**:

-   If the visible range is 87,000-89,000 (range = 2,000)
-   With 5% padding, adds 100 points above and below
-   Displayed range becomes 86,900-89,100

**Typical Values**:

-   `2-3`: Minimal padding (compact view)
-   `5`: Default (recommended for most cases)
-   `10-15`: Generous padding (more white space)

### Fixed Y-Axis Range

Lock the Y-axis to specific min/max values instead of auto-scaling.

```javascript
// Example 1: Fixed range (e.g., for percentage indicators)
const chart = new QFChart(container, {
    yAxisMin: 0,
    yAxisMax: 100,
});

// Example 2: Fixed minimum, auto maximum
const chart = new QFChart(container, {
    yAxisMin: 80000, // Never go below 80,000
    yAxisMax: 'auto', // Adjust max dynamically
    yAxisPadding: 5, // Still applies 5% padding to max
});

// Example 3: Fixed maximum, auto minimum
const chart = new QFChart(container, {
    yAxisMin: 'auto', // Adjust min dynamically
    yAxisMax: 100000, // Never exceed 100,000
});
```

**Use Cases**:

-   **Percentage indicators**: Lock to 0-100 range
-   **Price alerts**: Keep specific price levels always visible
-   **Comparison charts**: Maintain consistent scale across multiple charts
-   **Focus zones**: Zoom into specific price ranges of interest

**Important Notes**:

-   Custom min/max values apply **only to the main candlestick chart**
-   Separate indicator panes (MACD, RSI, etc.) always auto-scale
-   When using fixed values, `yAxisPadding` is ignored for that boundary
-   Use `'auto'` or omit the option to restore automatic scaling

### Y-Axis Format

Control how values are displayed on the Y-axis scale.

#### Auto-Detection (Default)

By default, QFChart automatically detects the appropriate number of decimal places based on the market data.
- For assets like BTC (~97,000), it uses 2 decimals.
- For assets like PUMP (~0.002), it automatically increases precision (e.g., 6-8 decimals) to ensure values are readable.

#### Manual Override

You can override the auto-detection by specifying a fixed number of decimal places or a custom formatter.

```javascript
// Option 1: Set fixed decimal places (overrides auto-detection)
const chart = new QFChart(container, {
    yAxisDecimalPlaces: 2, // Forces 2 decimals (e.g. "123.45") regardless of price
});

// Option 2: Custom formatter function
const chart = new QFChart(container, {
    yAxisLabelFormatter: (value) => {
        return '$' + value.toFixed(2); // Displays "$123.45"
    },
});
```

**Use Cases**:

-   **Crypto**: Leave undefined for auto-detection, or set 8 for specific low-sat assets
-   **Forex**: Set 5 decimal places (`yAxisDecimalPlaces: 5`)
-   **Stocks**: Set 2 decimal places (`yAxisDecimalPlaces: 2`)
-   **Volume**: Format large numbers (e.g., "1.5M") using a custom formatter

## Last Price Line & Countdown

Display a horizontal line tracking the current price, with an optional countdown to bar close.

```javascript
const chart = new QFChart(container, {
    // Configure the price line
    lastPriceLine: {
        visible: true,
        color: '#3b82f6', // Optional: fixed color (defaults to candle color)
        lineStyle: 'dashed', // 'solid', 'dashed', or 'dotted'
        showCountdown: true, // Enable countdown timer
    },
    // REQUIRED for countdown: specify bar duration in milliseconds
    interval: 60 * 1000, // 1 minute
});
```

**Features**:

-   **Dynamic Position**: Updates automatically with every `updateData()` call.
-   **Auto-Color**: If `color` is omitted, line turns green/red based on current candle direction.
-   **Countdown**: Calculates time remaining based on `interval` and current time. Requires continuous updates or at least one update per bar.

## DataZoom Control

The zoom slider allows users to navigate history.

```javascript
dataZoom: {
    visible: true,
    position: 'top', // 'top' or 'bottom'
    height: 6,       // Height in %
    start: 80,       // Start at 80% of data range
    end: 100,        // End at 100% of data range
    zoomOnTouch: true // Enable pan/drag on touch devices (default: true)
}
```

-   **Top**: Places slider at the very top. Chart starts below.
-   **Bottom**: Places slider at the bottom.
-   **Hidden**: Set `visible: false` to control zoom only via mouse wheel/drag.
-   **zoomOnTouch**: Controls whether touch/pan gestures zoom/drag the chart. Set to `false` on mobile to avoid conflicts with tooltip interactions.

### Mobile-Friendly Configuration

For better mobile experience, disable inside zoom to prevent conflicts between dragging and viewing tooltips:

```javascript
// Detect mobile device
const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

const chart = new QFChart(container, {
    dataZoom: {
        visible: true,
        position: 'top',
        zoomOnTouch: !isMobile, // Disable pan/drag on mobile, use slider only
    },
    databox: {
        position: 'floating',
        triggerOn: isMobile ? 'click' : 'mousemove', // Tap on mobile, hover on desktop
    },
});
```

This configuration ensures:

-   **Mobile users** can tap to see values without accidentally dragging the chart
-   **Mobile users** can still zoom using the slider
-   **Desktop users** get smooth hover-to-view and drag-to-pan experience
-   **Auto-hide on drag**: When using `triggerOn: 'click'`, the tooltip automatically hides when the user starts dragging the chart

## Grid Styling

Control the visibility and appearance of the chart grid lines and axis borders.

```javascript
const chart = new QFChart(container, {
    grid: {
        show: false,          // Show/hide horizontal split lines (default: false)
        lineColor: '#334155', // Split line color (default: '#334155')
        lineOpacity: 0.5,     // Split line opacity (default: 0.5)
        borderColor: '#334155', // Axis border line color (default: '#334155')
        borderShow: false,    // Show/hide axis border lines (default: false)
    },
});
```

### Properties

| Property      | Type      | Default      | Description                                                                 |
| ------------- | --------- | ------------ | --------------------------------------------------------------------------- |
| `show`        | `boolean` | `false`      | Show or hide horizontal split lines across the chart area.                  |
| `lineColor`   | `string`  | `'#334155'`  | Color of the horizontal split lines.                                        |
| `lineOpacity` | `number`  | `0.5`        | Opacity of split lines (0–1). Indicator panes use 60% of this value.        |
| `borderColor` | `string`  | `'#334155'`  | Color of the axis border lines (edges of the chart area).                   |
| `borderShow`  | `boolean` | `false`      | Show or hide axis border lines.                                             |

### Examples

**Enable grid lines**:

```javascript
grid: { show: true, borderShow: true }
```

**Subtle grid** (lighter lines):

```javascript
grid: { show: true, lineColor: '#ffffff', lineOpacity: 0.1 }
```

**High-contrast grid**:

```javascript
grid: { show: true, lineColor: '#475569', lineOpacity: 0.8, borderColor: '#64748b', borderShow: true }
```

## Chart Margins

Control the left and right margins of the chart area, and pane sizing.

```javascript
const chart = new QFChart(container, {
    layout: {
        left: '10%',   // Left margin (default: '10%')
        right: '10%',  // Right margin (default: '10%')
    },
});
```

### Properties

| Property         | Type     | Default  | Description                                          |
| ---------------- | -------- | -------- | ---------------------------------------------------- |
| `left`           | `string` | `'10%'`  | Left margin of the chart grid area (CSS-like value).  |
| `right`          | `string` | `'10%'`  | Right margin of the chart grid area (CSS-like value). |
| `mainPaneHeight` | `string` | auto     | Explicit height for the main pane (e.g. `'60%'`).    |
| `gap`            | `number` | ~5%      | Gap between panes as a percentage.                    |

### Examples

**Wider chart** (smaller margins):

```javascript
layout: { left: '5%', right: '5%' }
```

**Fixed pixel margins**:

```javascript
layout: { left: '60px', right: '80px' }
```

**Asymmetric** (more room for Y-axis labels on the right):

```javascript
layout: { left: '5%', right: '12%' }
