import * as echarts from "echarts";
import {
  OHLCV,
  IndicatorPlot,
  QFChartOptions,
  Indicator as IndicatorInterface,
  ChartContext,
  Plugin,
} from "./types";
import { Indicator } from "./components/Indicator";
import { LayoutManager } from "./components/LayoutManager";
import { SeriesBuilder } from "./components/SeriesBuilder";
import { GraphicBuilder } from "./components/GraphicBuilder";
import { TooltipFormatter } from "./components/TooltipFormatter";
import { PluginManager } from "./components/PluginManager";
import { EventBus } from "./utils/EventBus";

export class QFChart implements ChartContext {
  private chart: echarts.ECharts;
  private options: QFChartOptions;
  private marketData: OHLCV[] = [];
  private indicators: Map<string, Indicator> = new Map();
  private timeToIndex: Map<number, number> = new Map();
  private pluginManager: PluginManager;
  public events: EventBus = new EventBus();

  // Drawing System
  private drawings: import("./types").DrawingElement[] = [];

  public coordinateConversion = {
    pixelToData: (point: { x: number; y: number }) => {
      // Find which grid/pane the point is in
      // We iterate through all panes (series indices usually match pane indices for base series)
      // Actually, we need to know how many panes there are.
      // We can use the layout logic or just check grid indices.
      // ECharts instance has getOption().
      const option = this.chart.getOption() as any;
      if (!option || !option.grid) return null;

      const gridCount = option.grid.length;
      for (let i = 0; i < gridCount; i++) {
        if (this.chart.containPixel({ gridIndex: i }, [point.x, point.y])) {
          // Found the pane
          const p = this.chart.convertFromPixel({ seriesIndex: i }, [
            point.x,
            point.y,
          ]);
          // Note: convertFromPixel might need seriesIndex or gridIndex depending on setup.
          // Using gridIndex in convertFromPixel is supported in newer ECharts but sometimes tricky.
          // Since we have one base series per pane (candlestick at 0, indicators at 1+),
          // assuming seriesIndex = gridIndex usually works if they are mapped 1:1.
          // Wait, candlestick is series 0. Indicators are subsequent series.
          // Series index != grid index necessarily.
          // BUT we can use { gridIndex: i } for convertFromPixel too!
          const pGrid = this.chart.convertFromPixel({ gridIndex: i }, [
            point.x,
            point.y,
          ]);

          if (pGrid) {
            return { timeIndex: pGrid[0], value: pGrid[1], paneIndex: i };
          }
        }
      }
      return null;
    },
    dataToPixel: (point: {
      timeIndex: number;
      value: number;
      paneIndex?: number;
    }) => {
      const paneIdx = point.paneIndex || 0;
      const p = this.chart.convertToPixel({ gridIndex: paneIdx }, [
        point.timeIndex,
        point.value,
      ]);
      if (p) {
        return { x: p[0], y: p[1] };
      }
      return null;
    },
  };

  // Default colors and constants
  private readonly upColor: string = "#00da3c";
  private readonly downColor: string = "#ec0000";
  private readonly defaultPadding = 0.2;
  private padding: number;

  // DOM Elements for Layout
  private rootContainer: HTMLElement;
  private layoutContainer: HTMLElement;
  private toolbarContainer: HTMLElement; // New Toolbar
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

    // Toolbar Container
    this.toolbarContainer = document.createElement("div");
    this.layoutContainer.appendChild(this.toolbarContainer);

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
    this.pluginManager = new PluginManager(this, this.toolbarContainer);

    // Bind global chart/ZRender events to the EventBus
    this.chart.on("dataZoom", (params: any) =>
      this.events.emit("chart:dataZoom", params)
    );
    this.chart.on("finished", (params: any) =>
      this.events.emit("chart:updated", params)
    ); // General chart update
    this.chart
      .getZr()
      .on("mousedown", (params: any) => this.events.emit("mouse:down", params));
    this.chart
      .getZr()
      .on("mousemove", (params: any) => this.events.emit("mouse:move", params));
    this.chart
      .getZr()
      .on("mouseup", (params: any) => this.events.emit("mouse:up", params));
    this.chart
      .getZr()
      .on("click", (params: any) => this.events.emit("mouse:click", params));

