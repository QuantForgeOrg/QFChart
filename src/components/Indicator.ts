import { Indicator as IndicatorInterface, IndicatorPlot, IndicatorPoint } from '../types';

export class Indicator implements IndicatorInterface {
    public id: string;
    public plots: { [name: string]: IndicatorPlot };
    public paneIndex: number;
    public height?: number;
    public collapsed: boolean;
    public titleColor?: string;
    public controls?: { collapse?: boolean; maximize?: boolean };

    constructor(
        id: string,
        plots: { [name: string]: IndicatorPlot },
        paneIndex: number,
        options: {
            height?: number;
            collapsed?: boolean;
            titleColor?: string;
            controls?: { collapse?: boolean; maximize?: boolean };
        } = {}
    ) {
        this.id = id;
        this.plots = plots;
        this.paneIndex = paneIndex;
        this.height = options.height;
        this.collapsed = options.collapsed || false;
        this.titleColor = options.titleColor;
        this.controls = options.controls;
    }

    public toggleCollapse(): void {
        this.collapsed = !this.collapsed;
    }

    public isVisible(): boolean {
        return !this.collapsed;
    }

    /**
     * Update indicator data incrementally by merging new points
     *
     * @param plots - New plots data to merge (same structure as constructor)
     *
     * @remarks
     * This method merges new indicator data with existing data by timestamp.
     * - New timestamps are added
     * - Existing timestamps are updated with new values
     * - All data is automatically sorted by time after merge
     *
     * **Important**: This method only updates the indicator's internal data structure.
     * To see the changes reflected in the chart, you MUST call `chart.updateData()`
     * after updating indicator data.
     *
     * **Usage Pattern**:
     * ```typescript
     * // 1. Update indicator data first
     * indicator.updateData({
     *   macd: { data: [{ time: 1234567890, value: 150 }], options: { style: 'line', color: '#2962FF' } }
     * });
     *
     * // 2. Then update chart data to trigger re-render
     * chart.updateData([
     *   { time: 1234567890, open: 100, high: 105, low: 99, close: 103, volume: 1000 }
     * ]);
     * ```
     *
     * **Note**: If you update indicator data without corresponding market data changes,
     * this typically indicates a recalculation scenario. In normal workflows, indicator
     * values are derived from market data, so indicator updates should correspond to
     * new or modified market bars.
     */
    public updateData(plots: { [name: string]: IndicatorPlot }): void {
        Object.keys(plots).forEach((plotName) => {
            if (!this.plots[plotName]) {
                // New plot - add it
                this.plots[plotName] = plots[plotName];
            } else {
                // Existing plot - merge data points
                const existingPlot = this.plots[plotName];
                const newPlot = plots[plotName];

                if (!existingPlot.data) return;

                // Update options if provided
                if (newPlot.options) {
                    existingPlot.options = { ...existingPlot.options, ...newPlot.options };
                }

                // Merge data points by time
                const existingTimeMap = new Map<number, IndicatorPoint>();
                existingPlot.data?.forEach((point) => {
                    existingTimeMap.set(point.time, point);
                });

                // Update or add new points
                newPlot.data?.forEach((point) => {
                    existingTimeMap.set(point.time, point);
                });

                // Rebuild data array sorted by time
                existingPlot.data = Array.from(existingTimeMap.values()).sort((a, b) => a.time - b.time);
            }
        });
    }
}
