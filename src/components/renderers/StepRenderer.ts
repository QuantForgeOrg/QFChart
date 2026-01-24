import { SeriesRenderer, RenderContext } from './SeriesRenderer';

export class StepRenderer implements SeriesRenderer {
    render(context: RenderContext): any {
        const { seriesName, xAxisIndex, yAxisIndex, dataArray, colorArray, plotOptions } = context;
        const defaultColor = '#2962ff';

        return {
            name: seriesName,
            type: 'custom',
            xAxisIndex: xAxisIndex,
            yAxisIndex: yAxisIndex,
            renderItem: (params: any, api: any) => {
                const x = api.value(0);
                const y = api.value(1);
                if (isNaN(y) || y === null) return;

                const coords = api.coord([x, y]);
                const width = api.size([1, 0])[0];

                return {
                    type: 'line',
                    shape: {
                        x1: coords[0] - width / 2,
                        y1: coords[1],
                        x2: coords[0] + width / 2,
                        y2: coords[1],
                    },
                    style: {
                        stroke: colorArray[params.dataIndex] || plotOptions.color || defaultColor,
                        lineWidth: plotOptions.linewidth || 1,
                    },
                    silent: true,
                };
            },
            data: dataArray.map((val, i) => [i, val]),
        };
    }
}
