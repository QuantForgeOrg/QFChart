# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.7.3] - 2026-03-06 - Histogram Rewrite, Table Fixes & Drawing Object Improvements

### Added

- **Histogram `histbase` Support**: Rewrote `HistogramRenderer` from ECharts `bar` type to a `custom` series so bars extend from the configured `histbase` value (e.g., 50) instead of always from 0. This matches TradingView behavior for indicators like RSI histograms centered on 50.
- **Thin Histogram vs Thick Columns**: `style: 'histogram'` now renders as thin line-like bars whose pixel width is controlled by `linewidth`, while `style: 'columns'` renders as thick bars at 60% of candle width — matching the visual distinction TradingView makes between the two styles.
- **Resizable Indicator Panes**: Pane borders between the main chart and sub-pane indicators (and between adjacent indicator panes) are now interactively draggable. Hovering over a pane boundary changes the cursor to `row-resize`; dragging redistributes height between the two neighbouring panes in real time (throttled via `requestAnimationFrame`). Minimum heights are enforced (`10 %` for the main pane, `5 %` per indicator). The `LayoutManager` now exposes a `PaneBoundary[]` array in its `LayoutResult` and accepts an optional `mainHeightOverride` parameter to persist user-adjusted heights across re-renders.

### Fixed

- **Fill Overlay Inheritance**: Fill plots now automatically inherit `overlay: true` when both of their referenced plots are overlay. Previously a fill in an overlay indicator (e.g., Bollinger Bands) had `overlay` undefined, so it was placed in the indicator's sub-pane, stretching the Y-axis to extreme price-scale ranges.
- **Table Placement for Sub-Pane Indicators**: Tables from non-overlay indicators were always positioned relative to the main chart grid (pane 0). Each table is now tagged with its indicator's `_paneIndex` and the `TableOverlayRenderer` receives a `getGridRect(paneIndex)` callback to position the table overlay relative to the correct pane's grid rect.
- **Table Border Rendering Conditions**: Fixed spurious hairlines appearing between table cells. When no border or frame colors are set, `border-collapse: collapse` is now used instead of `border-collapse: separate`, eliminating sub-pixel gaps. Frame and cell borders are now only drawn when an explicit color is provided — previously a missing color fell back to `#999`.
- **Box `border_color: na`**: Boxes with `border_color` set to `na`, `null`, or `NaN` now correctly render without a border instead of falling back to the default blue (`#2962ff`).
- **Box & Line Extend Shorthand Values**: `BoxRenderer` and `DrawingLineRenderer` now accept single-letter extend values (`'n'`, `'l'`, `'r'`, `'b'`) in addition to the full words (`'none'`, `'left'`, `'right'`, `'both'`), matching the shorthand constants PineTS emits.
- **Drawing Line Spurious Fill**: Added `fill: 'none'` to the line element style in `DrawingLineRenderer` to prevent ECharts from accidentally filling the area under the line shape.
- **ECharts Palette Color Overrides**: Added `itemStyle: { color: 'transparent', borderColor: 'transparent' }` to the custom series config for `DrawingLineRenderer`, `BoxRenderer`, and `PolylineRenderer`. Without this, ECharts' visual system was overriding element colors set inside `renderItem` with its automatic color palette on re-renders.
- **Table Mouse-Event Pass-Through**: Table overlay elements now have `pointer-events: none` so hover, click, and drag events on the underlying chart are no longer swallowed when the cursor passes over a rendered table. Previously `pointer-events: auto` caused the chart to become unresponsive to drawing tools and tooltips in table-covered areas.
- **Drawing Object Y-Axis Decoupling** (`BoxRenderer`, `DrawingLineRenderer`, `LinefillRenderer`, `PolylineRenderer`): Drawing object renderers no longer encode y-dimensions in the ECharts data entry. Previously each renderer computed a `yMin`/`yMax` from all drawing object coordinates and included them as dimensions `[2]`/`[3]` with `encode: { y: [2, 3] }`, which forced the y-axis to encompass drawing object prices. This prevented the y-axis from adapting when scrolling to earlier history with different price ranges. The y-encoding is now omitted entirely; drawing objects are rendered purely as canvas graphics and do not participate in axis auto-scaling.
- **Box Fill Rect Stroke Leakage**: Added `stroke: 'none'` to the inner fill `rect` element in `BoxRenderer`. Without this, the browser's default canvas stroke (a thin hairline in the current color) bled through around the fill rectangle, producing a faint border even when `border_color` was transparent or `na`.

## [0.7.2] - 2026-03-05 - Gradient Fill Support

### Added

