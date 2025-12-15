import * as echarts from "echarts";
import { AbstractPlugin } from "../components/AbstractPlugin";

export class FibonacciTool extends AbstractPlugin {
  private startPoint: number[] | null = null;
  private endPoint: number[] | null = null;
  private state: "idle" | "drawing" | "finished" = "idle";

  // Temporary ZRender elements
  private graphicGroup: any = null;

  // Fib levels config
  private readonly levels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
  private readonly colors = [
    "#787b86", // 0
    "#f44336", // 0.236
    "#ff9800", // 0.382
    "#4caf50", // 0.5
    "#2196f3", // 0.618
    "#00bcd4", // 0.786
    "#787b86", // 1
  ];

  constructor(options: { name?: string; icon?: string } = {}) {
    super({
      id: "fibonacci-tool",
      name: options.name || "Fibonacci Retracement",
      icon:
        options.icon ||
        `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e3e3e3"><path d="M120-80v-80h720v80H120Zm0-240v-80h720v80H120Zm0-240v-80h720v80H120Zm0-240v-80h720v80H120Z"/></svg>`,
    });
  }

  public onActivate(): void {
    this.state = "idle";
    this.startPoint = null;
    this.endPoint = null;
    this.context.getChart().getZr().setCursorStyle("crosshair");
    this.bindEvents();
  }

  public onDeactivate(): void {
    this.state = "idle";
    this.startPoint = null;
    this.endPoint = null;
    this.removeGraphic();
    this.unbindEvents();
    this.context.getChart().getZr().setCursorStyle("default");
  }

  private bindEvents() {
    const zr = this.context.getChart().getZr();
    zr.on("click", this.onClick);
    zr.on("mousemove", this.onMouseMove);
  }

  private unbindEvents() {
    const zr = this.context.getChart().getZr();
    zr.off("click", this.onClick);
    zr.off("mousemove", this.onMouseMove);
  }

  private onClick = (params: any) => {
    if (this.state === "idle") {
      this.state = "drawing";
      this.startPoint = [params.offsetX, params.offsetY];
      this.endPoint = [params.offsetX, params.offsetY];
      this.initGraphic();
      this.updateGraphic();
    } else if (this.state === "drawing") {
      this.state = "finished";
      this.endPoint = [params.offsetX, params.offsetY];
      this.updateGraphic();
      this.saveDrawing();

      // Cleanup local graphic and deactivate
      this.removeGraphic();
      this.context.disableTools();
    }
  };

  private onMouseMove = (params: any) => {
    if (this.state === "drawing") {
      this.endPoint = [params.offsetX, params.offsetY];
      this.updateGraphic();
    }
  };

  private initGraphic() {
    this.graphicGroup = new echarts.graphic.Group();
    this.context.getChart().getZr().add(this.graphicGroup);
  }

  private removeGraphic() {
    if (this.graphicGroup) {
      this.context.getChart().getZr().remove(this.graphicGroup);
      this.graphicGroup = null;
    }
  }

  private updateGraphic() {
    if (!this.graphicGroup || !this.startPoint || !this.endPoint) return;
    this.graphicGroup.removeAll();

    const x1 = this.startPoint[0];
    const y1 = this.startPoint[1];
    const x2 = this.endPoint[0];
    const y2 = this.endPoint[1];

    // Diagonal trend line
    const trendLine = new echarts.graphic.Line({
      shape: { x1, y1, x2, y2 },
      style: {
        stroke: "#999",
        lineWidth: 1,
        lineDash: [4, 4],
      },
      silent: true,
    });
    this.graphicGroup.add(trendLine);

    // Levels
    const startX = Math.min(x1, x2);
    const endX = Math.max(x1, x2);
    const width = endX - startX;

    // Y range
    const diffY = y2 - y1; // Pixel difference

    this.levels.forEach((level, index) => {
      const levelY = y2 - diffY * level;

      const color = this.colors[index % this.colors.length];

      // Line
      const line = new echarts.graphic.Line({
        shape: { x1: startX, y1: levelY, x2: endX, y2: levelY },
        style: {
          stroke: color,
          lineWidth: 1,
        },
        silent: true,
      });
      this.graphicGroup.add(line);

      if (index < this.levels.length - 1) {
        const nextLevel = this.levels[index + 1];
        const nextY = y2 - diffY * nextLevel;
        const rectH = Math.abs(nextY - levelY);
        const rectY = Math.min(levelY, nextY);

        const rect = new echarts.graphic.Rect({
          shape: { x: startX, y: rectY, width, height: rectH },
          style: {
            fill: this.colors[(index + 1) % this.colors.length], // Use next level's color
            opacity: 0.1,
          },
          silent: true,
        });
        this.graphicGroup.add(rect);
      }
    });
  }

  private saveDrawing() {
    if (!this.startPoint || !this.endPoint) return;

    const start = this.context.coordinateConversion.pixelToData({
      x: this.startPoint[0],
      y: this.startPoint[1],
    });
    const end = this.context.coordinateConversion.pixelToData({
      x: this.endPoint[0],
      y: this.endPoint[1],
    });

    if (start && end) {
      const paneIndex = start.paneIndex || 0;

      this.context.addDrawing({
        id: `fib-${Date.now()}`,
        type: "fibonacci",
        points: [start, end],
        paneIndex: paneIndex,
        style: {
          color: "#3b82f6", // Default color, though individual lines use specific colors
          lineWidth: 1,
        },
      });
    }
  }
}
