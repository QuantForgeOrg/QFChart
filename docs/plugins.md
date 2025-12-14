---
layout: default
title: Plugins
nav_order: 4
---

# Plugin System

QFChart supports a flexible plugin system that allows you to add custom interactive tools and extensions to the chart. Plugins can be used to implement drawing tools, custom overlays, or additional UI controls.

## registering a Plugin

To use a plugin, you must register it with the chart instance.

```javascript
import { QFChart, MeasureTool } from "qfchart";

const chart = new QFChart(container, options);

// 1. Create Plugin Instance
const measureTool = new MeasureTool();

// 2. Register Plugin
chart.registerPlugin(measureTool);
```

Once registered, the plugin will automatically add its button/icon to the chart's toolbar (if applicable).

## Built-in Plugins

### Measure Tool

The `MeasureTool` is a built-in plugin that allows users to measure price and time differences on the chart, similar to TradingView's measure tool.

- **Usage**: Click the ruler icon in the toolbar.
- **Interaction**:
  1.  **Click** on the chart to start the measurement.
  2.  **Move** the mouse to drag the measurement box.
  3.  **Click** again to finish and freeze the measurement.
  4.  **Click** anywhere else or drag the chart to clear the measurement.

## Creating Custom Plugins

You can create your own plugins by extending the `AbstractPlugin` class or implementing the `Plugin` interface directly. We recommend extending `AbstractPlugin` as it provides useful helpers and automatic event cleanup.

### The AbstractPlugin Base Class

```typescript
import { AbstractPlugin, ChartContext } from "qfchart";

export class MyCustomPlugin extends AbstractPlugin {
  constructor() {
    super({
      id: "my-plugin",
      name: "My Plugin",
      icon: "<svg>...</svg>", // SVG icon for toolbar
    });
  }

  // Lifecycle Hooks
  protected onInit(): void {
    console.log("Plugin initialized");
    // Access chart instance via this.chart
    // Access context via this.context
  }

  protected onActivate(): void {
    console.log("Tool activated");
    // Add event listeners automatically managed by the base class
    this.on("mouse:move", this.handleMouseMove);
  }

  protected onDeactivate(): void {
    console.log("Tool deactivated");
    // Event listeners added with this.on() are automatically removed
  }

  private handleMouseMove = (params: any) => {
    // Handle mouse move
  };
}
```

### The Chart Context

The `ChartContext` provides access to the underlying ECharts instance, data, and utility helpers.

```typescript
export interface ChartContext {
  // Core Access
  getChart(): echarts.ECharts;
  getMarketData(): OHLCV[];
  getTimeToIndex(): Map<number, number>;
  getOptions(): QFChartOptions;

  // Event Bus
  events: EventBus;

  // Helpers
  coordinateConversion: {
    pixelToData: (point: { x; y }) => { timeIndex; value } | null;
    dataToPixel: (point: { timeIndex; value }) => { x; y } | null;
  };

  // Interaction Control
  disableTools(): void; // To disable other active tools
}
```

### Event Bus

The chart exposes an Event Bus via `context.events` for communication between plugins and the chart core. Standard events include:

- `mouse:down`, `mouse:move`, `mouse:up`, `mouse:click`
- `chart:resize`, `chart:dataZoom`, `chart:updated`
- `plugin:activated`, `plugin:deactivated`

### Coordinate Conversion

Use the built-in helpers for easy coordinate mapping:

```typescript
const dataPoint = this.context.coordinateConversion.pixelToData({
  x: 100,
  y: 200,
});
// Returns { timeIndex: 45, value: 50000.50 }

const pixelPoint = this.context.coordinateConversion.dataToPixel({
  timeIndex: 45,
  value: 50000,
});
// Returns { x: 100, y: 200 }
```
