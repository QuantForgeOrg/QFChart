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
chart.addIndicator('SMA_14', plots, { isOverlay: true });

// Or add as separate pane
chart.addIndicator('RSI_14', plots, { isOverlay: false, height: 15 });
```

---

## Plot Styles

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

### 7. Shape (`style: 'shape'`)

Renders custom shapes at data points with extensive customization options. This is the most flexible plot style, supporting various shapes, sizes, text labels, and positioning modes.

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

chart.addIndicator('MACD_12_26_9', macdPlots, { isOverlay: false, height: 20 });
```

---

## Real-Time Updates

To update plot data incrementally (e.g., for WebSocket feeds), use the `updateData()` method:

```javascript
// Initial setup
const indicator = chart.addIndicator('RSI_14', rsiPlots, { isOverlay: false });

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

    - Use `isOverlay: true` for indicators that share the same scale as price (e.g., moving averages, Bollinger Bands)
    - Use `isOverlay: false` for oscillators with different ranges (e.g., RSI, MACD, Stochastic)

8. **Performance**: For high-frequency updates, minimize the number of separate indicators; combine plots into a single indicator when possible

---

## See Also

-   [API Reference](/api) - Detailed method documentation
-   [Layout & Customization](/layout) - Pane sizing and layout options
-   [Plugins](/plugins) - Interactive tools and extensions
