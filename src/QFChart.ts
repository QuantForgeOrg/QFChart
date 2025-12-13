import * as echarts from "echarts";
import {
  OHLCV,
  IndicatorPlot,
  QFChartOptions,
  IndicatorStyle,
  Indicator,
} from "./types";
import { textToBase64Image } from "./Utils";

export class QFChart {
  private chart: echarts.ECharts;
  private options: QFChartOptions;
  private marketData: OHLCV[] = [];
  private indicators: Map<string, Indicator> = new Map();
  private timeToIndex: Map<number, number> = new Map();

  // Default colors and constants
  private readonly upColor: string = "#00da3c";
  private readonly downColor: string = "#ec0000";
  private readonly defaultPadding = 0.2;
  private padding: number;

  // DOM Elements for Layout
  private rootContainer: HTMLElement;
  private layoutContainer: HTMLElement;
  private leftSidebar: HTMLElement;
  private rightSidebar: HTMLElement;
  private chartContainer: HTMLElement;

  constructor(container: HTMLElement, options: QFChartOptions = {}) {
    this.rootContainer = container;
    this.options = {
      title: "Market",
      backgroundColor: "#1e293b",
      upColor: "#00da3c",
      downColor: "#ec0000",
      fontColor: "#cbd5e1",
      fontFamily: "sans-serif",
      padding: 0.2,
      dataZoom: {
        visible: true,
        position: "top",
        height: 6,
      },
      tooltip: {
        position: "floating",
      },
      layout: {
        mainPaneHeight: "50%",
        gap: 13,
      },
      ...options,
    };

    if (this.options.upColor) this.upColor = this.options.upColor;
    if (this.options.downColor) this.downColor = this.options.downColor;
    this.padding =
      this.options.padding !== undefined
        ? this.options.padding
        : this.defaultPadding;

    if (this.options.height) {
      if (typeof this.options.height === "number") {
        this.rootContainer.style.height = `${this.options.height}px`;
      } else {
        this.rootContainer.style.height = this.options.height;
      }
    }

    // Initialize DOM Layout
    this.rootContainer.innerHTML = "";

    // Layout Container (Flex Row)
    this.layoutContainer = document.createElement("div");
    this.layoutContainer.style.display = "flex";
    this.layoutContainer.style.width = "100%";
    this.layoutContainer.style.height = "100%";
    this.layoutContainer.style.overflow = "hidden";
    this.rootContainer.appendChild(this.layoutContainer);

    // Left Sidebar
    this.leftSidebar = document.createElement("div");
    this.leftSidebar.style.display = "none";
    this.leftSidebar.style.width = "250px"; // Default width
    this.leftSidebar.style.flexShrink = "0";
    this.leftSidebar.style.overflowY = "auto";
    this.leftSidebar.style.backgroundColor =
      this.options.backgroundColor || "#1e293b";
    this.leftSidebar.style.borderRight = "1px solid #334155";
    this.leftSidebar.style.padding = "10px";
    this.leftSidebar.style.boxSizing = "border-box";
    this.leftSidebar.style.color = "#cbd5e1";
    this.leftSidebar.style.fontSize = "12px";
    this.leftSidebar.style.fontFamily = this.options.fontFamily || "sans-serif";
    this.layoutContainer.appendChild(this.leftSidebar);

    // Chart Container
    this.chartContainer = document.createElement("div");
    this.chartContainer.style.flexGrow = "1";
    this.chartContainer.style.height = "100%";
    this.chartContainer.style.overflow = "hidden";
    this.layoutContainer.appendChild(this.chartContainer);

    // Right Sidebar
    this.rightSidebar = document.createElement("div");
    this.rightSidebar.style.display = "none";
    this.rightSidebar.style.width = "250px";
    this.rightSidebar.style.flexShrink = "0";
    this.rightSidebar.style.overflowY = "auto";
    this.rightSidebar.style.backgroundColor =
      this.options.backgroundColor || "#1e293b";
    this.rightSidebar.style.borderLeft = "1px solid #334155";
    this.rightSidebar.style.padding = "10px";
    this.rightSidebar.style.boxSizing = "border-box";
    this.rightSidebar.style.color = "#cbd5e1";
    this.rightSidebar.style.fontSize = "12px";
    this.rightSidebar.style.fontFamily =
      this.options.fontFamily || "sans-serif";
    this.layoutContainer.appendChild(this.rightSidebar);

    this.chart = echarts.init(this.chartContainer);
    window.addEventListener("resize", this.resize.bind(this));
  }

