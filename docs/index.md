---
layout: home
title: Home
nav_order: 1
permalink: /
---

# QFChart

**QFChart** is a lightweight, high-performance financial charting library built on top of [Apache ECharts](https://echarts.apache.org/). It is designed to easily render candlestick charts with multiple technical indicators, flexible layouts, and interactive features.

## Key Features

- **Candlestick Charts**: High-performance rendering of OHLCV data.
- **Multi-Pane Indicators**: Support for stacking indicators in separate panes (e.g., RSI, MACD) with customizable heights.
- **Overlay Indicators**: Add indicators directly on top of the main chart (e.g., SMA, Bollinger Bands).
- **Flexible Layouts**: Configurable sidebars for tooltips (Left/Right/Floating) to avoid obstructing the chart.
- **Dynamic Resizing**: Automatically handles window resizing and layout adjustments.
- **Plugin System**: Extensible architecture for adding interactive tools (e.g., Measure Tool).
- **TypeScript Support**: Written in TypeScript with full type definitions.

## Installation

### Browser (UMD)

Include the bundled script in your HTML file:

```html
<script src="dist/qfchart.dev.browser.js"></script>
```

### NPM (Coming Soon)

```bash
npm install qfchart
```

## Quick Start

Here is a minimal example to get a chart up and running.

### 1. HTML Container

Create a container element with a defined width and height.

```html
<div id="chart-container" style="width: 100%; height: 600px;"></div>
```

### 2. Initialize Chart

```javascript
// Initialize the chart
const container = document.getElementById("chart-container");
const chart = new QFChart.QFChart(container, {
  title: "BTC/USDT",
  height: "600px",
  layout: {
    mainPaneHeight: "60%",
    gap: 20,
  },
});
```

### 3. Set Market Data

Prepare your OHLCV data (Time, Open, High, Low, Close, Volume) and pass it to the chart.

```javascript
const marketData = [
  {
    time: 1620000000000,
    open: 50000,
    high: 51000,
    low: 49000,
    close: 50500,
    volume: 100,
  },
  // ... more data
];

chart.setMarketData(marketData);
```

### 4. Add an Indicator

Add a simple Line indicator (e.g., SMA).

```javascript
const smaData = [
  { time: 1620000000000, value: 50200 },
  // ...
];

const plots = {
  SMA: {
    data: smaData,
    options: {
      style: "line",
      color: "#ff9900",
      linewidth: 2,
    },
  },
};

// Add as overlay on main chart
chart.addIndicator("SMA_14", plots, { isOverlay: true });
```
