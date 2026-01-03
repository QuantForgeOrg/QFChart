# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.6.1] - 2025-01-03

### Added

-   **Layout Options for Mobile Devices**
    -   Enhanced layout management with better control options for mobile device interactions.
    -   Improved touch controls and responsive behavior for smaller screens.

### Changed

-   **Live Charts Enhancement**
    -   Enhanced layout and series management specifically for live chart updates.
    -   Improved real-time data handling and rendering performance.

## [0.6.0] - 2025-12-30

### Added

-   **New Plot Styles for Pine Script Compatibility**
    -   `char` plot style - Displays data values only in tooltip/sidebar without visual representation (equivalent to Pine Script's `plotchar()`).
    -   `bar` plot style - Renders OHLC data as traditional bar charts with horizontal ticks for open/close (equivalent to Pine Script's `plotbar()`).
    -   `candle` plot style - Renders OHLC data as candlesticks with filled bodies and wicks (equivalent to Pine Script's `plotcandle()`).
    -   `barcolor` plot style - Applies colors to main chart candlesticks based on indicator conditions (equivalent to Pine Script's `barcolor()`).
    -   Support for `bordercolor` option in candle style for independent body border coloring.
    -   Support for `wickcolor` option in bar/candle styles for separate wick coloring.
    -   OHLC data format support: `[open, high, low, close]` for bar/candle styles.
-   **Documentation**
    -   Comprehensive documentation for all new plot styles in plotting system guide.
    -   Pine Script equivalents clearly documented for each plot style.
    -   Practical examples for Heikin Ashi candles, trend coloring, and auxiliary data display.
    -   Explanation of unified plot structure vs. Pine Script separate functions.

### Changed

-   **Enhanced Type Definitions**
    -   Updated `IndicatorStyle` type to include new plot styles: `char`, `bar`, `candle`, `barcolor`.
    -   Extended `IndicatorPoint.value` to support arrays for OHLC data.
    -   Added `wickcolor` and `bordercolor` to `IndicatorOptions` and per-point options.
-   **SeriesBuilder Refactoring**
    -   Now returns both series data and bar colors for `barcolor` functionality.
    -   Enhanced color handling for candlestick customization.
-   **Documentation Updates**
    -   Updated plotting system overview to reflect 11 total plot styles.
    -   Enhanced examples and use cases for all plot styles.

## [0.5.7] - 2025-12-24

### Added

-   **Shape Plot Style**
    -   New `shape` plot style with extensive customization options for technical indicator signals.
    -   Support for 12 shape types: `circle`, `square`, `diamond`, `triangleup`, `triangledown`, `arrowup`, `arrowdown`, `flag`, `cross`, `xcross`, `labelup`, `labeldown`.
    -   6 size presets: `tiny`, `small`, `normal`, `large`, `huge`, `auto`.
    -   Custom dimensions support with `width` and `height` attributes for non-uniform shapes.
    -   5 location modes: `absolute`, `abovebar`, `belowbar`, `top`, `bottom` for flexible positioning.
    -   Text label support with configurable color and automatic positioning based on location.
    -   Per-point overrides for all shape attributes (shape, size, color, text, location, dimensions).
-   **Documentation**
    -   Comprehensive plotting system documentation (`/plots`) covering all 7 plot styles.
    -   Detailed shape plot examples and configuration guide.
    -   PineScript demo page showing runtime transpilation with PineTS.
    -   Cross-signal indicator example demonstrating shape plots with EMA crossover signals.

### Changed

-   **Build Pipeline Modernization**
    -   Migrated from UMD-only to hybrid ESM/CJS/UMD build system.
    -   Added `exports` field in `package.json` for modern bundler support.
    -   Externalized ECharts dependency - now required as peer dependency.
    -   Separate ESM (`qfchart.min.es.js`) and UMD (`qfchart.min.browser.js`) bundles.
    -   Updated all demo pages to include ECharts script tag.
    -   Improved Rollup configuration for better tree-shaking and bundle optimization.

### Fixed

-   Binance provider hotfix for USA users connectivity issues.

## [0.5.2] - 2025-12-20

### Added

-   **Enhanced Plot Types**
    -   Multi-color support for Line plots, allowing different colors per segment.
    -   New Step plot type for discrete value visualization.
-   **Documentation & Examples**
    -   Live demos integrated into documentation pages.
    -   Additional demo examples showcasing plugin usage and features.
    -   Plugin integration examples in demo charts.

### Fixed

-   Zoom controller improvements and tweaks for better user experience.
-   Chart.js integration fixes for proper module loading.
-   Documentation page rendering and theme consistency.
-   Updated internal GitHub repository links.

### Changed

-   Enhanced demo pages with more comprehensive examples.
-   Improved documentation structure and navigation.
-   Optimized chart sizing for various use cases.

## [0.5.0] - 2025-12-17 (first public release)

### Added

-   **Core Charting Engine**

    -   High-performance Candlestick (OHLCV) charts built on Apache ECharts.
    -   Efficient incremental data updates for real-time trading applications.
    -   Multi-pane layout system allowing stacked indicators with independent Y-axes.
    -   Support for overlay indicators on the main price chart.
    -   Integrated zoom and pan controls (DataZoom) with configurable positioning.

-   **Interactive Drawing System**

    -   A plugin architecture for extending chart functionality.
    -   **Line Tool**: Draw trend lines, support/resistance, and rays.
    -   **Fibonacci Retracement**: Interactive tool with customizable levels, ratios, and background shading.
    -   **Measure Tool**: Quickly calculate price percentage changes and bar counts between two points.
    -   Full drawing lifecycle management: selection, dragging, point adjustment, and deletion.

-   **Layout & User Interface**

    -   Dynamic pane controls: Collapse, Maximize, and Restore functionality for all chart areas.
    -   Flexible "Databox" (Tooltip) system supporting Left Sidebar, Right Sidebar, or Floating modes.
    -   Fullscreen support for an immersive trading experience.
    -   Customizable theme options including colors (up/down/background), fonts, and spacing.

-   **Developer Experience**
    -   First-class TypeScript support with full type definitions.
    -   Comprehensive Event API for tracking user interactions (clicks, hovers, zooms).
    -   Modular internal architecture (LayoutManager, SeriesBuilder, GraphicBuilder).
    -   Automated documentation workflows via GitHub Actions.
