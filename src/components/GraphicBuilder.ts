import { LayoutResult } from "./LayoutManager";
import { QFChartOptions } from "../types";

export class GraphicBuilder {
  public static build(
    layout: LayoutResult,
    options: QFChartOptions,
    onToggle: (
      id: string,
      action?: "collapse" | "maximize" | "fullscreen"
    ) => void,
    isMainCollapsed: boolean = false,
    maximizedPaneId: string | null = null
  ): any[] {
    const graphic: any[] = [];
    const pixelToPercent = layout.pixelToPercent;
    const mainPaneTop = layout.mainPaneTop;

    // Main Chart Title (Only if main chart is visible or maximized)
    // If maximizedPaneId is set and NOT main, main title should be hidden?
    // With current LayoutManager logic, if maximizedPaneId !== main, mainPaneHeight is 0.
    // We should check heights or IDs.

    const showMain = !maximizedPaneId || maximizedPaneId === "main";

    if (showMain) {
      const titleTopMargin = 10 * pixelToPercent;
      graphic.push({
        type: "text",
        left: "8.5%",
        top: mainPaneTop + titleTopMargin + "%",
        z: 10,
        style: {
          text: options.title || "Market",
          fill: options.titleColor || "#fff",
          font: `bold 16px ${options.fontFamily || "sans-serif"}`,
          textVerticalAlign: "top",
        },
      });

      // Main Controls Group
      const controls: any[] = [];

      // Collapse Button
      if (options.controls?.collapse) {
        controls.push({
          type: "group",
          children: [
            {
              type: "rect",
              shape: { width: 20, height: 20, r: 2 },
              style: { fill: "#334155", stroke: "#475569", lineWidth: 1 },
              onclick: () => onToggle("main", "collapse"),
            },
            {
              type: "text",
              style: {
                text: isMainCollapsed ? "+" : "−",
                fill: "#cbd5e1",
                font: `bold 14px ${options.fontFamily}`,
                x: 10,
                y: 10,
                textAlign: "center",
                textVerticalAlign: "middle",
              },
              silent: true,
            },
          ],
        });
      }

      // Maximize Button
      if (options.controls?.maximize) {
        const isMaximized = maximizedPaneId === "main";
        // Shift x position if collapse button exists
        const xOffset = options.controls?.collapse ? 25 : 0;

        controls.push({
          type: "group",
          x: xOffset,
          children: [
            {
              type: "rect",
              shape: { width: 20, height: 20, r: 2 },
              style: { fill: "#334155", stroke: "#475569", lineWidth: 1 },
              onclick: () => onToggle("main", "maximize"),
            },
            {
              type: "text",
              style: {
                text: isMaximized ? "❐" : "□", // Simple chars for now
                fill: "#cbd5e1",
                font: `14px ${options.fontFamily}`,
                x: 10,
                y: 10,
                textAlign: "center",
                textVerticalAlign: "middle",
              },
              silent: true,
            },
          ],
        });
      }

      // Fullscreen Button
      if (options.controls?.fullscreen) {
        let xOffset = 0;
        if (options.controls?.collapse) xOffset += 25;
        if (options.controls?.maximize) xOffset += 25;

        controls.push({
          type: "group",
          x: xOffset,
          children: [
            {
              type: "rect",
              shape: { width: 20, height: 20, r: 2 },
              style: { fill: "#334155", stroke: "#475569", lineWidth: 1 },
              onclick: () => onToggle("main", "fullscreen"),
            },
            {
              type: "text",
              style: {
                text: "⛶",
                fill: "#cbd5e1",
                font: `14px ${options.fontFamily}`,
                x: 10,
                y: 10,
                textAlign: "center",
                textVerticalAlign: "middle",
              },
              silent: true,
            },
          ],
        });
      }

      if (controls.length > 0) {
        graphic.push({
          type: "group",
          right: "10.5%",
          top: mainPaneTop + "%",
          children: controls,
        });
      }
    }

    // Indicator Panes
    layout.paneLayout.forEach((pane) => {
      // If maximizedPaneId is set, and this is NOT the maximized pane, skip rendering its controls
      if (maximizedPaneId && pane.indicatorId !== maximizedPaneId) {
        return;
      }

      // Title
      graphic.push({
        type: "text",
        left: "8.5%",
        top: pane.top + 10 * pixelToPercent + "%",
        z: 10,
        style: {
          text: pane.indicatorId || "",
          fill: pane.titleColor || "#fff",
          font: `bold 12px ${options.fontFamily || "sans-serif"}`,
          textVerticalAlign: "top",
        },
      });

      // Controls
      const controls: any[] = [];

      // Collapse
      if (pane.controls?.collapse) {
        controls.push({
          type: "group",
          children: [
            {
              type: "rect",
              shape: { width: 20, height: 20, r: 2 },
              style: { fill: "#334155", stroke: "#475569", lineWidth: 1 },
              onclick: () =>
                pane.indicatorId && onToggle(pane.indicatorId, "collapse"),
            },
            {
              type: "text",
              style: {
                text: pane.isCollapsed ? "+" : "−",
                fill: "#cbd5e1",
                font: `bold 14px ${options.fontFamily}`,
                x: 10,
                y: 10,
                textAlign: "center",
                textVerticalAlign: "middle",
              },
              silent: true,
            },
          ],
        });
      }

      // Maximize
      if (pane.controls?.maximize) {
        // Assuming we add maximize to Indicator controls
        const isMaximized = maximizedPaneId === pane.indicatorId;
        const xOffset = pane.controls?.collapse ? 25 : 0;

        controls.push({
          type: "group",
          x: xOffset,
          children: [
            {
              type: "rect",
              shape: { width: 20, height: 20, r: 2 },
              style: { fill: "#334155", stroke: "#475569", lineWidth: 1 },
              onclick: () =>
                pane.indicatorId && onToggle(pane.indicatorId, "maximize"),
            },
            {
              type: "text",
              style: {
                text: isMaximized ? "❐" : "□",
                fill: "#cbd5e1",
                font: `14px ${options.fontFamily}`,
                x: 10,
                y: 10,
                textAlign: "center",
                textVerticalAlign: "middle",
              },
              silent: true,
            },
          ],
        });
      }

      if (controls.length > 0) {
        graphic.push({
          type: "group",
          right: "10.5%",
          top: pane.top + "%",
          children: controls,
        });
      }
    });

    return graphic;
  }
}
