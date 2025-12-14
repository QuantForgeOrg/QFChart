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

- **container**: The DOM element where the chart will be rendered.
- **options**: Configuration object for the chart.

### Methods

#### `setMarketData(data: OHLCV[])`

Sets the main OHLCV data for the candlestick chart.

- **data**: Array of `OHLCV` objects.

#### `addIndicator(id: string, plots: IndicatorPlots, options?: IndicatorOptions)`

Adds an indicator to the chart.

- **id**: Unique identifier for the indicator.
- **plots**: Object containing plot data definitions.
- **options**:
  - `isOverlay`: (boolean) If `true`, renders on the main chart. If `false`, creates a new pane below.
  - `height`: (number) Height percentage for the new pane (e.g., `15` for 15%).

#### `removeIndicator(id: string)`

Removes an indicator by its ID and redraws the layout.

#### `resize()`

Manually triggers a resize of the chart. Useful if the container size changes programmatically.

#### `destroy()`

Cleans up event listeners and disposes of the ECharts instance.

---

## Interfaces

### `QFChartOptions`

Configuration object passed to the constructor.

| Property          | Type                 | Default                    | Description                              |
| ----------------- | -------------------- | -------------------------- | ---------------------------------------- |
| `title`           | `string`             | `"Market"`                 | Main chart title displayed in tooltip.   |
| `height`          | `string` \| `number` | -                          | Explicit height for the container.       |
| `padding`         | `number`             | `0.2`                      | Vertical padding for auto-scaling (0-1). |
| `upColor`         | `string`             | `"#00da3c"`                | Color for bullish candles.               |
| `downColor`       | `string`             | `"#ec0000"`                | Color for bearish candles.               |
| `backgroundColor` | `string`             | `"#1e293b"`                | Chart background color.                  |
| `tooltip`         | `object`             | `{ position: 'floating' }` | Tooltip configuration (see Layouts).     |
| `dataZoom`        | `object`             | -                          | Configuration for the zoom slider.       |

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
    style:
      | "line"
      | "histogram"
      | "columns"
      | "circles"
      | "cross"
      | "background";
    color: string;
    linewidth?: number;
  };
}
```
