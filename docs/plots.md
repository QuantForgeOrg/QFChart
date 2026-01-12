---
layout: default
title: Plotting System
nav_order: 5
permalink: /plots
---

# Plotting System

QFChart's plotting system is designed to render technical indicators with flexible styling options. Each indicator consists of one or more **plots**, where each plot is a time-series of values with associated visual styling.

## Core Concepts

### Data Structure

An indicator is composed of:

-   **Indicator**: A collection of plots that represent a single technical indicator (e.g., MACD contains three plots: MACD line, signal line, and histogram)
-   **Plot**: A single visual series with a specific style (line, histogram, shape, etc.)
-   **Point**: An individual data point in a plot with a timestamp and value

#### TypeScript Interfaces

```typescript
interface IndicatorPoint {
    time: number; // Unix timestamp in milliseconds
    value: number | null; // Numeric value or null to skip rendering
    options?: {
        // Optional per-point styling overrides
        color?: string;
        offset?: number;
        // ... style-specific options
    };
}

interface IndicatorPlot {
    data: IndicatorPoint[];
    options: IndicatorOptions; // Global styling for this plot
}

interface Indicator {
    id: string; // Unique identifier
    plots: { [name: string]: IndicatorPlot };
    paneIndex: number; // 0 = main chart, >0 = separate pane
    height?: number; // Pane height in percentage (for separate panes)
    collapsed?: boolean;
}
```

### Adding Indicators

```javascript
const plots = {
    SMA: {
        data: [
            { time: 1620000000000, value: 50200 },
            { time: 1620086400000, value: 50300 },
            // ...
        ],
        options: {
            style: 'line',
            color: '#ff9900',
            linewidth: 2,
        },
    },
};

// Add as overlay on main chart
chart.addIndicator('SMA_14', plots, { overlay: true });

// Or add as separate pane
chart.addIndicator('RSI_14', plots, { overlay: false, height: 15 });
```

---

## Plot Styles

QFChart uses a unified plot structure where all plots have a `style` property. This differs from Pine Script, which uses separate functions (`plot()`, `plotshape()`, `plotchar()`, `plotcandle()`, `plotbar()`, `barcolor()`). In PineTS and QFChart:

-   `plot()` maps to styles like `'line'`, `'histogram'`, `'columns'`, `'step'`, `'circles'`, `'cross'`, `'background'`
-   `plotshape()` always creates plots with `style: 'shape'`
-   `plotchar()` always creates plots with `style: 'char'`
-   `plotcandle()` always creates plots with `style: 'candle'`
-   `plotbar()` always creates plots with `style: 'bar'`
-   `barcolor()` always creates plots with `style: 'barcolor'`
-   `fill()` creates plots with `style: 'fill'` (fills area between two plots)

This unified approach simplifies plot management and provides a consistent API across all visualization types.

---

### 1. Line (`style: 'line'`)

Renders data as a continuous line chart.

**Options:**

-   `color`: Line color (hex, rgb, or named color)
-   `linewidth`: Line thickness in pixels (default: 1)
-   `smooth`: Enable smooth curve interpolation (default: false)
-   `offset`: Horizontal offset in bars (positive = right, negative = left)

**Per-Point Options:**

-   `color`: Override color for a specific point (breaks line if `'na'` or `null`)

**Example:**

```javascript
const smaPlot = {
    data: [
        { time: 1620000000000, value: 50200 },
        { time: 1620086400000, value: 50300, options: { color: 'red' } }, // Override color
        { time: 1620172800000, value: null }, // Break line
        { time: 1620259200000, value: 50400 },
    ],
    options: {
        style: 'line',
        color: '#ff9900',
        linewidth: 2,
        smooth: true,
    },
};
```

**Behavior:**

-   Setting `value: null` creates a gap in the line
-   Setting `color: 'na'` (or `null`) also breaks the line
-   Smooth curves use spline interpolation

---

### 2. Step (`style: 'step'`)

Renders data as a step line (staircase pattern).

**Options:**

Same as `line`, but renders with horizontal + vertical segments instead of diagonal lines.

**Example:**

