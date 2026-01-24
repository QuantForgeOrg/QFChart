import { SeriesRenderer, RenderContext } from './SeriesRenderer';

export class LineRenderer implements SeriesRenderer {
    render(context: RenderContext): any {
        const { seriesName, xAxisIndex, yAxisIndex, dataArray, colorArray, plotOptions } = context;
        const defaultColor = '#2962ff';

        return {
            name: seriesName,
            type: 'custom',
            xAxisIndex: xAxisIndex,
            yAxisIndex: yAxisIndex,
            renderItem: (params: any, api: any) => {
                const index = params.dataIndex;
                if (index === 0) return; // Need at least two points for a line segment

                const y2 = api.value(1);
                const y1 = api.value(2); // We'll store prevValue in the data

                if (y2 === null || isNaN(y2) || y1 === null || isNaN(y1)) return;

                const p1 = api.coord([index - 1, y1]);
                const p2 = api.coord([index, y2]);

                return {
                    type: 'line',
                    shape: {
                        x1: p1[0],
                        y1: p1[1],
                        x2: p2[0],
                        y2: p2[1],
                    },
                    style: {
                        stroke: colorArray[index] || plotOptions.color || defaultColor,
                        lineWidth: plotOptions.linewidth || 1,
                    },
                    silent: true,
                };
            },
            // Data format: [index, value, prevValue]
            data: dataArray.map((val, i) => [i, val, i > 0 ? dataArray[i - 1] : null]),
        };
    }
}
