---
layout: home
title: Home
nav_order: 1
permalink: /
---

# QFChart

**QFChart** is a lightweight, high-performance financial charting library built on top of [Apache ECharts](https://echarts.apache.org/). It is designed to easily render candlestick charts with multiple technical indicators, flexible layouts, and interactive features.

## Key Features

-   **Candlestick Charts**: High-performance rendering of OHLCV data.
-   **Real-time Updates**: Incremental data updates for live trading without full re-renders.
-   **Multi-Pane Indicators**: Support for stacking indicators in separate panes (e.g., RSI, MACD) with customizable heights.
-   **Overlay Indicators**: Add indicators directly on top of the main chart (e.g., SMA, Bollinger Bands).
-   **Flexible Layouts**: Configurable sidebars for data display (Left/Right/Floating) to avoid obstructing the chart.
-   **Dynamic Resizing**: Automatically handles window resizing and layout adjustments.
-   **Plugin System**: Extensible architecture for adding interactive tools (e.g., Measure Tool, Line Drawing, Fibonacci Retracements).
-   **TypeScript Support**: Written in TypeScript with full type definitions.

## QFChart in Action

<div id="container">
    <!-- <h1>QFChart Library Demo</h1> -->
    <p>
        This is a demo of the QFChart library. It uses the
        <a href="https://github.com/QuantForgeOrg/PineTS" target="_blank">PineTS</a> library to get the data and the indicators.
    </p>
    <hr />
    <div id="main-chart"></div>
</div>

<!-- QFChart Library (Bundled with ECharts) -->
<script src="https://cdn.jsdelivr.net/npm/@qfo/qfchart/dist/qfchart.min.browser.js"></script>

<!-- Dependencies for Data Loading -->
<script src="https://cdn.jsdelivr.net/npm/pinets/dist/pinets.min.browser.js"></script>
<script src="./js/indicators/sqzmom.js"></script>
<script src="./js/indicators/macd.js"></script>
<script src="./js/indicators/instit-bias.js"></script>
<script src="./js/chart.js">



## Installation

### Browser (UMD)

Include the bundled script in your HTML file:

```html
<script src="dist/qfchart.dev.browser.js"></script>

````

### NPM (Coming Soon)

```bash
npm install qfchart
````

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
const container = document.getElementById('chart-container');
const chart = new QFChart.QFChart(container, {
    title: 'BTC/USDT',
    height: '600px',
    layout: {
        mainPaneHeight: '60%',
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
            style: 'line',
            color: '#ff9900',
            linewidth: 2,
        },
    },
};

// Add as overlay on main chart
chart.addIndicator('SMA_14', plots, { isOverlay: true });
```

### 5. Real-time Updates (Optional)

For real-time data feeds (e.g., WebSocket), use `updateData()` for optimal performance:

```javascript
// Keep reference to indicator for updates
const macdIndicator = chart.addIndicator('MACD', macdPlots, {
    isOverlay: false,
    height: 15,
});

// Later: update with new/modified data
function onNewTick(bar, indicators) {
    // Step 1: Update indicator data first
    macdIndicator.updateData(indicators);

    // Step 2: Update chart data (triggers re-render)
    chart.updateData([bar]);
}
```

**Key Points**:

-   `updateData()` merges data by timestamp (update existing or append new)
-   Always update indicators before calling `chart.updateData()`
-   Much faster than calling `setMarketData()` (no full re-render)
-   Perfect for WebSocket tick updates or periodic data refreshes

See [API Reference](/api#updatedata) for detailed documentation.