- **Gradient Fill (`FillRenderer`)**: Added support for Pine Script's gradient fill variant — `fill(plot1, plot2, top_value, bottom_value, top_color, bottom_color)`. The renderer detects `plotOptions.gradient === true` and renders each polygon segment with a vertical ECharts linear gradient, mapping `top_color` to the higher-value boundary and `bottom_color` to the lower-value boundary. Gracefully falls back to a semi-transparent grey if per-bar color data is missing.
- **`ColorUtils.toRgba()`**: Added a new utility method to convert any parsed color + opacity pair into a reliable `rgba()` string, handling `rgb()`, 6-digit hex, and 8-digit hex (`#RRGGBBAA`) inputs.
- **`ColorUtils.parseColor()` — 8-digit Hex**: Extended `parseColor()` to handle `#RRGGBBAA` colors (the format PineTS emits for `color.new()` with alpha), correctly extracting the alpha channel as opacity.

### Fixed

- **Fill References Broken by `color: na`**: Fixed fill plots losing their reference data when the source plot had segments with `color: na` (invisible segments). Previously, `plotDataArrays` stored the post-nullification array (where `na`-color points were set to `null`), so the fill had gaps wherever the source plot was invisible. Now a separate `rawDataArray` is stored with the original numeric values, ensuring fills always see the underlying data regardless of visibility.

## [0.7.1] - 2026-03-04 - Rendering Hotfixes

### Fixed

- **Plot Color `undefined` Treated as `na`**: Fixed a bug where PineTS emits `{ color: undefined }` (an options object with an explicit but `undefined` color key) to signal a hidden/na segment. Previously this was not detected as a line break — the color key existed but its value was `undefined`, which passed through the `null`/`'na'`/`'NaN'` checks unnoticed. The fix adds an `'color' in point.options` presence check so any explicitly-set `undefined` color is treated as `na`, correctly breaking the line/segment at that point.
- **Drawing Tools Clipping**: Fixed a secondary clipping issue in interactive drawing tools (trend lines, Fibonacci, etc.) that was introduced by the v0.7.0 render clipping refactor.

## [0.7.0] - 2026-02-27 - Box, Polyline & Table Renderers, Render Clipping

### Added

- **Box Renderer (`BoxRenderer`)**: New renderer for Pine Script `box.*` drawing objects. Renders filled rectangles defined by two corners `(left, top)` → `(right, bottom)` with configurable fill color, border color/width/style, optional text, and extend mode. Supports 8-digit hex colors (`#RRGGBBAA`) by converting them to `rgba()` for ECharts canvas compatibility.
- **Polyline Renderer (`PolylineRenderer`)**: New renderer for Pine Script `polyline.*` drawing objects. Renders multi-point connected paths from an array of `chart.point` objects, with support for straight or curved segments, optional closed shapes, and fill color.
- **Table Renderer (`TableOverlayRenderer`)**: New HTML-based renderer for Pine Script `table.*` drawing objects. Tables are positioned as DOM overlays anchored to fixed positions (`top_left`, `bottom_center`, etc.) rather than data coordinates. Supports cell text, background/text/border colors, full opacity control, and Pine Script's "last table at each position wins" behavior.

### Fixed

- **Render Clipping**: Fixed custom series rendering for drawing objects (lines, linefills, boxes, polylines) to properly clip to the chart grid area, preventing overflow outside the plot bounds. Updated `LayoutManager` to expose the grid rect for clipping and rewrote clipping logic across all affected renderers.
- **Constants Compliance**: Aligned string constants for label styles, line styles, shape types, and size presets across renderers (`LabelRenderer`, `ShapeRenderer`, `ShapeUtils`, `DrawingLineRenderer`, `LinefillRenderer`) to match PineTS constant names. This ensures PineTS output renders correctly without manual constant conversion.

## [0.6.8] - 2026-02-27 - Drawing Lines, Linefills & Label Improvements

### Added

- **Drawing Line Renderer (`DrawingLineRenderer`)**: New renderer for Pine Script `line.*` drawing objects. Renders lines between two `(x, y)` coordinates with support for line styles (solid, dashed, dotted), extend modes (left, right, both), configurable width and color. Handles `bar_index`-based coordinates with proper `dataIndexOffset` alignment.
- **Linefill Renderer (`LinefillRenderer`)**: New renderer for `linefill.new()` that fills the area between two line objects as a 4-corner polygon. Supports line extend modes, color/opacity, and proper z-level ordering (z=10, between candles and drawing lines).
- **Documentation**: Added comprehensive Drawing Objects documentation page covering labels, lines, and linefills with data format examples, coordinate system explanation, and z-level ordering reference.

### Fixed

- **Label Renderer Improvements**: Fixed and improved label rendering with better value resolution and positioning.
- **FillRenderer Z-Level**: Changed fill z-level from `-5` to `1` — fills are now visible on the main chart pane (previously rendered behind the grid background).
- **Sparse Array Aggregation**: Drawing lines now store all objects in a single array entry to prevent multiple `var` lines (same timestamp) from overwriting each other.
- **Padding Offset Alignment**: Drawing line and linefill renderers correctly apply `dataIndexOffset` for `bar_index`-based coordinates, fixing ~60-bar misalignment with candles.