  public setMarketData(data: OHLCV[]): void {
    this.marketData = data;
    this.rebuildTimeIndex();
    this.render();
  }

  public addIndicator(
    id: string,
    plots: { [name: string]: IndicatorPlot },
    options: {
      isOverlay?: boolean;
      height?: number;
      titleColor?: string;
    } = { isOverlay: false }
  ): void {
    const isOverlay = options.isOverlay ?? false;
    let paneIndex = 0;
    if (!isOverlay) {
      // Find the next available pane index
      // Start from 1, as 0 is the main chart
      let maxPaneIndex = 0;
      this.indicators.forEach((ind) => {
        if (ind.paneIndex > maxPaneIndex) {
          maxPaneIndex = ind.paneIndex;
        }
      });
      paneIndex = maxPaneIndex + 1;
    }

    // Create Indicator object
    const indicator: Indicator = {
      id,
      plots,
      paneIndex,
      height: options.height,
      collapsed: false,
      titleColor: options.titleColor,
    };

    this.indicators.set(id, indicator);
    this.render();
  }

  // Deprecated: keeping for compatibility if needed, but redirects to addIndicator logic
  public setIndicator(
    id: string,
    plot: IndicatorPlot,
    isOverlay: boolean = false
  ): void {
    // Wrap single plot into the new structure
    this.addIndicator(id, { [id]: plot }, { isOverlay });
  }

  public removeIndicator(id: string): void {
    this.indicators.delete(id);
    this.render();
  }

  public toggleIndicator(id: string): void {
    const indicator = this.indicators.get(id);
    if (indicator) {
      indicator.collapsed = !indicator.collapsed;
      this.render();
    }
  }

  public resize(): void {
    this.chart.resize();
  }

  public destroy(): void {
    window.removeEventListener("resize", this.resize.bind(this));
    this.chart.dispose();
  }

  private rebuildTimeIndex(): void {
    this.timeToIndex.clear();
    this.marketData.forEach((k, index) => {
      this.timeToIndex.set(k.time, index);
    });
  }

