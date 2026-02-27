---
layout: default
title: Drawing Objects
nav_order: 6
permalink: /drawing-objects
---

# Drawing Objects

QFChart supports three types of drawing objects that overlay the chart: **labels**, **lines**, and **linefills**. Unlike plot styles (which display time-series data), drawing objects are positioned at specific coordinates and are ideal for annotations, trend lines, support/resistance levels, and filled regions.

## Overview

Drawing objects use reserved plot keys in the indicator's `plots` object:

| Object Type | Plot Key | Style | Description |
|---|---|---|---|
| Labels | `__labels__` | `'label'` | Text annotations with bubble/shape markers |
| Lines | `__lines__` | `'drawing_line'` | Line segments between two points |
| Linefills | `__linefills__` | `'linefill'` | Filled polygons between two lines |

All drawing objects are rendered as **overlays** on the main chart pane by default.

---

## Data Format

Drawing objects differ from regular plots in a key way: instead of one data point per timestamp, all objects are stored as **a single array** in one data entry. This is because multiple drawing objects can share the same timestamp (e.g., several lines created at bar 0), and storing them separately would cause only the last one to survive in the sparse data array.

```javascript
// General pattern for all drawing objects
'__plotKey__': {
    data: [{
        time: marketData[0].time,       // Timestamp of the first bar
        value: [ /* array of objects */ ],
        options: { style: '...' }
    }],
    options: { style: '...', overlay: true }
}
```

---

## Labels (`style: 'label'`)

Labels display text annotations with customizable shapes, colors, and positioning. They can be placed at exact price levels or relative to candle highs/lows.

### Label Object Properties

| Property | Type | Default | Description |
|---|---|---|---|
| `x` | `number` | — | Bar index (0-based position in market data) |
| `y` | `number` | — | Price value (Y-coordinate) |
| `text` | `string` | `''` | Text to display |
| `xloc` | `string` | `'bar_index'` | X-axis mode: `'bar_index'` |
| `yloc` | `string` | `'price'` | Y-axis mode: `'price'`, `'abovebar'`, or `'belowbar'` |
| `color` | `string` | `'#2962ff'` | Background/shape color |
| `style` | `string` | `'style_label_down'` | Label style (see table below) |
| `textcolor` | `string` | `'#ffffff'` | Text color |
| `size` | `string` | `'normal'` | Size: `'tiny'`, `'small'`, `'normal'`, `'large'`, `'huge'` |
| `textalign` | `string` | `'align_center'` | Text alignment: `'align_left'`, `'align_center'`, `'align_right'` |
| `tooltip` | `string` | `''` | Tooltip text on hover |
| `_deleted` | `boolean` | `false` | Set to `true` to hide the label |

### Label Styles

| Style | Description |
|---|---|
| `style_label_down` | Bubble with downward pointer (default) |
| `style_label_up` | Bubble with upward pointer |
| `style_label_left` | Bubble with left pointer |
| `style_label_right` | Bubble with right pointer |
| `style_circle` | Circle marker |
| `style_square` | Square marker |
| `style_diamond` | Diamond marker |
| `style_flag` | Flag marker |
| `style_arrowup` | Upward arrow |
| `style_arrowdown` | Downward arrow |
| `style_cross` | Cross (+) marker |
| `style_xcross` | X-cross marker |
| `style_triangleup` | Upward triangle |
| `style_triangledown` | Downward triangle |
| `style_none` | No shape (text only) |
| `style_text_outline` | Text outline (no shape) |

### Y-Location Modes

| Mode | Behavior |
|---|---|
| `price` | Positioned at the exact `y` value |
| `abovebar` | Positioned above the candle's high (ignores `y`) |
| `belowbar` | Positioned below the candle's low (ignores `y`) |

### Example: Basic Labels