    window.addEventListener("resize", this.resize.bind(this));
  }

  // --- Plugin System Integration ---

  public getChart(): echarts.ECharts {
    return this.chart;
  }

  public getMarketData(): OHLCV[] {
    return this.marketData;
  }

  public getTimeToIndex(): Map<number, number> {
    return this.timeToIndex;
  }

  public getOptions(): QFChartOptions {
    return this.options;
  }

  public disableTools(): void {
    this.pluginManager.deactivatePlugin();
  }

  public registerPlugin(plugin: Plugin): void {
    this.pluginManager.register(plugin);
  }

  // --- Drawing System ---

  public addDrawing(drawing: import("./types").DrawingElement): void {
    this.drawings.push(drawing);
    this.render(); // Re-render to show new drawing
  }

  public removeDrawing(id: string): void {
    this.drawings = this.drawings.filter((d) => d.id !== id);
    this.render();
  }

  // --------------------------------

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
    const indicator = new Indicator(id, plots, paneIndex, {
      height: options.height,
      collapsed: false,
      titleColor: options.titleColor,
    });

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
      indicator.toggleCollapse();
      this.render();
    }
  }

  public resize(): void {
    this.chart.resize();
  }

  public destroy(): void {
    window.removeEventListener("resize", this.resize.bind(this));
    this.pluginManager.deactivatePlugin(); // Cleanup active tool
    this.chart.dispose();
  }

  private rebuildTimeIndex(): void {
    this.timeToIndex.clear();
    this.marketData.forEach((k, index) => {
      this.timeToIndex.set(k.time, index);
    });
  }

  private render(): void {
    if (this.marketData.length === 0) return;

    // Capture current zoom state before rebuilding options
    let currentZoomState: { start: number; end: number } | null = null;
    try {
      const currentOption = this.chart.getOption() as any;
      if (
        currentOption &&
        currentOption.dataZoom &&
        currentOption.dataZoom.length > 0
      ) {
        // Find the slider or inside zoom component that controls the x-axis
        const zoomComponent = currentOption.dataZoom.find(
          (dz: any) => dz.type === "slider" || dz.type === "inside"
        );
        if (zoomComponent) {
          currentZoomState = {
            start: zoomComponent.start,
            end: zoomComponent.end,
          };
        }
      }
    } catch (e) {
      // Chart might not be initialized yet
    }

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

    // 1. Calculate Layout
    const layout = LayoutManager.calculate(
      this.chart.getHeight(),
      this.indicators,
      this.options
    );

    // Apply preserved zoom state if available
    if (currentZoomState && layout.dataZoom) {
      layout.dataZoom.forEach((dz) => {
        dz.start = currentZoomState!.start;
        dz.end = currentZoomState!.end;
      });
    }

    // Patch X-Axis with Data and Padding
    layout.xAxis.forEach((axis) => {
      axis.data = categoryData;
      axis.min = (value: { min: number; max: number }) => {
        const dataMin = value.min;
        const range = value.max - value.min;
        return dataMin + range * this.padding;
      };
      axis.max = (value: { min: number; max: number }) => {
        const dataMax = value.max;
        const range = value.max - value.min;
        return dataMax + range * this.padding;
      };
    });

    // 2. Build Series
    const candlestickSeries = SeriesBuilder.buildCandlestickSeries(
      this.marketData,
      this.options
    );

    const indicatorSeries = SeriesBuilder.buildIndicatorSeries(
      this.indicators,
      this.timeToIndex,
      layout.paneLayout,
      this.marketData.length
    );

    // 3. Build Graphics
    const graphic = GraphicBuilder.build(
      layout,
      this.options,
      this.toggleIndicator.bind(this)
    );

    // 4. Build Drawings Series (One Custom Series per Pane used)
    const drawingsByPane = new Map<
      number,
      import("./types").DrawingElement[]
    >();
    this.drawings.forEach((d) => {
      const paneIdx = d.paneIndex || 0;
      if (!drawingsByPane.has(paneIdx)) {
        drawingsByPane.set(paneIdx, []);
      }
      drawingsByPane.get(paneIdx)!.push(d);
    });

    const drawingSeriesList: any[] = [];
    drawingsByPane.forEach((drawings, paneIndex) => {
      drawingSeriesList.push({
        type: "custom",
        name: `drawings-pane-${paneIndex}`,
        xAxisIndex: paneIndex,
        yAxisIndex: paneIndex,
        renderItem: (params: any, api: any) => {
          const drawing = drawings[params.dataIndex];
          if (!drawing) return;

          const start = drawing.points[0];
          const end = drawing.points[1];

          if (!start || !end) return;

          const p1 = api.coord([start.timeIndex, start.value]);
          const p2 = api.coord([end.timeIndex, end.value]);

          if (drawing.type === "line") {
            return {
              type: "group",
              children: [
                {
                  type: "line",
                  shape: {
                    x1: p1[0],
                    y1: p1[1],
                    x2: p2[0],
                    y2: p2[1],
                  },
                  style: {
                    stroke: drawing.style?.color || "#3b82f6",
                    lineWidth: drawing.style?.lineWidth || 2,
                  },
                },
                {
                  type: "circle",
                  shape: { cx: p1[0], cy: p1[1], r: 4 },
                  style: {
                    fill: "#fff",
                    stroke: drawing.style?.color || "#3b82f6",
                    lineWidth: 1,
                  },
                },
                {
                  type: "circle",
                  shape: { cx: p2[0], cy: p2[1], r: 4 },
                  style: {
                    fill: "#fff",
                    stroke: drawing.style?.color || "#3b82f6",
                    lineWidth: 1,
                  },
                },
              ],
            };
          }
        },
        data: drawings.map((d) => [
          d.points[0].timeIndex,
          d.points[0].value,
          d.points[1].timeIndex,
          d.points[1].value,
        ]),
        z: 100,
        silent: true,
      });
    });

    // 5. Tooltip Formatter
    const tooltipFormatter = (params: any[]) => {
      const html = TooltipFormatter.format(params, this.options);
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
        textStyle: {
          color: "#fff",
          fontFamily: this.options.fontFamily || "sans-serif",
        },
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
      grid: layout.grid,
      xAxis: layout.xAxis,
      yAxis: layout.yAxis,
      dataZoom: layout.dataZoom,
      series: [candlestickSeries, ...indicatorSeries, ...drawingSeriesList],
    };

    // Note: We should preserve any extra options (like custom graphics from plugins)
    // For now, plugins will inject graphics directly via setOption or we might need a hook.
    // The current design implies plugins use the echarts instance directly, which is fine.
    // However, if we call setOption here with `true` (not merge), it will wipe plugin graphics.
    // We should probably change `true` to `false` or let plugins re-render.
    // For this implementation, I'll stick to `true` (reset) and assume plugins handle their own state
    // or we might need to change this behavior if plugin graphics disappear on re-render.
    // Ideally, `setMarketData` or `addIndicator` causes full re-render.
    // If a plugin has active graphics, they might be cleared.
    // But typically drawing tools are transient or added as persistent components.
    // For the "Measure" tool, it's temporary interaction. If data updates while measuring, it might be tricky.
    // Let's assume standard flow for now.

    this.chart.setOption(option, true); // true = not merge, replace.
  }
}
