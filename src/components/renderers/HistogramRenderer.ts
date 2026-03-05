import { SeriesRenderer, RenderContext } from './SeriesRenderer';

export class HistogramRenderer implements SeriesRenderer {
    render(context: RenderContext): any {
        const { seriesName, xAxisIndex, yAxisIndex, dataArray, colorArray, plotOptions } = context;
        const defaultColor = '#2962ff';
        const histbase: number = plotOptions.histbase ?? 0;
        const isColumns = plotOptions.style === 'columns';
        const linewidth: number = plotOptions.linewidth ?? 1;

        // Build data array: [index, value, color]
        const customData = dataArray.map((val: number | null, i: number) => {
            if (val === null || val === undefined || (typeof val === 'number' && isNaN(val))) return null;
            return [i, val, colorArray[i] || plotOptions.color || defaultColor];
        });

        return {
            name: seriesName,
            type: 'custom',
            xAxisIndex: xAxisIndex,
            yAxisIndex: yAxisIndex,
            renderItem: (params: any, api: any) => {
                const idx = api.value(0);
                const value = api.value(1);
                const color = api.value(2);

                if (value === null || value === undefined || isNaN(value)) {
                    return null;
                }

                const basePos = api.coord([idx, histbase]);
                const valuePos = api.coord([idx, value]);
                const candleWidth = api.size([1, 0])[0];

                // Columns: thick bars (60% of candle width)
                // Histogram: thin bars — scale with linewidth (like TradingView)
                let barWidth: number;
                if (isColumns) {
                    barWidth = candleWidth * 0.6;
                } else {
                    // Thin line-like bars: linewidth controls pixel width (min 1px)
                    barWidth = Math.max(1, linewidth);
                }

                const x = basePos[0];
                const yBase = basePos[1];
                const yValue = valuePos[1];
                const top = Math.min(yBase, yValue);
                const height = Math.abs(yValue - yBase);

                return {
                    type: 'rect',
                    shape: {
                        x: x - barWidth / 2,
                        y: top,
                        width: barWidth,
                        height: height || 1, // Minimum 1px for zero-height bars
                    },
                    style: {
                        fill: color,
                    },
                };
            },
            data: customData.filter((d: any) => d !== null),
        };
    }
}
