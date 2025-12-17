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

### Fibonacci Tool

The `FibonacciTool` allows users to draw Fibonacci retracement levels on the chart.

- **Usage**: Click the Fibonacci icon in the toolbar.
- **Interaction**:
  1.  **Click** to set the start point (e.g., swing high).
  2.  **Move** mouse to set the end point (e.g., swing low).
  3.  **Click** to finish drawing.
- **Levels**: 0, 0.236, 0.382, 0.5, 0.618, 0.786, 1.

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

  // Drawing Management
  addDrawing(drawing: DrawingElement): void;
  removeDrawing(id: string): void;
}

export interface DrawingElement {
  id: string;
  type: "line" | "fibonacci";
  points: DataCoordinate[];
  paneIndex?: number;
  style?: {
    color?: string;
    lineWidth?: number;
  };
}
```

### Event Bus

The chart exposes an Event Bus via `context.events` for communication between plugins and the chart core. Standard events include:

- `mouse:down`, `mouse:move`, `mouse:up`, `mouse:click`
- `chart:resize`, `chart:dataZoom`, `chart:updated`
- `plugin:activated`, `plugin:deactivated`

#### Drawing Events

When using the native drawing system (via `addDrawing`), the chart emits granular events for interactions with drawing elements:

- **Shape Events**:
  - `drawing:hover`: Mouse over a drawing shape (e.g., line).
  - `drawing:mouseout`: Mouse out of a drawing shape.
  - `drawing:mousedown`: Mouse down on a drawing shape.
  - `drawing:click`: Click on a drawing shape.
- **Control Point Events**:
  - `drawing:point:hover`: Mouse over a control point (start/end).
  - `drawing:point:mouseout`: Mouse out of a control point.
  - `drawing:point:mousedown`: Mouse down on a control point.
  - `drawing:point:click`: Click on a control point.

All drawing events carry a payload identifying the drawing:

```typescript
{
  id: string,       // The ID of the drawing
  type?: string,    // The type of drawing (e.g., "line")
  pointIndex?: number // For point events: 0 (start), 1 (end), etc.
}
```

### Coordinate Conversion & Native Drawings

For persistent drawings (lines, shapes that stick to the chart), you should use the `addDrawing` API instead of manual ZRender management.

1.  **Use ZRender for Interaction**: While the user is drawing (dragging mouse), use ZRender graphics (via `chart.getZr()`) for smooth, high-performance feedback.
2.  **Use Native Drawings for Persistence**: Once drawing is finished, convert pixels to data coordinates and call `context.addDrawing()`.

#### Example: Creating a Line

```typescript
// 1. Convert pixels to data coordinates
const start = this.context.coordinateConversion.pixelToData({ x: 100, y: 200 });
const end = this.context.coordinateConversion.pixelToData({ x: 300, y: 400 });

// 2. Add persistent drawing
if (start && end) {
  this.context.addDrawing({
    id: "my-line-1",
    type: "line",
    points: [start, end],
    style: {
      color: "#3b82f6",
      lineWidth: 2,
    },
  });
}
```