  private getCandlestickSeries(): any {
    const values = this.marketData.map((k) => [k.open, k.close, k.low, k.high]);

    return {
      name: "Market",
      type: "candlestick",
      data: values,
      itemStyle: {
        borderColor: this.upColor,
        borderColor0: this.downColor,
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: this.upColor + "88" }, // Add transparency
          { offset: 1, color: this.upColor },
        ]),
        color0: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: this.downColor + "88" },
          { offset: 1, color: this.downColor },
        ]),
      },
    };
  }

  private getIndicatorSeries(): any[] {
    const series: any[] = [];

    this.indicators.forEach((indicator) => {
      // For each plot in the indicator
      Object.entries(indicator.plots).forEach(([plotName, plot]) => {
        // Align data
        const dataArray = new Array(this.marketData.length).fill(null);
        const colorArray = new Array(this.marketData.length).fill(null);

        plot.data.forEach((point) => {
          let pointTime = point.time;
          if (pointTime < 10000000000) pointTime *= 1000;

          let index = this.timeToIndex.get(pointTime);
          if (index === undefined) {
            index = this.timeToIndex.get(Math.round(pointTime));
          }

          if (index !== undefined) {
            dataArray[index] = point.value;
            colorArray[index] = point.options?.color;
          }
        });

        // Pane configuration
        const paneIndex = indicator.paneIndex;
        const xAxisIndex = paneIndex;
        const yAxisIndex = paneIndex;

        // Unique series name combining indicator ID and plot name
        const seriesName = `${indicator.id}::${plotName}`;

        switch (plot.options.style) {
          case "columns":
          case "histogram":
            series.push({
              name: seriesName,
              type: "bar",
              xAxisIndex: xAxisIndex,
              yAxisIndex: yAxisIndex,
              barWidth: "70%",
              barGap: "-100%",
              barCategoryGap: "0%",
              large: true,
              data: dataArray.map((val, i) => ({
                value: val,
                itemStyle: colorArray[i]
                  ? { color: colorArray[i] }
                  : { color: (val ?? 0) >= 0 ? this.upColor : this.downColor },
              })),
              z: 2,
              emphasis: { disabled: true },
            });
            break;
          case "circles":
          case "cross":
            const isCross = plot.options.style === "cross";
            const scatterData = dataArray
              .map((val, i) => {
                if (val === null) return null;
                const pointColor = colorArray[i] || plot.options.color;
                const item: any = {
                  value: [i, val, pointColor],
                  itemStyle: { color: pointColor },
                };

                if (isCross) {
                  item.symbol = `image://${textToBase64Image(
                    "+",
                    pointColor,
                    "24px"
                  )}`;
                  item.symbolSize = 16;
                } else {
                  item.symbol = "circle";
                  item.symbolSize = 6;
                }
                return item;
              })
              .filter((item) => item !== null);

            series.push({
              name: seriesName,
              type: "scatter",
              xAxisIndex: xAxisIndex,
              yAxisIndex: yAxisIndex,
              data: scatterData,
            });
            break;
          case "background":
            series.push({
              name: seriesName,
              type: "custom",
              xAxisIndex: xAxisIndex,
              yAxisIndex: yAxisIndex,
              z: -10,
              renderItem: (params: any, api: any) => {
                const xVal = api.value(0); // The time/index
                if (isNaN(xVal)) return;

                // coordinate system is cartesian2d
                // We want full height of the coordinate system (grid)

                // Get point on axis
                const start = api.coord([xVal, 0]); // y doesn't matter much yet

                // Calculate width of one bar (category axis)
                // bandWidth gives the width of one category slot
                const size = api.size([1, 0]);
                const width = size[0];

                // Get grid rect
                // params.coordSys is the coordinate system info
                const rect = params.coordSys; // x, y, width, height of the grid

                // echarts provides: const sys = params.coordSys; sys.x, sys.y, sys.width, sys.height
                const sys = params.coordSys;
                // sys.x, sys.y are top-left of the grid
                // sys.width, sys.height are dimensions

                // We need the X pixel position of the current data point
                const x = start[0] - width / 2; // centered

                // Get color for this bar
                const barColor = colorArray[params.dataIndex];
                const val = api.value(1);

                // If no color, invalid color, or no value (falsy/zero), don't render
                if (!barColor || !val) {
                  return;
                }

                return {
                  type: "rect",
                  shape: {
                    x: x,
                    y: sys.y,
                    width: width,
                    height: sys.height,
                  },
                  style: {
                    fill: barColor,
                    opacity: 0.3, // default opacity if not specified
                  },
                  silent: true,
                };
              },
              data: dataArray.map((val, i) => [i, val]), // Pass actual value
            });
            break;

          case "line":
          default:
            series.push({
              name: seriesName,
              type: "line",
              xAxisIndex: xAxisIndex,
              yAxisIndex: yAxisIndex,
              smooth: true,
              showSymbol: false,
              data: dataArray.map((val, i) => ({
                value: val,
                itemStyle: colorArray[i] ? { color: colorArray[i] } : undefined,
              })),
              itemStyle: { color: plot.options.color },
              lineStyle: {
                width: plot.options.linewidth || 1,
                color: plot.options.color,
              },
            });
            break;
        }
      });
    });

    return series;
  }

  private generateTooltipHtml(params: any[]): string {
    if (!params || params.length === 0) return "";

    const marketName = this.options.title || "Market";

    // 1. Header: Date/Time (from the first param)
    const date = params[0].axisValue;
    let html = `<div style="font-weight: bold; margin-bottom: 5px; color: #cbd5e1;">${date}</div>`;

    // 2. Separate Market Data (Candlestick) from Indicators
    const marketSeries = params.find(
      (p: any) => p.seriesType === "candlestick"
    );
    const indicatorParams = params.filter(
      (p: any) => p.seriesType !== "candlestick"
    );

    // 3. Market Data Section
    if (marketSeries) {
      const [_, open, close, low, high] = marketSeries.value;
      const color = close >= open ? this.upColor : this.downColor;

      html += `
            <div style="margin-bottom: 8px;">
                <div style="display:flex; justify-content:space-between; color:${color}; font-weight:bold;">
                    <span>${marketName}</span>
                </div>
                <div style="display: grid; grid-template-columns: auto auto; gap: 2px 15px; font-size: 0.9em; color: #cbd5e1;">
                    <span>Open:</span> <span style="text-align: right; color: ${
                      close >= open ? this.upColor : this.downColor
                    }">${open}</span>
                    <span>High:</span> <span style="text-align: right; color: ${
                      this.upColor
                    }">${high}</span>
                    <span>Low:</span> <span style="text-align: right; color: ${
                      this.downColor
                    }">${low}</span>
                    <span>Close:</span> <span style="text-align: right; color: ${
                      close >= open ? this.upColor : this.downColor
                    }">${close}</span>
                </div>
            </div>
            `;
    }

    // 4. Indicators Section
    if (indicatorParams.length > 0) {
      html += `<div style="border-top: 1px solid #334155; margin: 5px 0; padding-top: 5px;"></div>`;

      // Group by Indicator ID (extracted from seriesName "ID::PlotName")
      const indicators: { [key: string]: any[] } = {};

      indicatorParams.forEach((p: any) => {
        const parts = p.seriesName.split("::");
        const indId = parts.length > 1 ? parts[0] : "Unknown";
        const plotName = parts.length > 1 ? parts[1] : p.seriesName;

        if (!indicators[indId]) indicators[indId] = [];
        indicators[indId].push({ ...p, displayName: plotName });
      });

      // Render groups
      Object.keys(indicators).forEach((indId) => {
        html += `
            <div style="margin-top: 8px;">
                <div style="font-weight:bold; color: #fff; margin-bottom: 2px;">${indId}</div>
            `;

        indicators[indId].forEach((p) => {
          let val = p.value;
          if (Array.isArray(val)) {
            val = val[1]; // Assuming [index, value]
          }

          if (val === null || val === undefined) return;

          const valStr =
            typeof val === "number"
              ? val.toLocaleString(undefined, { maximumFractionDigits: 4 })
              : val;

          html += `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px; padding-left: 8px;">
                    <div>${p.marker} <span style="color: #cbd5e1;">${p.displayName}</span></div>
                    <div style="font-size: 10px; color: #fff;padding-left:10px;">${valStr}</div>
                </div>`;
        });

        html += `</div>`;
      });
    }

    // For sidebars, we don't need the min-width wrapper as it adapts to sidebar width
    // But for floating tooltip, it's nice.
    return html;
  }

  private render(): void {
    if (this.marketData.length === 0) return;

    // --- Sidebar Layout Management ---
    const tooltipPos = this.options.tooltip?.position || "floating";
    const prevLeftDisplay = this.leftSidebar.style.display;
    const prevRightDisplay = this.rightSidebar.style.display;

    const newLeftDisplay = tooltipPos === "left" ? "block" : "none";
    const newRightDisplay = tooltipPos === "right" ? "block" : "none";

    // Only resize if visibility changed to avoid unnecessary reflows/resizes
    if (
      prevLeftDisplay !== newLeftDisplay ||
      prevRightDisplay !== newRightDisplay
    ) {
      this.leftSidebar.style.display = newLeftDisplay;
      this.rightSidebar.style.display = newRightDisplay;
      this.chart.resize();
    }
    // ---------------------------------

    const categoryData = this.marketData.map((k) =>
      new Date(k.time).toLocaleString()
    );
    const candlestickSeries = this.getCandlestickSeries();
    const indicatorSeries = this.getIndicatorSeries().filter((series: any) => {
      // Filter out series for collapsed indicators
      // Extract ID from name "ID::PlotName"
      const id = series.name.split("::")[0];
      const indicator = this.indicators.get(id);
      return !indicator?.collapsed;
    });

    // Identify unique separate panes (indices > 0) and sort them
    const separatePaneIndices = Array.from(this.indicators.values())
      .map((ind) => ind.paneIndex)
      .filter((idx) => idx > 0)
      .sort((a, b) => a - b)
      .filter((value, index, self) => self.indexOf(value) === index); // Unique

    const hasSeparatePane = separatePaneIndices.length > 0;

    // DataZoom Configuration
    const dzVisible = this.options.dataZoom?.visible ?? true;
    const dzPosition = this.options.dataZoom?.position ?? "top";
    const dzHeight = this.options.dataZoom?.height ?? 6;

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
    const containerHeight = this.chart.getHeight();
    let gapPercent = 5;
    let pixelToPercent = 0;
    if (containerHeight > 0) {
      gapPercent = (20 / containerHeight) * 100;
      pixelToPercent = (1 / containerHeight) * 100;
    }

    let mainHeightVal = 75; // Default if no separate pane

    // Prepare separate panes configuration
    let paneConfigs: {
      index: number;
      height: number;
      top: number;
      isCollapsed?: boolean;
      indicatorId?: string;
      titleColor?: string;
    }[] = [];

    if (hasSeparatePane) {
      // Resolve heights for all separate panes
      // 1. Identify panes and their requested heights
      const panes = separatePaneIndices.map((idx) => {
        const ind = Array.from(this.indicators.values()).find(
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
    }

    const graphic: any[] = [];

    // Main Chart Title
    const titleTopMargin = 10 * pixelToPercent;
    graphic.push({
      type: "text",
      left: "8.5%", // Align with grid left + small margin
      top: mainPaneTop + titleTopMargin + "%",
      z: 10,
      style: {
        text: this.options.title || "Market",
        fill: this.options.titleColor || "#fff",
        font: "bold 16px sans-serif",
        textVerticalAlign: "top",
      },
    });

    if (hasSeparatePane) {
      paneConfigs.forEach((pane) => {
        // Indicator Title
        graphic.push({
          type: "text",
          left: "8.5%",
          top: pane.top + titleTopMargin + "%",
          z: 10,
          style: {
            text: pane.indicatorId || "",
            fill: pane.titleColor || "#fff",
            font: "bold 12px sans-serif",
            textVerticalAlign: "top",
          },
        });

        // Add Graphic Toggle Button
        graphic.push({
          type: "group",
          right: "10.5%",
          top: pane.top + "%", // Position at top of the pane
          children: [
            {
              type: "rect",
              z: 100,
              left: "center",
              top: "center",
              shape: {
                width: 20,
                height: 20,
                r: 2,
              },
              style: {
                fill: "#334155",
                stroke: "#475569",
                lineWidth: 1,
              },
              onclick: () => {
                if (pane.indicatorId) {
                  this.toggleIndicator(pane.indicatorId);
                }
              },
            },
            {
              type: "text",
              z: 101,
              left: "center",
              top: "center",
              style: {
                text: pane.isCollapsed ? "+" : "−",
                fill: "#cbd5e1",
                font: "bold 14px sans-serif",
              },
              silent: true, // Let click pass to rect
            },
          ],
        });
      });
    }

    const grid: any = [
      {
        left: "8%",
        right: "10%",
        top: mainPaneTop + "%",
        height: mainHeightVal + "%",
      },
    ];

    const xAxis: any[] = [
      {
        type: "category",
        data: categoryData,
        scale: true,
        boundaryGap: false,
        axisLine: { onZero: false, lineStyle: { color: "#94a3b8" } },
        axisLabel: { color: "#94a3b8" },
        splitLine: { show: false },
        min: (value: { min: number; max: number }) => {
          const dataMin = value.min;
          const range = value.max - value.min;
          return dataMin + range * this.padding; // Add padding to left
        },
        max: (value: { min: number; max: number }) => {
          const dataMax = value.max;
          const range = value.max - value.min;
          return dataMax + range * this.padding; // Add padding to right
        },
        axisPointer: { z: 100 },
      },
    ];

    const yAxis: any[] = [
      {
        position: "right",
        scale: true,
        splitArea: {
          show: true,
          interval: (index: number) => index % 2 === 0,
          areaStyle: {
            color: ["rgba(45, 55, 72, 0.5)", "rgba(30, 41, 59, 0.8)"],
          },
        },
        axisLine: { lineStyle: { color: "#94a3b8" } },
        axisLabel: { color: "#94a3b8" },
        splitLine: { show: false },
      },
    ];

    if (hasSeparatePane) {
      paneConfigs.forEach((pane, i) => {
        grid.push({
          left: "8%",
          right: "10%",
          top: pane.top + "%",
          height: pane.height + "%",
        });

        // Axis indices for this pane should match paneIndex (which is > 0)
        xAxis.push({
          type: "category",
          gridIndex: 1 + i,
          data: categoryData,
          scale: true,
          boundaryGap: false,
          axisLine: { onZero: false, show: !pane.isCollapsed },
          axisTick: { show: false },
          splitLine: { show: false },
          axisLabel: { show: false },
          min: (value: { min: number; max: number }) => {
            const dataMin = value.min;
            const range = value.max - value.min;
            return dataMin + range * this.padding; // Add padding to left
          },
          max: (value: { min: number; max: number }) => {
            const dataMax = value.max;
            const range = value.max - value.min;
            return dataMax + range * this.padding; // Add padding to right
          },
          axisPointer: { label: { show: false } },
        });

        yAxis.push({
          position: "right",
          scale: true,
          gridIndex: 1 + i,
          splitNumber: 2,
          axisLabel: { show: !pane.isCollapsed, color: "#94a3b8" },
          axisLine: {
            show: !pane.isCollapsed,
            lineStyle: { color: "#94a3b8" },
          },
          axisTick: { show: false },
          splitLine: { show: false },
        });
      });
    }

    // Construct list of all x axes indices for dataZoom
    const allXAxisIndices = Array.from({ length: xAxis.length }, (_, i) => i);

    const dataZoom = [];
    if (dzVisible) {
      dataZoom.push({
        type: "inside",
        xAxisIndex: allXAxisIndices,
        start: 50,
        end: 100,
      });

      const sliderConfig: any = {
        show: true,
        xAxisIndex: allXAxisIndices,
        type: "slider",
        start: 0,
        end: 100,
        handleStyle: { color: "#475569" },
      };

      if (dzPosition === "top") {
        sliderConfig.top = "0%";
        sliderConfig.height = dzHeight + "%";
      } else {
        sliderConfig.bottom = "0%";
        sliderConfig.height = dzHeight + "%";
      }

      dataZoom.push(sliderConfig);
    }

    // --- Tooltip Formatter Wrapper ---
    const tooltipFormatter = (params: any[]) => {
      const html = this.generateTooltipHtml(params);
      const mode = this.options.tooltip?.position || "floating";

      if (mode === "left") {
        this.leftSidebar.innerHTML = html;
        return ""; // Hide tooltip box
      }
      if (mode === "right") {
        this.rightSidebar.innerHTML = html;
        return ""; // Hide tooltip box
      }
      // For floating, wrap in container
      return `<div style="min-width: 200px;">${html}</div>`;
    };

    const option: any = {
      backgroundColor: this.options.backgroundColor,
      animation: false,
      legend: {
        show: false, // Hide default legend as we use tooltip
      },
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "cross", label: { backgroundColor: "#475569" } },
        backgroundColor: "rgba(30, 41, 59, 0.9)",
        borderWidth: 1,
        borderColor: "#334155",
        padding: 10,
        textStyle: { color: "#fff" },
        formatter: tooltipFormatter,
        extraCssText:
          tooltipPos !== "floating" ? "display: none !important;" : undefined,
        position: (pos: any, params: any, el: any, elRect: any, size: any) => {
          const mode = this.options.tooltip?.position || "floating";
          if (mode === "floating") {
            const obj = { top: 10 };
            obj[
              ["left", "right"][
                +(pos[0] < size.viewSize[0] / 2)
              ] as keyof typeof obj
            ] = 30;
            return obj;
          }
          return null;
        },
      },
      axisPointer: {
        link: { xAxisIndex: "all" },
        label: { backgroundColor: "#475569" },
      },
      graphic: graphic,
      grid: grid,
      xAxis: xAxis,
      yAxis: yAxis,
      dataZoom: dataZoom,
      series: [candlestickSeries, ...indicatorSeries],
    };

    this.chart.setOption(option, true);
  }
}
