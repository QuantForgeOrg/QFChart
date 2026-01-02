---
layout: default
title: API Reference
nav_order: 2
permalink: /api
---

# API Reference

## Class: `QFChart`

The main class for interacting with the chart.

### Constructor

```typescript
new QFChart(container: HTMLElement, options?: QFChartOptions)
```

-   **container**: The DOM element where the chart will be rendered.
-   **options**: Configuration object for the chart.

### Methods

#### `setMarketData(data: OHLCV[])`

Sets the main OHLCV data for the candlestick chart.

-   **data**: Array of `OHLCV` objects.

**Note**: This method performs a full chart re-render. For incremental updates (e.g., real-time data), use `updateData()` instead.

#### `updateData(data: OHLCV[])`

**NEW** - Incrementally updates market data without full re-render for optimal performance.

-   **data**: Array of `OHLCV` objects to merge with existing data.

**Behavior**:

-   Merges data by timestamp: bars with matching timestamps are updated, new timestamps are appended
-   Only triggers re-render if the array contains data (empty array is ignored for performance)
-   Automatically maintains sort order and updates internal indices
-   Preserves phantom padding for scroll zones

**Usage Pattern with Indicators**:

When updating both market data and indicators, **always follow this order**:

1. **First**: Update indicator data using `indicator.updateData(plots)`
2. **Then**: Call `chart.updateData(newBars)` to trigger the re-render

```typescript
// Step 1: Update indicator data
macdIndicator.updateData({
    macd: { data: [{ time: 1234567890, value: 150 }], options: { style: 'line', color: '#2962FF' } },
});

// Step 2: Update chart data (triggers re-render with updated indicators)
chart.updateData([{ time: 1234567890, open: 100, high: 105, low: 99, close: 103, volume: 1000 }]);
```

**Real-time Tick Updates** (updating last bar):

```typescript
const lastBar = marketData[marketData.length - 1];
const updatedBar = {
    time: lastBar.time, // Same timestamp = update existing bar
    open: lastBar.open,
    high: Math.max(lastBar.high, newPrice),
    low: Math.min(lastBar.low, newPrice),
    close: newPrice,
    volume: lastBar.volume + tickVolume,
};
chart.updateData([updatedBar]);
```

**Important**: If you only update indicator data without corresponding market data changes, you must pass at least one bar (even an existing one) to trigger the re-render. Calling with an empty array will NOT update the chart.

#### `addIndicator(id: string, plots: IndicatorPlots, options?: IndicatorOptions): Indicator`

Adds an indicator to the chart and returns the indicator instance.

-   **id**: Unique identifier for the indicator.
-   **plots**: Object containing plot data definitions.
-   **options**:
    -   `isOverlay`: (boolean) If `true`, renders on the main chart. If `false`, creates a new pane below.
    -   `height`: (number) Height percentage for the new pane (e.g., `15` for 15%).
    -   `titleColor`: (string) Color for the indicator title.
    -   `controls`: (object) Control buttons configuration.
        -   `collapse`: (boolean) Show collapse/expand button.
        -   `maximize`: (boolean) Show maximize/restore pane button.

**Returns**: An `Indicator` instance that can be used for incremental updates via `indicator.updateData()`.

```typescript
const macdIndicator = chart.addIndicator('MACD', macdPlots, {
    isOverlay: false,
    height: 15,
    titleColor: '#ff9900',
});

// Later: update this indicator incrementally
macdIndicator.updateData(newMacdPlots);
```

#### `removeIndicator(id: string)`

Removes an indicator by its ID and redraws the layout.

---

## Class: `Indicator`

Represents an indicator instance returned by `addIndicator()`.

### Methods

#### `updateData(plots: IndicatorPlots)`

Incrementally updates the indicator's data by merging new points with existing data.

-   **plots**: Object containing plot data definitions (same structure as `addIndicator`).

**Behavior**:

-   Merges data by timestamp: existing timestamps are updated, new timestamps are added
-   Automatically sorts all data by time after merge
-   Only updates the indicator's internal data structure
-   **Must** be followed by `chart.updateData()` to trigger a visual re-render

