import { QFChartOptions } from "../types";

export class TooltipFormatter {
  public static format(params: any[], options: QFChartOptions): string {
    if (!params || params.length === 0) return "";

    const marketName = options.title || "Market";
    const upColor = options.upColor || "#00da3c";
    const downColor = options.downColor || "#ec0000";
    const fontFamily = options.fontFamily || "sans-serif";

    // 1. Header: Date/Time (from the first param)
    const date = params[0].axisValue;
    let html = `<div style="font-weight: bold; margin-bottom: 5px; color: #cbd5e1; font-family: ${fontFamily};">${date}</div>`;

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
      const color = close >= open ? upColor : downColor;

      html += `
            <div style="margin-bottom: 8px; font-family: ${fontFamily};">
                <div style="display:flex; justify-content:space-between; color:${color}; font-weight:bold;">
                    <span>${marketName}</span>
                </div>
                <div style="display: grid; grid-template-columns: auto auto; gap: 2px 15px; font-size: 0.9em; color: #cbd5e1;">
                    <span>Open:</span> <span style="text-align: right; color: ${
                      close >= open ? upColor : downColor
                    }">${open}</span>
                    <span>High:</span> <span style="text-align: right; color: ${upColor}">${high}</span>
                    <span>Low:</span> <span style="text-align: right; color: ${downColor}">${low}</span>
                    <span>Close:</span> <span style="text-align: right; color: ${
                      close >= open ? upColor : downColor
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
            <div style="margin-top: 8px; font-family: ${fontFamily};">
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

    return html;
  }
}
