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
}