```javascript
const stepPlot = {
    data: [
        { time: 1620000000000, value: 1 },
        { time: 1620086400000, value: 1 },
        { time: 1620172800000, value: 2 },
        { time: 1620259200000, value: 2 },
    ],
    options: {
        style: 'step',
        color: '#00bcd4',
        linewidth: 1,
    },
};
```

---

### 3. Columns / Histogram (`style: 'columns'` or `style: 'histogram'`)

Renders data as vertical bars.

**Options:**

-   `color`: Default bar color
-   `offset`: Horizontal offset in bars

**Per-Point Options:**

-   `color`: Override color for individual bars

**Example:**

```javascript
const volumePlot = {
    data: [
        { time: 1620000000000, value: 1000, options: { color: 'green' } },
        { time: 1620086400000, value: 1500, options: { color: 'red' } },
        { time: 1620172800000, value: 1200, options: { color: 'green' } },
    ],
    options: {
        style: 'histogram',
        color: '#888888',
    },
};
```

**Behavior:**

-   Bars are centered on their timestamp
-   `null` values are not rendered (no bar)
-   Commonly used for volume or histogram-based indicators like MACD histogram

---

### 4. Circles (`style: 'circles'`)

Renders data as circular markers at each data point.

**Options:**

-   `color`: Marker color
-   `offset`: Horizontal offset in bars

**Per-Point Options:**

-   `color`: Override color for individual circles

**Example:**

```javascript
const pivotPlot = {
    data: [
        { time: 1620000000000, value: 50200 },
        { time: 1620259200000, value: 50400, options: { color: 'red' } },
    ],
    options: {
        style: 'circles',
        color: '#00ff00',
    },
};
```

**Behavior:**

-   Fixed size (6px diameter)
-   Only renders at data points (not interpolated)

---

### 5. Cross (`style: 'cross'`)

Renders data as cross ('+') markers at each data point.

**Options:**

-   `color`: Marker color
-   `offset`: Horizontal offset in bars

**Per-Point Options:**

-   `color`: Override color for individual crosses

**Example:**

```javascript
const signalPlot = {
    data: [
        { time: 1620000000000, value: 50200 },
        { time: 1620259200000, value: 50400, options: { color: 'red' } },
    ],
    options: {
        style: 'cross',
        color: '#ffff00',
    },
};
```

**Behavior:**

-   Fixed size (16px)
-   Useful for marking specific events or signals

---

### 6. Background (`style: 'background'`)

Fills the vertical space with a colored background for specific bars.

**Options:**

-   `color`: Default background color
-   `offset`: Horizontal offset in bars

**Per-Point Options:**

-   `color`: Override color for individual bars

**Example:**

```javascript
const trendPlot = {
    data: [
        { time: 1620000000000, value: 1, options: { color: 'rgba(0, 255, 0, 0.1)' } },
        { time: 1620086400000, value: 1, options: { color: 'rgba(0, 255, 0, 0.1)' } },
        { time: 1620172800000, value: 1, options: { color: 'rgba(255, 0, 0, 0.1)' } },
    ],
    options: {
        style: 'background',
        color: 'rgba(128, 128, 128, 0.1)',
    },
};
```

**Behavior:**

-   Fills entire vertical space of the pane/chart
-   `value` must be truthy (non-zero, non-null) for the background to render
-   Commonly used for trend zones or market regimes
-   Use semi-transparent colors (`rgba`) to avoid obscuring data

---

### 7. Char (`style: 'char'`)

Displays data values only in the tooltip/sidebar without any visual representation on the chart. This is useful for displaying auxiliary calculations, debug values, or statistics that don't need visual representation but should be accessible when hovering over the chart.

**Pine Script Equivalent:**

-   This style is automatically used when calling `plotchar()` in Pine Script indicators
-   When using PineTS, `plotchar()` will always force the plot style to `'char'`, regardless of other parameters
-   In manual plot definitions, you can explicitly set `style: 'char'` to achieve the same behavior
-   Note: Pine Script's `plot()` function does not accept `style="char"` - you must use the dedicated `plotchar()` function

**Options:**

-   `color`: Not used for rendering (invisible), but available for consistency
-   `offset`: Horizontal offset in bars