## [0.6.7] - 2026-02-21

### Added

- **Labels Support**: Added support for labels on the chart (pull request #13).
    - Implemented `LabelRenderer` for rendering label elements.
    - Enables display of label annotations aligned with Pine Script `label.*` namespace output.

## [0.6.6] - 2026-02-15

### Fixed

- **Price Line Visibility for Small Assets**: Fixed an issue where the `lastPriceLine` was invisible for assets with very small prices (e.g., PUMP/USDT at 0.002) due to default 2-decimal rounding.
    - Implemented auto-detection of decimal places based on market price magnitude.
    - Added `AxisUtils.autoDetectDecimals()` to intelligently determine precision (e.g., 2 decimals for BTC, 6-8 for meme tokens).
    - Updated `markLine` configuration to respect the calculated precision, ensuring the line is positioned correctly on the Y-axis.
    - Updated Y-axis labels and countdown timer to use the auto-detected precision.
    - Added `yAxisDecimalPlaces` option to `QFChartOptions` to allow manual override of the auto-detection.

- **Y-axis Scaling for Overlay Indicators**: Fixed Y-axis starting at negative values when overlay indicators contain visual-only plots (background, barcolor).
    - Modified `SeriesBuilder.ts` to prioritize indicator's `paneIndex` setting when determining overlay status, ensuring correct Y-axis assignment.
    - Visual-only plots (background, barcolor) now properly use separate Y-axes with fixed `[0,1]` ranges, preventing them from contaminating the main price Y-axis.
    - Overlay plots (EMA, moving averages, etc.) correctly share the main Y-axis with candlesticks.

## [0.6.5] - 2026-01-24

### Changed

- **Code Refactoring for Maintainability**
    - Refactored chart renderers architecture to enhance code maintainability and modularity.
    - Split large `SeriesBuilder.ts` into focused, single-responsibility modules.
    - Created `SeriesRendererFactory.ts` for centralized renderer instantiation.
    - Organized renderers into dedicated files: `BackgroundRenderer`, `FillRenderer`, `HistogramRenderer`, `LineRenderer`, `OHLCBarRenderer`, `ScatterRenderer`, `SeriesRenderer`, `ShapeRenderer`, `StepRenderer`.
    - Split `Utils.ts` into specialized utility modules: `AxisUtils`, `CanvasUtils`, `ColorUtils`, `ShapeUtils`.
    - Improved code organization with better separation of concerns.

### Fixed

- **Rendering Improvements**: Various rendering tweaks and fixes for better chart display consistency.

## [0.6.4] - 2026-01-13

### Added

- **Plot Fill Method**: Implemented `plot.fill()` method to fill the area between two plot lines with customizable colors and transparency, matching Pine Script's `fill()` functionality.
- **Per-Plot Overlay Option**: Added support for overlay option per plot, allowing individual plots to be configured as overlay or separate pane indicators.
- **Default Color Support**: Added default color handling for plots when color is not explicitly specified.

### Fixed

- **Plot Shape Y-Axis Alignment**: Fixed y-axis alignment issues with `plotshape` plots to ensure proper positioning relative to price bars.
- **Plot Styles Compatibility**: Hotfix for plot styles compatibility issues to ensure consistent rendering across different plot types.

## [0.6.1] - 2025-01-03

### Added

- **Layout Options for Mobile Devices**
    - Enhanced layout management with better control options for mobile device interactions.
    - Improved touch controls and responsive behavior for smaller screens.

### Changed

- **Live Charts Enhancement**
    - Enhanced layout and series management specifically for live chart updates.
    - Improved real-time data handling and rendering performance.

## [0.6.0] - 2025-12-30

### Added

- **New Plot Styles for Pine Script Compatibility**
    - `char` plot style - Displays data values only in tooltip/sidebar without visual representation (equivalent to Pine Script's `plotchar()`).
    - `bar` plot style - Renders OHLC data as traditional bar charts with horizontal ticks for open/close (equivalent to Pine Script's `plotbar()`).
    - `candle` plot style - Renders OHLC data as candlesticks with filled bodies and wicks (equivalent to Pine Script's `plotcandle()`).
    - `barcolor` plot style - Applies colors to main chart candlesticks based on indicator conditions (equivalent to Pine Script's `barcolor()`).
    - Support for `bordercolor` option in candle style for independent body border coloring.
    - Support for `wickcolor` option in bar/candle styles for separate wick coloring.
    - OHLC data format support: `[open, high, low, close]` for bar/candle styles.
- **Documentation**
    - Comprehensive documentation for all new plot styles in plotting system guide.
    - Pine Script equivalents clearly documented for each plot style.
    - Practical examples for Heikin Ashi candles, trend coloring, and auxiliary data display.
    - Explanation of unified plot structure vs. Pine Script separate functions.

### Changed

- **Enhanced Type Definitions**
    - Updated `IndicatorStyle` type to include new plot styles: `char`, `bar`, `candle`, `barcolor`.
    - Extended `IndicatorPoint.value` to support arrays for OHLC data.
    - Added `wickcolor` and `bordercolor` to `IndicatorOptions` and per-point options.
- **SeriesBuilder Refactoring**
    - Now returns both series data and bar colors for `barcolor` functionality.
    - Enhanced color handling for candlestick customization.
- **Documentation Updates**
    - Updated plotting system overview to reflect 11 total plot styles.
    - Enhanced examples and use cases for all plot styles.

## [0.5.7] - 2025-12-24

### Added

- **Shape Plot Style**
    - New `shape` plot style with extensive customization options for technical indicator signals.
    - Support for 12 shape types: `circle`, `square`, `diamond`, `triangleup`, `triangledown`, `arrowup`, `arrowdown`, `flag`, `cross`, `xcross`, `labelup`, `labeldown`.
    - 6 size presets: `tiny`, `small`, `normal`, `large`, `huge`, `auto`.
    - Custom dimensions support with `width` and `height` attributes for non-uniform shapes.
    - 5 location modes: `absolute`, `abovebar`, `belowbar`, `top`, `bottom` for flexible positioning.
    - Text label support with configurable color and automatic positioning based on location.
    - Per-point overrides for all shape attributes (shape, size, color, text, location, dimensions).
- **Documentation**
    - Comprehensive plotting system documentation (`/plots`) covering all 7 plot styles.
    - Detailed shape plot examples and configuration guide.
    - PineScript demo page showing runtime transpilation with PineTS.
    - Cross-signal indicator example demonstrating shape plots with EMA crossover signals.

### Changed

- **Build Pipeline Modernization**
    - Migrated from UMD-only to hybrid ESM/CJS/UMD build system.
    - Added `exports` field in `package.json` for modern bundler support.
    - Externalized ECharts dependency - now required as peer dependency.
    - Separate ESM (`qfchart.min.es.js`) and UMD (`qfchart.min.browser.js`) bundles.
    - Updated all demo pages to include ECharts script tag.
    - Improved Rollup configuration for better tree-shaking and bundle optimization.

### Fixed

- Binance provider hotfix for USA users connectivity issues.

## [0.5.2] - 2025-12-20

### Added

- **Enhanced Plot Types**
    - Multi-color support for Line plots, allowing different colors per segment.
    - New Step plot type for discrete value visualization.
- **Documentation & Examples**
    - Live demos integrated into documentation pages.
    - Additional demo examples showcasing plugin usage and features.
    - Plugin integration examples in demo charts.

### Fixed

- Zoom controller improvements and tweaks for better user experience.
- Chart.js integration fixes for proper module loading.
- Documentation page rendering and theme consistency.
- Updated internal GitHub repository links.

### Changed

- Enhanced demo pages with more comprehensive examples.
- Improved documentation structure and navigation.
- Optimized chart sizing for various use cases.

## [0.5.0] - 2025-12-17 (first public release)

### Added

- **Core Charting Engine**
    - High-performance Candlestick (OHLCV) charts built on Apache ECharts.
    - Efficient incremental data updates for real-time trading applications.
    - Multi-pane layout system allowing stacked indicators with independent Y-axes.
    - Support for overlay indicators on the main price chart.
    - Integrated zoom and pan controls (DataZoom) with configurable positioning.

- **Interactive Drawing System**
    - A plugin architecture for extending chart functionality.
    - **Line Tool**: Draw trend lines, support/resistance, and rays.
    - **Fibonacci Retracement**: Interactive tool with customizable levels, ratios, and background shading.
    - **Measure Tool**: Quickly calculate price percentage changes and bar counts between two points.
    - Full drawing lifecycle management: selection, dragging, point adjustment, and deletion.

- **Layout & User Interface**
    - Dynamic pane controls: Collapse, Maximize, and Restore functionality for all chart areas.
    - Flexible "Databox" (Tooltip) system supporting Left Sidebar, Right Sidebar, or Floating modes.
    - Fullscreen support for an immersive trading experience.
    - Customizable theme options including colors (up/down/background), fonts, and spacing.

- **Developer Experience**
    - First-class TypeScript support with full type definitions.
    - Comprehensive Event API for tracking user interactions (clicks, hovers, zooms).
    - Modular internal architecture (LayoutManager, SeriesBuilder, GraphicBuilder).
    - Automated documentation workflows via GitHub Actions.