```typescript
// Update indicator data
indicator.updateData({
    macd: {
        data: [
            { time: 1234567890, value: 150 },
            { time: 1234567900, value: 155 },
        ],
        options: { style: 'line', color: '#2962FF' },
    },
});

// Trigger chart re-render
chart.updateData([{ time: 1234567890, open: 100, high: 105, low: 99, close: 103, volume: 1000 }]);
```

**Note**: In normal workflows, indicator values are derived from market data, so indicator updates should correspond to new or modified market bars. Updating indicator data without corresponding market data typically indicates a recalculation scenario.

---

#### `registerPlugin(plugin: Plugin)`

Registers a plugin instance with the chart.

-   **plugin**: An object implementing the `Plugin` interface (or extending `AbstractPlugin`).

#### `addDrawing(drawing: DrawingElement)`

Adds a persistent drawing (like a line or shape) to the chart. These drawings move and zoom naturally with the chart.

-   **drawing**: Object defining the drawing type and coordinates.
    ```typescript
    interface DrawingElement {
        id: string;
        type: 'line' | 'fibonacci';
        points: DataCoordinate[]; // [{ timeIndex, value }, ...]
        paneIndex?: number;
        style?: { color?: string; lineWidth?: number };
    }
    ```

#### `removeDrawing(id: string)`

Removes a drawing by its ID.

#### `resize()`

Manually triggers a resize of the chart. Useful if the container size changes programmatically.

#### `destroy()`

Cleans up event listeners and disposes of the ECharts instance.

---

## Interfaces

### `QFChartOptions`

Configuration object passed to the constructor.

| Property              | Type                        | Default                    | Description                                                                           |
| --------------------- | --------------------------- | -------------------------- | ------------------------------------------------------------------------------------- |
| `title`               | `string`                    | `"Market"`                 | Main chart title displayed in databox.                                                |
| `height`              | `string` \| `number`        | -                          | Explicit height for the container.                                                    |
| `padding`             | `number`                    | `0.2`                      | Horizontal padding (empty candles on sides). Range: 0-1.                              |
| `yAxisPadding`        | `number`                    | `5`                        | Vertical Y-axis padding as percentage (e.g., 5 = 5% gap).                             |
| `yAxisMin`            | `number` \| `'auto'`        | `'auto'`                   | Fixed minimum value for main Y-axis, or 'auto' for dynamic.                           |
| `yAxisMax`            | `number` \| `'auto'`        | `'auto'`                   | Fixed maximum value for main Y-axis, or 'auto' for dynamic.                           |
| `yAxisDecimalPlaces`  | `number`                    | `2`                        | Number of decimal places for Y-axis labels.                                           |
| `yAxisLabelFormatter` | `(value: number) => string` | -                          | Custom formatting function for Y-axis labels.                                         |
| `lastPriceLine`       | `object`                    | `{ visible: false }`       | Configuration for last price line (`visible`, `color`, `lineStyle`, `showCountdown`). |
| `interval`            | `number`                    | -                          | Bar duration in ms (required for countdown timer).                                    |
| `upColor`             | `string`                    | `"#00da3c"`                | Color for bullish candles.                                                            |
| `downColor`           | `string`                    | `"#ec0000"`                | Color for bearish candles.                                                            |
| `backgroundColor`     | `string`                    | `"#1e293b"`                | Chart background color.                                                               |
| `databox`             | `object`                    | `{ position: 'floating' }` | Databox configuration (see Layouts).                                                  |
| `dataZoom`            | `object`                    | -                          | Configuration for the zoom slider.                                                    |
| `controls`            | `object`                    | `{}`                       | Enable control buttons (`collapse`, `maximize`, `fullscreen`).                        |

### `OHLCV`

Data structure for a single candle.

```typescript
interface OHLCV {
    time: number; // Timestamp (ms)
    open: number;
    high: number;
    low: number;
    close: number;
    volume?: number;
}
```

### `IndicatorPlot`

Definition of a single data series within an indicator.

```typescript
interface IndicatorPlot {
    data: IndicatorPoint[];
    options: {
        style: 'line' | 'histogram' | 'columns' | 'circles' | 'cross' | 'background';
        color: string;
        linewidth?: number;
    };
}
```