**Per-Point Options:**

-   `color`: Not used for rendering

**Example:**

```javascript
const volumeRatio = {
    data: [
        { time: 1620000000000, value: 1.25 },
        { time: 1620086400000, value: 0.85 },
        { time: 1620172800000, value: 1.42 },
        { time: 1620259200000, value: 0.93 },
    ],
    options: {
        style: 'char',
        color: '#888888', // Not rendered, but required
    },
};
```

**Behavior:**

-   No visual elements are rendered on the chart
-   Values appear in the tooltip when hovering over the corresponding bar
-   Useful for displaying calculations like volume ratios, percentages, or other derived metrics
-   Does not affect chart scaling or layout
-   Perfect for debugging or displaying reference data

**Use Cases:**

-   Volume ratio (current volume / average volume)
-   Price change percentage
-   Volatility metrics
-   Custom calculations that complement visual indicators
-   Debug values during indicator development

---

### 8. Bar (`style: 'bar'`)

Renders OHLC (Open, High, Low, Close) data as traditional bar charts with horizontal ticks. Each bar consists of a vertical line from low to high, with a left tick for open and a right tick for close.

**Pine Script Equivalent:**

-   This style is automatically used when calling `plotbar()` in Pine Script indicators
-   When using PineTS, `plotbar()` will always force the plot style to `'bar'`, regardless of other parameters
-   In manual plot definitions, you can explicitly set `style: 'bar'` to achieve the same behavior
-   Note: Pine Script's `plot()` function does not accept `style="bar"` - you must use the dedicated `plotbar()` function

**Data Format:**

For bar/candle styles, each data point's `value` must be an array of 4 numbers: `[open, high, low, close]`

**Options:**

-   `color`: Bar color (applied to the entire bar)
-   `wickcolor`: Optional separate color for the vertical line (defaults to `color` if not specified)
-   `offset`: Horizontal offset in bars

**Per-Point Options:**

-   `color`: Override bar color for a specific bar
-   `wickcolor`: Override wick color for a specific bar

**Example:**

```javascript
const heikinAshiBars = {
    data: [
        { time: 1620000000000, value: [50000, 51000, 49500, 50500] }, // [O, H, L, C]
        { time: 1620086400000, value: [50500, 51500, 50000, 51000] },
        { time: 1620172800000, value: [51000, 51200, 50200, 50300], options: { color: 'red' } },
        { time: 1620259200000, value: [50300, 50800, 49800, 50600], options: { color: 'green' } },
    ],
    options: {
        style: 'bar',
        color: '#888888',
        wickcolor: '#666666',
    },
};
```

**Behavior:**

-   Each bar shows the full OHLC range for a time period
-   Open tick extends to the left of the vertical line
-   Close tick extends to the right of the vertical line
-   Useful for Heikin Ashi, Renko, or other modified candlestick indicators

---

### 9. Candle (`style: 'candle'`)

Renders OHLC data as traditional candlesticks with filled bodies and wicks. This is identical to the main chart's candlestick rendering but can be used for overlay indicators like Heikin Ashi candles.

**Pine Script Equivalent:**

-   This style is automatically used when calling `plotcandle()` in Pine Script indicators
-   When using PineTS, `plotcandle()` will always force the plot style to `'candle'`, regardless of other parameters
-   In manual plot definitions, you can explicitly set `style: 'candle'` to achieve the same behavior
-   Note: Pine Script's `plot()` function does not accept `style="candle"` - you must use the dedicated `plotcandle()` function

**Data Format:**

For bar/candle styles, each data point's `value` must be an array of 4 numbers: `[open, high, low, close]`

**Options:**

-   `color`: Candle body fill color
-   `wickcolor`: Optional separate color for the wicks (high/low lines). Defaults to `color` if not specified
-   `bordercolor`: Optional separate color for the candle body border. Defaults to `wickcolor` if not specified
-   `offset`: Horizontal offset in bars

**Per-Point Options:**

-   `color`: Override body fill color for a specific candle
-   `wickcolor`: Override wick color for a specific candle
-   `bordercolor`: Override body border color for a specific candle

**Example:**