```javascript
const marketData = [
    { time: 1620000000000, open: 50000, high: 51000, low: 49000, close: 50500, volume: 100 },
    { time: 1620086400000, open: 50500, high: 52000, low: 50000, close: 51500, volume: 120 },
    { time: 1620172800000, open: 51500, high: 53000, low: 51000, close: 52500, volume: 150 },
    { time: 1620259200000, open: 52500, high: 53500, low: 51500, close: 52000, volume: 130 },
    { time: 1620345600000, open: 52000, high: 52500, low: 50500, close: 51000, volume: 110 },
];

chart.setMarketData(marketData);

const plots = {
    __labels__: {
        data: [{
            time: marketData[0].time,
            value: [
                {
                    x: 1, y: 52000,
                    text: 'BUY',
                    xloc: 'bar_index',
                    yloc: 'price',
                    color: '#26a69a',
                    style: 'style_label_up',
                    textcolor: '#ffffff',
                    size: 'normal',
                    _deleted: false,
                },
                {
                    x: 4, y: 51000,
                    text: 'SELL',
                    xloc: 'bar_index',
                    yloc: 'price',
                    color: '#ef5350',
                    style: 'style_label_down',
                    textcolor: '#ffffff',
                    size: 'normal',
                    _deleted: false,
                },
            ],
            options: { style: 'label' },
        }],
        options: { style: 'label', overlay: true },
    },
};

chart.addIndicator('signals', plots, { overlay: true });
```

### Example: Labels Above/Below Bars

When using `yloc: 'abovebar'` or `yloc: 'belowbar'`, the label is positioned relative to the candle's high or low. The `y` value is ignored.

```javascript
const plots = {
    __labels__: {
        data: [{
            time: marketData[0].time,
            value: [
                {
                    x: 1,
                    y: 0,  // Ignored when yloc is 'abovebar'
                    text: '▲',
                    xloc: 'bar_index',
                    yloc: 'belowbar',
                    color: '#26a69a',
                    style: 'style_none',
                    textcolor: '#26a69a',
                    size: 'large',
                    _deleted: false,
                },
                {
                    x: 4,
                    y: 0,  // Ignored when yloc is 'belowbar'
                    text: '▼',
                    xloc: 'bar_index',
                    yloc: 'abovebar',
                    color: '#ef5350',
                    style: 'style_none',
                    textcolor: '#ef5350',
                    size: 'large',
                    _deleted: false,
                },
            ],
            options: { style: 'label' },
        }],
        options: { style: 'label', overlay: true },
    },
};

chart.addIndicator('arrows', plots, { overlay: true });
```

### Example: Price Annotations with Tooltips

```javascript
const plots = {
    __labels__: {
        data: [{
            time: marketData[0].time,
            value: [
                {
                    x: 2, y: 53000,
                    text: 'ATH',
                    xloc: 'bar_index',
                    yloc: 'price',
                    color: '#ff9800',
                    style: 'style_label_down',
                    textcolor: '#ffffff',
                    size: 'large',
                    textalign: 'align_center',
                    tooltip: 'All-Time High reached on this bar',
                    _deleted: false,
                },
            ],
            options: { style: 'label' },
        }],
        options: { style: 'label', overlay: true },
    },
};

chart.addIndicator('annotations', plots, { overlay: true });
```

---

## Lines (`style: 'drawing_line'`)

Lines draw segments between two points on the chart. They support dashed/dotted styles, arrow heads, and can be extended to the chart edges.

{: .note }
The style name is `'drawing_line'` (not `'line'`). The `'line'` style is used by regular plot series. This distinction prevents conflicts between indicator lines and drawing lines.

### Line Object Properties

| Property | Type | Default | Description |
|---|---|---|---|
| `x1` | `number` | — | Start bar index (0-based) |
| `y1` | `number` | — | Start price value |
| `x2` | `number` | — | End bar index (0-based) |
| `y2` | `number` | — | End price value |
| `xloc` | `string` | `'bar_index'` | X-axis mode: `'bar_index'` |
| `extend` | `string` | `'none'` | Line extension: `'none'`, `'left'`, `'right'`, `'both'` |
| `color` | `string` | `'#2962ff'` | Line color |
| `style` | `string` | `'style_solid'` | Line style (see table below) |
| `width` | `number` | `1` | Line width in pixels |
| `_deleted` | `boolean` | `false` | Set to `true` to hide the line |

### Line Styles

| Style | Description |
|---|---|
| `style_solid` | Solid line (default) |
| `style_dotted` | Dotted line |
| `style_dashed` | Dashed line |
| `style_arrow_left` | Solid line with arrow at start point |
| `style_arrow_right` | Solid line with arrow at end point |
| `style_arrow_both` | Solid line with arrows at both ends |

