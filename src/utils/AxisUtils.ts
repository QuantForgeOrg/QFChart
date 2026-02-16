import { OHLCV } from '../types';

export class AxisUtils {
    // Create min/max functions that apply padding
    public static createMinFunction(paddingPercent: number) {
        return (value: { min: number; max: number }) => {
            const range = value.max - value.min;
            const padding = range * (paddingPercent / 100);
            return value.min - padding;
        };
    }

    public static createMaxFunction(paddingPercent: number) {
        return (value: { min: number; max: number }) => {
            const range = value.max - value.min;
            const padding = range * (paddingPercent / 100);
            return value.max + padding;
        };
    }

    /**
     * Auto-detect the appropriate number of decimal places for price display
     * based on actual market data values.
     *
     * For prices like BTCUSDC (~97000), returns 2.
     * For prices like PUMPUSDT (~0.002), returns 6.
     *
     * The algorithm examines a representative close price and determines
     * how many decimals are needed to show meaningful precision.
     */
    public static autoDetectDecimals(marketData: OHLCV[]): number {
        if (!marketData || marketData.length === 0) return 2;

        // Use the last close price as the representative value
        const price = marketData[marketData.length - 1].close;

        if (price === 0 || !isFinite(price) || isNaN(price)) return 2;

        const absPrice = Math.abs(price);

        // For prices >= 1, use 2 decimals (e.g. 97000.12, 1.45)
        if (absPrice >= 1) return 2;

        // For prices < 1, count leading zeros after the decimal point
        // and add 4 extra digits for meaningful precision (increased from 2).
        // e.g. 0.002119 -> 3 leading zeros -> 3 + 4 = 7
        // We cap at 10 to avoid excessive precision.
        const leadingZeros = Math.ceil(-Math.log10(absPrice));
        return Math.min(leadingZeros + 4, 10);
    }

    /**
     * Format a numeric value with the given number of decimal places.
     * This is the centralized formatting function used by Y-axis labels,
     * markLine labels, and countdown labels.
     */
    public static formatValue(value: number, decimals: number): string {
        if (typeof value === 'number') {
            return value.toFixed(decimals);
        }
        return String(value);
    }
}