```javascript
const heikinAshiCandles = {
    data: [
        { time: 1620000000000, value: [50000, 51000, 49500, 50500] }, // [O, H, L, C]
        {
            time: 1620086400000,
            value: [50500, 51500, 50000, 51000],
            options: { color: 'green', wickcolor: 'darkgreen', bordercolor: 'lime' },
        },
        {
            time: 1620172800000,
            value: [51000, 51200, 50200, 50300],
            options: { color: 'red', wickcolor: 'darkred', bordercolor: 'orange' },
        },
    ],
    options: {
        style: 'candle',
        color: '#888888',
        wickcolor: '#666666',
        bordercolor: '#444444', // Optional: separate body border color
    },
};
```

**Behavior:**

-   Each candle consists of a rectangular body (open to close) and wicks (high/low lines)
-   Body is filled with the specified `color`
-   Body border uses `bordercolor` if specified, otherwise falls back to `wickcolor` or `color`
-   Wicks extend from the body to the high and low prices and use `wickcolor`
-   If open equals close (doji), a thin line is drawn
-   Perfect for displaying modified candlestick data like Heikin Ashi

**Use Cases:**

-   Heikin Ashi candles overlaid on regular candlesticks
-   Renko charts
-   Modified OHLC visualizations
-   Custom smoothed candlestick indicators

---

### 10. BarColor (`style: 'barcolor'`)

Applies colors to the main chart candlesticks without creating a visual series. This is a special plot type that modifies the appearance of existing candlesticks based on indicator conditions.

**Pine Script Equivalent:**

-   This style is automatically used when calling `barcolor()` in Pine Script indicators
-   When using PineTS, `barcolor()` will always force the plot style to `'barcolor'`, regardless of other parameters
-   In manual plot definitions, you can explicitly set `style: 'barcolor'` to achieve the same behavior
-   Note: Pine Script's `plot()` function does not accept `style="barcolor"` - you must use the dedicated `barcolor()` function

**Behavior:**

-   Does not create a visual series on the chart
-   Colors the main chart candlesticks (body, wicks, and borders)
-   Works regardless of whether the indicator is an overlay (`overlay: true/false`)
-   Honors the `offset` parameter to shift colors forward/backward in time
-   Only applies color when the value is truthy (non-zero, not null/false)
-   Color `'na'` or `null` means no color change for that bar

**Options:**

-   `color`: Color to apply to candlesticks
-   `offset`: Horizontal offset in bars (positive = shift right, negative = shift left)

**Per-Point Options:**

-   `color`: Override color for a specific bar

**Example:**

```javascript
const trendColor = {
    data: [
        { time: 1620000000000, value: 1, options: { color: 'green' } }, // Bullish - color candle green
        { time: 1620086400000, value: 1, options: { color: 'green' } },
        { time: 1620172800000, value: 0 }, // Neutral - no color change
        { time: 1620259200000, value: 1, options: { color: 'red' } }, // Bearish - color candle red
        { time: 1620345600000, value: 1, options: { color: 'red' } },
    ],
    options: {
        style: 'barcolor',
        color: '#888888', // Default color
    },
};

chart.addIndicator(
    'Trend Color',
    { trendColor },
    { overlay: false } // Works even when not overlay
);
```

**Use Cases:**

-   Color candles based on trend direction (bullish/bearish)
-   Highlight specific market conditions (volume spikes, momentum shifts)
-   Visualize custom indicators without cluttering the chart with additional plots
-   Create color-coded trading signals directly on candles
-   Combine with other indicators for multi-dimensional analysis

**Technical Notes:**

-   Multiple `barcolor` indicators can be used, but later ones will override earlier ones for the same bar
-   The color is applied to all parts of the candlestick: body fill, body border, and wicks
-   If no color is specified (value is falsy or color is `'na'`), the candle retains its default color

---

### 11. Shape (`style: 'shape'`)

Renders custom shapes at data points with extensive customization options. This is the most flexible plot style, supporting various shapes, sizes, text labels, and positioning modes.

**Pine Script Equivalent:**