### Extend Modes

| Mode | Description |
|---|---|
| `none` | Line only between (x1,y1) and (x2,y2) |
| `left` | Extends infinitely to the left from (x1,y1) |
| `right` | Extends infinitely to the right from (x2,y2) |
| `both` | Extends infinitely in both directions |

### Example: Trend Lines

```javascript
const marketData = [
    { time: 1620000000000, open: 50000, high: 51000, low: 49000, close: 50500, volume: 100 },
    { time: 1620086400000, open: 50500, high: 52000, low: 50000, close: 51500, volume: 120 },
    { time: 1620172800000, open: 51500, high: 53000, low: 51000, close: 52500, volume: 150 },
    { time: 1620259200000, open: 52500, high: 53500, low: 51500, close: 52000, volume: 130 },
    { time: 1620345600000, open: 52000, high: 52500, low: 50500, close: 51000, volume: 110 },
];

chart.setMarketData(marketData);

const plots = {
    __lines__: {
        data: [{
            time: marketData[0].time,
            value: [
                // Uptrend line connecting lows
                {
                    x1: 0, y1: 49000,
                    x2: 2, y2: 51000,
                    xloc: 'bar_index',
                    extend: 'right',
                    color: '#26a69a',
                    style: 'style_solid',
                    width: 2,
                    _deleted: false,
                },
                // Horizontal resistance level
                {
                    x1: 0, y1: 53000,
                    x2: 4, y2: 53000,
                    xloc: 'bar_index',
                    extend: 'none',
                    color: '#ef5350',
                    style: 'style_dashed',
                    width: 1,
                    _deleted: false,
                },
            ],
            options: { style: 'drawing_line' },
        }],
        options: { style: 'drawing_line', overlay: true },
    },
};

chart.addIndicator('trendlines', plots, { overlay: true });
```

### Example: Arrow Lines

```javascript
const plots = {
    __lines__: {
        data: [{
            time: marketData[0].time,
            value: [
                // Arrow pointing to a price move
                {
                    x1: 1, y1: 50000,
                    x2: 3, y2: 53500,
                    xloc: 'bar_index',
                    extend: 'none',
                    color: '#26a69a',
                    style: 'style_arrow_right',
                    width: 2,
                    _deleted: false,
                },
                // Bidirectional arrow showing range
                {
                    x1: 0, y1: 48000,
                    x2: 4, y2: 48000,
                    xloc: 'bar_index',
                    extend: 'none',
                    color: '#7e57c2',
                    style: 'style_arrow_both',
                    width: 1,
                    _deleted: false,
                },
            ],
            options: { style: 'drawing_line' },
        }],
        options: { style: 'drawing_line', overlay: true },
    },
};

chart.addIndicator('arrows', plots, { overlay: true });
```

### Example: Support & Resistance with Extended Lines

```javascript
const plots = {
    __lines__: {
        data: [{
            time: marketData[0].time,
            value: [
                // Support level (extends both directions)
                {
                    x1: 0, y1: 49000,
                    x2: 1, y2: 49000,
                    xloc: 'bar_index',
                    extend: 'both',
                    color: '#26a69a',
                    style: 'style_dotted',
                    width: 1,
                    _deleted: false,
                },
                // Resistance level (extends both directions)
                {
                    x1: 0, y1: 53500,
                    x2: 1, y2: 53500,
                    xloc: 'bar_index',
                    extend: 'both',
                    color: '#ef5350',
                    style: 'style_dotted',
                    width: 1,
                    _deleted: false,
                },
            ],
            options: { style: 'drawing_line' },
        }],
        options: { style: 'drawing_line', overlay: true },
    },
};

chart.addIndicator('levels', plots, { overlay: true });
```

---

## Linefills (`style: 'linefill'`)

Linefills fill the area between two line objects with a colored polygon. They are useful for highlighting price channels, ranges, or zones between trend lines.

### Linefill Object Properties

