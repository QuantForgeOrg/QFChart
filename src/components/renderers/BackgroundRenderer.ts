import { SeriesRenderer, RenderContext } from './SeriesRenderer';

export class BackgroundRenderer implements SeriesRenderer {
    render(context: RenderContext): any {
        const { seriesName, xAxisIndex, yAxisIndex, dataArray, colorArray } = context;

        return {
            name: seriesName,
            type: 'custom',
            xAxisIndex: xAxisIndex,
            yAxisIndex: yAxisIndex,
            z: -10,
            renderItem: (params: any, api: any) => {
                const xVal = api.value(0);
                if (isNaN(xVal)) return;

                const start = api.coord([xVal, 0]);
                const size = api.size([1, 0]);
                const width = size[0];
                const sys = params.coordSys;
                const x = start[0] - width / 2;
                const barColor = colorArray[params.dataIndex];
                const val = api.value(1);

                if (!barColor || val === null || val === undefined || isNaN(val)) return;

                return {
                    type: 'rect',
                    shape: {
                        x: x,
                        y: sys.y,
                        width: width,
                        height: sys.height,
                    },
                    style: {
                        fill: barColor,
                        opacity: 0.3,
                    },
                    silent: true,
                };
            },
            data: dataArray.map((val, i) => [i, val]),
        };
    }
}
