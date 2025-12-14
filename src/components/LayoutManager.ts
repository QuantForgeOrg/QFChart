import { QFChartOptions, Indicator as IndicatorType } from "../types";

export interface PaneConfiguration {
  index: number;
  height: number;
  top: number;
  isCollapsed: boolean;
  indicatorId?: string;
  titleColor?: string;
}

export interface LayoutResult {
  grid: any[];
  xAxis: any[];
  yAxis: any[];
  dataZoom: any[];
  paneLayout: PaneConfiguration[];
  mainPaneHeight: number;
  mainPaneTop: number;
  pixelToPercent: number;
}

export class LayoutManager {
  public static calculate(
    containerHeight: number,
    indicators: Map<string, IndicatorType>,
    options: QFChartOptions
  ): LayoutResult {
    // Identify unique separate panes (indices > 0) and sort them
    const separatePaneIndices = Array.from(indicators.values())
      .map((ind) => ind.paneIndex)
      .filter((idx) => idx > 0)
      .sort((a, b) => a - b)
      .filter((value, index, self) => self.indexOf(value) === index); // Unique

    const hasSeparatePane = separatePaneIndices.length > 0;

    // DataZoom Configuration
    const dzVisible = options.dataZoom?.visible ?? true;
    const dzPosition = options.dataZoom?.position ?? "top";
    const dzHeight = options.dataZoom?.height ?? 6;

    // Layout Calculation
    let mainPaneTop = 8;
    let chartAreaBottom = 92; // Default if no dataZoom at bottom

    if (dzVisible) {
      if (dzPosition === "top") {
        // DataZoom takes top 0% to dzHeight%
        // Main chart starts below it with a small gap
        mainPaneTop = dzHeight + 4; // dzHeight + 4% gap
        chartAreaBottom = 95; // Use more space at bottom since slider is gone
      } else {
        // DataZoom takes bottom
        // Chart ends at 100 - dzHeight - margin
        chartAreaBottom = 100 - dzHeight - 2;
        mainPaneTop = 8;
      }
    } else {
      // No data zoom
      mainPaneTop = 5;
      chartAreaBottom = 95;
    }

    // We need to calculate height distribution dynamically to avoid overlap.
    // Calculate gap in percent
    let gapPercent = 5;
    let pixelToPercent = 0;
    if (containerHeight > 0) {
      gapPercent = (20 / containerHeight) * 100;
      pixelToPercent = (1 / containerHeight) * 100;
    }

    let mainHeightVal = 75; // Default if no separate pane

    // Prepare separate panes configuration
    let paneConfigs: PaneConfiguration[] = [];

    if (hasSeparatePane) {
      // Resolve heights for all separate panes
      // 1. Identify panes and their requested heights
      const panes = separatePaneIndices.map((idx) => {
        const ind = Array.from(indicators.values()).find(
          (i) => i.paneIndex === idx
        );
        return {
          index: idx,
          requestedHeight: ind?.height,
          isCollapsed: ind?.collapsed ?? false,
          indicatorId: ind?.id,
          titleColor: ind?.titleColor,
        };
      });

      // 2. Assign actual heights
      // If collapsed, use small fixed height (e.g. 3%)
      const resolvedPanes = panes.map((p) => ({
        ...p,
        height: p.isCollapsed
          ? 3
          : p.requestedHeight !== undefined
          ? p.requestedHeight
          : 15,
      }));

      // 3. Calculate total space needed for indicators
      const totalIndicatorHeight = resolvedPanes.reduce(
        (sum, p) => sum + p.height,
        0
      );
      const totalGaps = resolvedPanes.length * gapPercent;
      const totalBottomSpace = totalIndicatorHeight + totalGaps;

      // 4. Calculate Main Chart Height
      // Available space = chartAreaBottom - mainPaneTop;
      const totalAvailable = chartAreaBottom - mainPaneTop;
      mainHeightVal = totalAvailable - totalBottomSpace;

      // Safety check: ensure main chart has at least some space (e.g. 20%)
      if (mainHeightVal < 20) {
        mainHeightVal = Math.max(mainHeightVal, 10);
      }

      // 5. Calculate positions
      let currentTop = mainPaneTop + mainHeightVal + gapPercent;

      paneConfigs = resolvedPanes.map((p) => {
        const config = {
          index: p.index,
          height: p.height,
          top: currentTop,
          isCollapsed: p.isCollapsed,
          indicatorId: p.indicatorId,
          titleColor: p.titleColor,
        };
        currentTop += p.height + gapPercent;
        return config;
      });
    } else {
      mainHeightVal = chartAreaBottom - mainPaneTop;
    }

    // --- Generate Grids ---
    const grid: any[] = [];
    // Main Grid (index 0)
    grid.push({
      left: "10%",
      right: "10%",
      top: mainPaneTop + "%",
      height: mainHeightVal + "%",
      containLabel: false, // We handle margins explicitly
    });

    // Separate Panes Grids
    paneConfigs.forEach((pane) => {
      grid.push({
        left: "10%",
        right: "10%",
        top: pane.top + "%",
        height: pane.height + "%",
        containLabel: false,
      });
    });

    // --- Generate X-Axes ---
    const allXAxisIndices = [0, ...paneConfigs.map((_, i) => i + 1)];
    const xAxis: any[] = [];

    // Main X-Axis
    xAxis.push({
      type: "category",
      data: [], // Will be filled by SeriesBuilder or QFChart, or we pass data here?
      // Actually QFChart sets categoryData separately usually, but here we define the axis structure
      // Wait, QFChart sets `categoryData` in render. We should probably accept it or let caller set it.
      // Let's set the structure and let caller populate `data`.
      gridIndex: 0,
      scale: true,
      boundaryGap: false,
      axisLine: { onZero: false, lineStyle: { color: "#334155" } },
      splitLine: { show: true, lineStyle: { color: "#334155", opacity: 0.5 } },
      axisLabel: {
        color: "#94a3b8",
        fontFamily: options.fontFamily || "sans-serif",
      },
      axisPointer: { label: { show: false } }, // Hide date on main axis pointer to avoid duplication if we want
      // Actually user wanted date only on main chart.
    });

    // Separate Panes X-Axes
    paneConfigs.forEach((pane, i) => {
      xAxis.push({
        type: "category",
        gridIndex: i + 1, // 0 is main
        data: [], // Shared data
        axisLabel: { show: false }, // Hide labels on indicator panes
        axisLine: { show: !pane.isCollapsed, lineStyle: { color: "#334155" } },
        axisTick: { show: false },
        splitLine: { show: false },
        axisPointer: { label: { show: false } },
      });
    });

    // --- Generate Y-Axes ---
    const yAxis: any[] = [];
    // Main Y-Axis
    yAxis.push({
      position: "right",
      scale: true,
      gridIndex: 0,
      splitLine: { show: true, lineStyle: { color: "#334155", opacity: 0.5 } },
      axisLine: { lineStyle: { color: "#334155" } },
      axisLabel: {
        color: "#94a3b8",
        fontFamily: options.fontFamily || "sans-serif",
      },
    });

    // Separate Panes Y-Axes
    paneConfigs.forEach((pane, i) => {
      yAxis.push({
        position: "right",
        scale: true,
        gridIndex: i + 1,
        splitLine: {
          show: !pane.isCollapsed,
          lineStyle: { color: "#334155", opacity: 0.3 },
        },
        axisLabel: {
          show: !pane.isCollapsed,
          color: "#94a3b8",
          fontFamily: options.fontFamily || "sans-serif",
          fontSize: 10,
        },
        axisLine: { show: !pane.isCollapsed, lineStyle: { color: "#334155" } },
      });
    });

    // --- Generate DataZoom ---
    const dataZoom: any[] = [];
    if (dzVisible) {
      dataZoom.push({
        type: "inside",
        xAxisIndex: allXAxisIndices,
        start: 50,
        end: 100,
      });

      if (dzPosition === "top") {
        dataZoom.push({
          type: "slider",
          xAxisIndex: allXAxisIndices,
          top: "1%",
          height: dzHeight + "%",
          start: 50,
          end: 100,
          borderColor: "#334155",
          textStyle: { color: "#cbd5e1" },
          brushSelect: false,
        });
      } else {
        dataZoom.push({
          type: "slider",
          xAxisIndex: allXAxisIndices,
          bottom: "1%",
          height: dzHeight + "%",
          start: 50,
          end: 100,
          borderColor: "#334155",
          textStyle: { color: "#cbd5e1" },
          brushSelect: false,
        });
      }
    }

    return {
      grid,
      xAxis,
      yAxis,
      dataZoom,
      paneLayout: paneConfigs,
      mainPaneHeight: mainHeightVal,
      mainPaneTop,
      pixelToPercent,
    };
  }
}