-   This style is automatically used when calling `plotshape()` in Pine Script indicators
-   When using PineTS, `plotshape()` will always force the plot style to `'shape'`, regardless of other parameters
-   In manual plot definitions, you can explicitly set `style: 'shape'` to achieve the same behavior
-   Note: Pine Script's `plot()` function does not accept `style="shape"` - you must use the dedicated `plotshape()` function

**Options:**

-   `color`: Shape color (default: 'blue')
-   `shape`: Shape type (default: 'circle')
-   `size`: Shape size preset (default: 'normal')
-   `text`: Text label to display near the shape
-   `textcolor`: Text color (default: 'white')
-   `location`: Positioning mode (default: 'absolute')
-   `offset`: Horizontal offset in bars
-   `width`: Custom width in pixels (overrides `size`)
-   `height`: Custom height in pixels (overrides `size`)

**Per-Point Options:**

All global options can be overridden per-point:

-   `color`: Override shape color
-   `shape`: Override shape type
-   `size`: Override size preset
-   `text`: Override label text
-   `textcolor`: Override text color
-   `location`: Override positioning mode
-   `offset`: Override horizontal offset
-   `width`: Override width
-   `height`: Override height

---

#### Shape Types

| Shape          | Description                                        | Direction |
| -------------- | -------------------------------------------------- | --------- |
| `circle`       | Circular marker                                    | None      |
| `square`       | Square marker                                      | None      |
| `diamond`      | Diamond (rotated square)                           | None      |
| `triangleup`   | Triangle pointing upward                           | Up        |
| `triangledown` | Triangle pointing downward                         | Down      |
| `arrowup`      | Arrow pointing upward                              | Up        |
| `arrowdown`    | Arrow pointing downward                            | Down      |
| `flag`         | Flag marker                                        | None      |
| `cross`        | Cross ('+') marker                                 | None      |
| `xcross`       | X-shaped cross                                     | None      |
| `labelup`      | Rounded rectangle with upward pointer (for text)   | Up        |
| `labeldown`    | Rounded rectangle with downward pointer (for text) | Down      |

---

#### Size Presets

| Size     | Pixels | Use Case           |
| -------- | ------ | ------------------ |
| `tiny`   | 8px    | Subtle markers     |
| `small`  | 12px   | Compact charts     |
| `normal` | 16px   | Default (balanced) |
| `large`  | 24px   | Emphasis           |
| `huge`   | 32px   | Maximum visibility |
| `auto`   | 16px   | Alias for `normal` |

**Custom Dimensions:**

-   If both `width` and `height` are specified, they are used directly: `[width, height]`
-   If only `width` is specified, aspect ratio is preserved: `[width, width]`
-   If only `height` is specified, aspect ratio is preserved: `[height, height]`
-   If neither is specified, falls back to the `size` preset

---

#### Location Modes

The `location` parameter determines where shapes are positioned relative to the chart:

| Location   | Behavior                                                                                  | Value Condition           |
| ---------- | ----------------------------------------------------------------------------------------- | ------------------------- |
| `absolute` | Position at the exact `value` (Y-coordinate)                                              | Always renders            |
| `abovebar` | Position above the candle's high                                                          | Only if `value` is truthy |
| `belowbar` | Position below the candle's low                                                           | Only if `value` is truthy |
| `top`      | Position at the top of the chart (not implemented for dynamic axis yet - uses `value`)    | Only if `value` is truthy |
| `bottom`   | Position at the bottom of the chart (not implemented for dynamic axis yet - uses `value`) | Only if `value` is truthy |

**Key Point:**

-   For `abovebar` and `belowbar`, the shape only renders when `value` is **truthy** (non-zero, not null/false)
-   For `absolute`, the shape renders whenever a `value` is provided
-   This behavior makes shapes ideal for conditional signals and event markers

---

#### Text Label Positioning

Text labels are positioned relative to the shape based on the `location` parameter:

| Location   | Text Position     | Description                                    |
| ---------- | ----------------- | ---------------------------------------------- |
| `abovebar` | `top`             | Text appears above the shape                   |
| `belowbar` | `bottom`          | Text appears below the shape                   |
| `top`      | `bottom`          | Text appears below the shape (at chart top)    |
| `bottom`   | `top`             | Text appears above the shape (at chart bottom) |
| `absolute` | `top` or `inside` | `inside` for label shapes, `top` for others    |