| Property | Type | Default | Description |
|---|---|---|---|
| `line1` | `object` | — | First line object (same structure as a line) |
| `line2` | `object` | — | Second line object (same structure as a line) |
| `color` | `string` | `'rgba(128, 128, 128, 0.2)'` | Fill color (supports rgba for transparency) |
| `_deleted` | `boolean` | `false` | Set to `true` to hide the linefill |

The `line1` and `line2` properties must be full line objects (with `x1`, `y1`, `x2`, `y2`, `xloc`, `extend`, etc.). The linefill renderer reads the line coordinates directly from these objects.

{: .note }
The lines referenced by a linefill do not need to be separately added as `__lines__` entries. The linefill renderer extracts coordinates directly from the embedded line objects. However, if you want the lines themselves to be visible, you should also add them to `__lines__`.

### Example: Price Channel Fill

```javascript
const marketData = [
    { time: 1620000000000, open: 50000, high: 51000, low: 49000, close: 50500, volume: 100 },
    { time: 1620086400000, open: 50500, high: 52000, low: 50000, close: 51500, volume: 120 },
    { time: 1620172800000, open: 51500, high: 53000, low: 51000, close: 52500, volume: 150 },
    { time: 1620259200000, open: 52500, high: 53500, low: 51500, close: 52000, volume: 130 },
    { time: 1620345600000, open: 52000, high: 52500, low: 50500, close: 51000, volume: 110 },
];

chart.setMarketData(marketData);

// Define the two boundary lines
const upperLine = {
    x1: 0, y1: 51000,
    x2: 4, y2: 53500,
    xloc: 'bar_index',
    extend: 'none',
    color: '#2196F3',
    style: 'style_solid',
    width: 2,
    _deleted: false,
};

const lowerLine = {
    x1: 0, y1: 49000,
    x2: 4, y2: 50500,
    xloc: 'bar_index',
    extend: 'none',
    color: '#2196F3',
    style: 'style_solid',
    width: 2,
    _deleted: false,
};

const plots = {
    // Visible lines
    __lines__: {
        data: [{
            time: marketData[0].time,
            value: [upperLine, lowerLine],
            options: { style: 'drawing_line' },
        }],
        options: { style: 'drawing_line', overlay: true },
    },
    // Fill between the lines
    __linefills__: {
        data: [{
            time: marketData[0].time,
            value: [{
                line1: upperLine,
                line2: lowerLine,
                color: 'rgba(33, 150, 243, 0.2)',
                _deleted: false,
            }],
            options: { style: 'linefill' },
        }],
        options: { style: 'linefill', overlay: true },
    },
};

chart.addIndicator('channel', plots, { overlay: true });
```

### Example: Highlighted Zone with Extended Lines

When lines use `extend`, the linefill polygon extends accordingly:

```javascript
const support = {
    x1: 0, y1: 49500,
    x2: 2, y2: 50500,
    xloc: 'bar_index',
    extend: 'right',
    color: '#26a69a',
    style: 'style_dashed',
    width: 1,
    _deleted: false,
};

const resistance = {
    x1: 0, y1: 52000,
    x2: 2, y2: 53000,
    xloc: 'bar_index',
    extend: 'right',
    color: '#ef5350',
    style: 'style_dashed',
    width: 1,
    _deleted: false,
};

const plots = {
    __lines__: {
        data: [{
            time: marketData[0].time,
            value: [support, resistance],
            options: { style: 'drawing_line' },
        }],
        options: { style: 'drawing_line', overlay: true },
    },
    __linefills__: {
        data: [{
            time: marketData[0].time,
            value: [{
                line1: support,
                line2: resistance,
                color: 'rgba(255, 235, 59, 0.15)',
                _deleted: false,
            }],
            options: { style: 'linefill' },
        }],
        options: { style: 'linefill', overlay: true },
    },
};

chart.addIndicator('zone', plots, { overlay: true });
```

---

## Combining All Drawing Objects

You can combine labels, lines, and linefills in a single indicator:

