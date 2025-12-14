import { LayoutResult } from "./LayoutManager";
import { QFChartOptions } from "../types";

export class GraphicBuilder {
  public static build(
    layout: LayoutResult,
    options: QFChartOptions,
    onToggle: (id: string) => void
  ): any[] {
    const graphic: any[] = [];
    const pixelToPercent = layout.pixelToPercent;
    const mainPaneTop = layout.mainPaneTop;

    // Main Chart Title
    const titleTopMargin = 10 * pixelToPercent;
    graphic.push({
      type: "text",
      left: "8.5%", // Align with grid left + small margin
      top: mainPaneTop + titleTopMargin + "%",
      z: 10,
      style: {
        text: options.title || "Market",
        fill: options.titleColor || "#fff",
        font: `bold 16px ${options.fontFamily || "sans-serif"}`,
        textVerticalAlign: "top",
      },
    });

    // Indicator Panes
    layout.paneLayout.forEach((pane) => {
      // Title
      graphic.push({
        type: "text",
        left: "8.5%",
        top: pane.top + titleTopMargin + "%",
        z: 10,
        style: {
          text: pane.indicatorId || "",
          fill: pane.titleColor || "#fff",
          font: `bold 12px ${options.fontFamily || "sans-serif"}`,
          textVerticalAlign: "top",
        },
      });

      // Toggle Button
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
                onToggle(pane.indicatorId);
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
              font: `bold 14px ${options.fontFamily || "sans-serif"}`,
            },
            silent: true, // Let click pass to rect
          },
        ],
      });
    });

    return graphic;
  }
}