---

#### Shape Examples

**Basic Buy/Sell Signals:**

```javascript
const buySignals = {
    data: [
        { time: 1620000000000, value: 1 }, // Show shape
        { time: 1620086400000, value: 0 }, // Hide shape
        { time: 1620172800000, value: 1 }, // Show shape
    ],
    options: {
        style: 'shape',
        shape: 'triangleup',
        color: 'green',
        size: 'small',
        location: 'belowbar', // Below the candle
    },
};

const sellSignals = {
    data: [
        { time: 1620086400000, value: 1 },
        { time: 1620259200000, value: 1 },
    ],
    options: {
        style: 'shape',
        shape: 'triangledown',
        color: 'red',
        size: 'small',
        location: 'abovebar', // Above the candle
    },
};
```

**With Text Labels:**

```javascript
const entrySignals = {
    data: [
        {
            time: 1620000000000,
            value: 1,
            options: {
                text: 'BUY',
                textcolor: 'white',
            },
        },
        {
            time: 1620259200000,
            value: 1,
            options: {
                text: 'SELL',
                textcolor: 'yellow',
            },
        },
    ],
    options: {
        style: 'shape',
        shape: 'labelup',
        color: 'green',
        size: 'large',
        location: 'belowbar',
    },
};
```

**Per-Point Shape Overrides:**

```javascript
const dynamicSignals = {
    data: [
        {
            time: 1620000000000,
            value: 1,
            options: {
                shape: 'arrowup',
                color: 'lime',
                size: 'huge',
                text: 'Strong Buy',
            },
        },
        {
            time: 1620086400000,
            value: 1,
            options: {
                shape: 'triangleup',
                color: 'green',
                size: 'small',
                text: 'Buy',
            },
        },
        {
            time: 1620172800000,
            value: 1,
            options: {
                shape: 'arrowdown',
                color: 'red',
                size: 'huge',
                text: 'Strong Sell',
            },
        },
    ],
    options: {
        style: 'shape',
        shape: 'circle',
        color: 'blue',
        size: 'normal',
        location: 'absolute',
        text: 'Signal',
        textcolor: 'white',
    },
};
```

**Custom Dimensions:**

```javascript
const customShapes = {
    data: [
        {
            time: 1620000000000,
            value: 50200,
            options: {
                width: 40, // 40px wide
                height: 20, // 20px tall (non-uniform)
            },
        },
        {
            time: 1620086400000,
            value: 50300,
            options: {
                height: 60, // 60px tall (will be 60x60 square)
            },
        },
    ],
    options: {
        style: 'shape',
        shape: 'square',
        color: 'purple',
        size: 'normal', // Fallback if width/height not specified
        location: 'absolute',
    },
};
```

---

### 12. Fill (`style: 'fill'`)

Fills the area between two existing plots with a color. This is commonly used for Bollinger Bands, Keltner Channels, or any indicator with upper/lower bounds.

**Special Structure:**

Unlike other plot styles, fill plots **do not have a `data` array**. Instead, they reference two existing plots using `plot1` and `plot2`:

```javascript
{
    plot1: 'upperPlotId',  // Reference to first plot
    plot2: 'lowerPlotId',  // Reference to second plot
    options: {
        style: 'fill',
        color: 'rgba(33, 150, 243, 0.2)'
    }
}
```

**Options:**

-   `color`: Fill color (supports hex, named colors, or rgba with transparency)
-   `plot1`: ID of the first plot to fill from (required)
-   `plot2`: ID of the second plot to fill to (required)

**Example: Bollinger Bands with Fill**