```javascript
const marketData = [
    { time: 1620000000000, open: 50000, high: 51000, low: 49000, close: 50500, volume: 100 },
    { time: 1620086400000, open: 50500, high: 52000, low: 50000, close: 51500, volume: 120 },
    { time: 1620172800000, open: 51500, high: 53000, low: 51000, close: 52500, volume: 150 },
    { time: 1620259200000, open: 52500, high: 53500, low: 51500, close: 52000, volume: 130 },
    { time: 1620345600000, open: 52000, high: 52500, low: 50500, close: 51000, volume: 110 },
];

chart.setMarketData(marketData);

// Define lines for reuse in linefill
const trendUpper = {
    x1: 0, y1: 51000, x2: 4, y2: 53000,
    xloc: 'bar_index', extend: 'none',
    color: '#26a69a', style: 'style_solid', width: 2,
    _deleted: false,
};

const trendLower = {
    x1: 0, y1: 49000, x2: 4, y2: 51000,
    xloc: 'bar_index', extend: 'none',
    color: '#26a69a', style: 'style_solid', width: 2,
    _deleted: false,
};

const plots = {
    __lines__: {
        data: [{
            time: marketData[0].time,
            value: [trendUpper, trendLower],
            options: { style: 'drawing_line' },
        }],
        options: { style: 'drawing_line', overlay: true },
    },
    __linefills__: {
        data: [{
            time: marketData[0].time,
            value: [{
                line1: trendUpper,
                line2: trendLower,
                color: 'rgba(38, 166, 154, 0.15)',
                _deleted: false,
            }],
            options: { style: 'linefill' },
        }],
        options: { style: 'linefill', overlay: true },
    },
    __labels__: {
        data: [{
            time: marketData[0].time,
            value: [
                {
                    x: 2, y: 53000,
                    text: 'Resistance',
                    xloc: 'bar_index', yloc: 'price',
                    color: '#ef5350', style: 'style_label_down',
                    textcolor: '#ffffff', size: 'small',
                    _deleted: false,
                },
                {
                    x: 2, y: 49500,
                    text: 'Support',
                    xloc: 'bar_index', yloc: 'price',
                    color: '#26a69a', style: 'style_label_up',
                    textcolor: '#ffffff', size: 'small',
                    _deleted: false,
                },
            ],
            options: { style: 'label' },
        }],
        options: { style: 'label', overlay: true },
    },
};

chart.addIndicator('analysis', plots, { overlay: true });
```

---

## Z-Level Ordering

Drawing objects render at specific z-levels to maintain proper visual layering:

| Z-Level | Element |
|---|---|
| 0 | Grid background |
| 1 | Fill between plots (`style: 'fill'`) |
| 2 | Plot lines (line, step, etc.) |
| 5 | Candlestick series |
| 10 | Linefill polygons |
| 15 | Drawing lines |
| 20 | Labels |

Labels always render on top, followed by drawing lines, then linefills. This ensures text annotations are never hidden behind lines or fills.

---

## Coordinate System

### Bar Index

All drawing objects use `xloc: 'bar_index'` by default. The `x`, `x1`, and `x2` values correspond to the **0-based index** into the market data array:

- Bar index `0` = first candle in `marketData`
- Bar index `marketData.length - 1` = last candle

{: .warning }
QFChart internally adds padding candles before and after the real data. The renderers automatically apply the padding offset — you should always use real data indices (0 to N-1) in your drawing objects.

### Price Values

The `y`, `y1`, and `y2` values are absolute price values on the Y-axis. They correspond to the same scale as the candlestick data (open, high, low, close).

---

## Best Practices

1. **Always set `_deleted: false`** on new objects. The renderers skip any object with `_deleted: true`.

2. **Use shared line object references** for linefills. Since linefills read coordinates directly from their `line1`/`line2` objects, modifying the line object after creation automatically updates the fill.

3. **Store all objects in a single data entry** at the first bar's timestamp. Do not create separate data entries per object — they will overwrite each other in the sparse data array.

4. **Use `overlay: true`** in the plot options. Drawing objects are typically rendered on the main chart pane alongside candlesticks.

5. **Use rgba colors for linefills** to keep the fill semi-transparent and avoid obscuring the candles underneath.

6. **Combine with regular plots** — drawing objects can coexist with regular plot styles (line, histogram, etc.) in the same indicator.

---

## See Also

-   [Plotting System](/plots) - Regular plot styles for time-series data
-   [API Reference](/api) - Chart methods and configuration
-   [Layout & Customization](/layout) - Pane sizing and layout options
