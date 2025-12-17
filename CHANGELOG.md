# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