```javascript
const bbPlots = {
    upper: {
        data: [
            { time: 1620000000000, value: 50500 },
            { time: 1620086400000, value: 50700 },
            { time: 1620172800000, value: 50900 },
        ],
        options: {
            style: 'line',
            color: '#2196F3',
            linewidth: 1,
        },
    },
    basis: {
        data: [
            { time: 1620000000000, value: 50000 },
            { time: 1620086400000, value: 50200 },
            { time: 1620172800000, value: 50400 },
        ],
        options: {
            style: 'line',
            color: '#FFC107',
            linewidth: 2,
        },
    },
    lower: {
        data: [
            { time: 1620000000000, value: 49500 },
            { time: 1620086400000, value: 49700 },
            { time: 1620172800000, value: 49900 },
        ],
        options: {
            style: 'line',
            color: '#2196F3',
            linewidth: 1,
        },
    },
    // Fill between upper and lower bands
    fill: {
        plot1: 'upper',
        plot2: 'lower',
        options: {
            style: 'fill',
            color: 'rgba(33, 150, 243, 0.2)', // Semi-transparent blue
        },
    },
};

chart.addIndicator('BB_20', bbPlots, { overlay: true });
```

**Color Formats:**

All of the following are valid:

```javascript
// RGBA with custom transparency (recommended for fills)
color: 'rgba(255, 87, 34, 0.3)'  // 30% opacity

// Hex color (defaults to 30% opacity)
color: '#FF5722'

// Named color (defaults to 30% opacity)
color: 'green'

// RGB without alpha (defaults to 30% opacity)
color: 'rgb(255, 87, 34)'
```

**Opacity Handling:**

-   When using `rgba()` format, the alpha channel value is extracted and used as the fill opacity
-   For hex colors, named colors, or `rgb()` format, a default opacity of `0.3` (30%) is applied
-   Example: `rgba(33, 150, 243, 0.95)` renders with 95% opacity
-   Example: `#2196F3` renders with 30% opacity (default)

**Requirements:**

1. Both `plot1` and `plot2` must reference existing plot IDs within the same indicator
2. Referenced plots are processed first, then fill plots are created
3. Both plots must be on the same pane (overlay or separate)
4. If either plot has `null` at any point, the fill is skipped for that segment

**Behavior:**

