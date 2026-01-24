import { SeriesRenderer, RenderContext } from './SeriesRenderer';
import { ColorUtils } from '../../utils/ColorUtils';

export class FillRenderer implements SeriesRenderer {
    render(context: RenderContext): any {
        const { seriesName, xAxisIndex, yAxisIndex, plotOptions, plotDataArrays, indicatorId, plotName } = context;
        const totalDataLength = context.dataArray.length; // Use length from dataArray placeholder

        // Fill plots reference other plots to fill the area between them
        const plot1Key = plotOptions.plot1 ? `${indicatorId}::${plotOptions.plot1}` : null;
        const plot2Key = plotOptions.plot2 ? `${indicatorId}::${plotOptions.plot2}` : null;

        if (!plot1Key || !plot2Key) {
            console.warn(`Fill plot "${plotName}" missing plot1 or plot2 reference`);
            return null;
        }

        const plot1Data = plotDataArrays?.get(plot1Key);
        const plot2Data = plotDataArrays?.get(plot2Key);

        if (!plot1Data || !plot2Data) {
            console.warn(`Fill plot "${plotName}" references non-existent plots: ${plotOptions.plot1}, ${plotOptions.plot2}`);
            return null;
        }

        // Parse color to extract opacity
        const { color: fillColor, opacity: fillOpacity } = ColorUtils.parseColor(plotOptions.color || 'rgba(128, 128, 128, 0.2)');

        // Create fill data with previous values for smooth polygon rendering
        const fillDataWithPrev: any[] = [];
        for (let i = 0; i < totalDataLength; i++) {
            const y1 = plot1Data[i];
            const y2 = plot2Data[i];
            const prevY1 = i > 0 ? plot1Data[i - 1] : null;
            const prevY2 = i > 0 ? plot2Data[i - 1] : null;

            fillDataWithPrev.push([i, y1, y2, prevY1, prevY2]);
        }

        // Add fill series with smooth area rendering
        return {
            name: seriesName,
            type: 'custom',
            xAxisIndex: xAxisIndex,
            yAxisIndex: yAxisIndex,
            z: -5, // Render behind lines but above background
            renderItem: (params: any, api: any) => {
                const index = params.dataIndex;

                // Skip first point (no previous to connect to)
                if (index === 0) return null;

                const y1 = api.value(1); // Current upper
                const y2 = api.value(2); // Current lower
                const prevY1 = api.value(3); // Previous upper
                const prevY2 = api.value(4); // Previous lower

                // Skip if any value is null/NaN
                if (
                    y1 === null ||
                    y2 === null ||
                    prevY1 === null ||
                    prevY2 === null ||
                    isNaN(y1) ||
                    isNaN(y2) ||
                    isNaN(prevY1) ||
                    isNaN(prevY2)
                ) {
                    return null;
                }

                // Get pixel coordinates for all 4 points
                const p1Prev = api.coord([index - 1, prevY1]); // Previous upper
                const p1Curr = api.coord([index, y1]); // Current upper
                const p2Curr = api.coord([index, y2]); // Current lower
                const p2Prev = api.coord([index - 1, prevY2]); // Previous lower

                // Create a smooth polygon connecting the segments
                return {
                    type: 'polygon',
                    shape: {
                        points: [
                            p1Prev, // Top-left
                            p1Curr, // Top-right
                            p2Curr, // Bottom-right
                            p2Prev, // Bottom-left
                        ],
                    },
                    style: {
                        fill: fillColor,
                        opacity: fillOpacity,
                    },
                    silent: true,
                };
            },
            data: fillDataWithPrev,
        };
    }
}