-   Fill renders at `z: -5` (behind lines, above background)
-   Creates smooth, continuous area fill between lines (like TradingView's Bollinger Bands)
-   Each segment is rendered as a polygon connecting consecutive points for smooth transitions
-   Automatically handles gaps in data - no fill is rendered where data is missing
-   Supports any combination of plot styles (line, step, etc.)

**Example: Keltner Channels**

```javascript
const kcPlots = {
    upper: {
        data: upperData,
        options: { style: 'line', color: '#4CAF50', linewidth: 1 },
    },
    middle: {
        data: middleData,
        options: { style: 'line', color: '#FFC107', linewidth: 2 },
    },
    lower: {
        data: lowerData,
        options: { style: 'line', color: '#F44336', linewidth: 1 },
    },
    fill1: {
        plot1: 'middle',
        plot2: 'upper',
        options: { style: 'fill', color: 'rgba(76, 175, 80, 0.15)' },
    },
    fill2: {
        plot1: 'middle',
        plot2: 'lower',
        options: { style: 'fill', color: 'rgba(244, 67, 54, 0.15)' },
    },
};

chart.addIndicator('KC_20', kcPlots, { overlay: true });
```

---

## Per-Point Overrides

All plot styles support per-point styling through the `options` field in each `IndicatorPoint`. This allows dynamic coloring and styling based on conditions (e.g., green for bullish, red for bearish).

### Color Overrides

```javascript
const macdHistogram = {
    data: [
        { time: 1620000000000, value: 10, options: { color: 'green' } },
        { time: 1620086400000, value: 15, options: { color: 'green' } },
        { time: 1620172800000, value: -5, options: { color: 'red' } },
        { time: 1620259200000, value: -10, options: { color: 'red' } },
    ],
    options: {
        style: 'histogram',
        color: '#888888', // Fallback color
    },
};
```

### Offset Overrides

```javascript
const displacedMA = {
    data: [
        { time: 1620000000000, value: 50200, options: { offset: 5 } }, // Shift 5 bars right
        { time: 1620086400000, value: 50300, options: { offset: 5 } },
    ],
    options: {
        style: 'line',
        color: '#ff9900',
        offset: 0, // Default offset
    },
};
```

### Breaking Lines

To create gaps in line plots (e.g., for missing data or conditional rendering):

```javascript
const conditionalLine = {
    data: [
        { time: 1620000000000, value: 50200 },
        { time: 1620086400000, value: 50300, options: { color: 'na' } }, // Break line
        { time: 1620172800000, value: null }, // Also breaks line
        { time: 1620259200000, value: 50400 },
    ],
    options: {
        style: 'line',
        color: '#00bcd4',
    },
};
```

---

## Multi-Plot Indicators

Many technical indicators consist of multiple plots. For example, MACD has three components:

```javascript
const macdPlots = {
    macd: {
        data: [
            { time: 1620000000000, value: 5.2 },
            { time: 1620086400000, value: 6.1 },
            // ...
        ],
        options: {
            style: 'line',
            color: '#2196F3',
            linewidth: 2,
        },
    },
    signal: {
        data: [
            { time: 1620000000000, value: 4.8 },
            { time: 1620086400000, value: 5.5 },
            // ...
        ],
        options: {
            style: 'line',
            color: '#FF9800',
            linewidth: 2,
        },
    },
    histogram: {
        data: [
            { time: 1620000000000, value: 0.4, options: { color: 'green' } },
            { time: 1620086400000, value: 0.6, options: { color: 'green' } },
            // ...
        ],
        options: {
            style: 'histogram',
            color: '#888888',
        },
    },
};

chart.addIndicator('MACD_12_26_9', macdPlots, { overlay: false, height: 20 });
```

---

## Real-Time Updates

To update plot data incrementally (e.g., for WebSocket feeds), use the `updateData()` method:

```javascript
// Initial setup
const indicator = chart.addIndicator('RSI_14', rsiPlots, { overlay: false });

// Later: update with new data
function onNewBar(bar, indicators) {
    // Update indicator first
    indicator.updateData(indicators.rsiPlots);

    // Then update chart
    chart.updateData([bar]);
}
```

**Key Points:**

-   Always update indicators **before** calling `chart.updateData()`
-   `updateData()` merges data by timestamp (updates existing or appends new)
-   Much more efficient than `setMarketData()` for incremental updates

---

## Best Practices

1. **Use `null` values** to skip rendering for specific points instead of removing them from the data array (maintains time alignment)

2. **Color consistency**: Use a consistent color scheme across related plots (e.g., green for bullish, red for bearish)

3. **Per-point overrides**: Use sparingly for conditional styling; avoid overriding every point (defeats the purpose of global options)

4. **Shape locations**: For signal-based shapes (`abovebar`, `belowbar`), use `value: 1` to show and `value: 0` to hide

5. **Text labels**: Keep text short (2-5 characters) for clarity; use `labelup`/`labeldown` shapes for better text visibility

6. **Custom dimensions**: Use `width` and `height` for non-uniform shapes (e.g., wide rectangles); omit both to use standard size presets

7. **Overlay vs. Separate Pane**:

    - Use `overlay: true` for indicators that share the same scale as price (e.g., moving averages, Bollinger Bands)
    - Use `overlay: false` for oscillators with different ranges (e.g., RSI, MACD, Stochastic)
    - **Plot-level override**: Individual plots can override the indicator's overlay setting using `plot.options.overlay`

    ```javascript
    // MACD indicator with histogram in separate pane but signal lines as overlay
    chart.addIndicator(
        'MACD',
        {
            histogram: {
                data: histogramData,
                options: { style: 'histogram', color: '#888', overlay: false }, // Stays in separate pane
            },
            macdLine: {
                data: macdData,
                options: { style: 'line', color: '#2962FF', overlay: true }, // Overrides to main chart
            },
            signalLine: {
                data: signalData,
                options: { style: 'line', color: '#FF6D00', overlay: true }, // Overrides to main chart
            },
        },
        { overlay: false, height: 15 }
    ); // Indicator default is separate pane
    ```

8. **Performance**: For high-frequency updates, minimize the number of separate indicators; combine plots into a single indicator when possible

---

## See Also

-   [API Reference](/api) - Detailed method documentation
-   [Layout & Customization](/layout) - Pane sizing and layout options
-   [Plugins](/plugins) - Interactive tools and extensions
