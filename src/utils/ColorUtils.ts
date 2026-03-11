export class ColorUtils {
    /**
     * Parse color string and extract opacity
     * Supports: hex (#RRGGBB, #RRGGBBAA), named colors (green, red), rgba(r,g,b,a), rgb(r,g,b)
     */
    public static parseColor(colorStr: string): { color: string; opacity: number } {
        if (!colorStr || typeof colorStr !== 'string') {
            return { color: '#888888', opacity: 0.2 };
        }

        // Check for rgba format
        const rgbaMatch = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
        if (rgbaMatch) {
            const r = rgbaMatch[1];
            const g = rgbaMatch[2];
            const b = rgbaMatch[3];
            const a = rgbaMatch[4] ? parseFloat(rgbaMatch[4]) : 1;

            // Return rgb color and separate opacity
            return {
                color: `rgb(${r},${g},${b})`,
                opacity: a,
            };
        }

        // Check for 8-digit hex with alpha (#RRGGBBAA)
        const hex8Match = colorStr.match(/^#([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/);
        if (hex8Match) {
            const r = parseInt(hex8Match[1], 16);
            const g = parseInt(hex8Match[2], 16);
            const b = parseInt(hex8Match[3], 16);
            const a = parseInt(hex8Match[4], 16) / 255;
            return {
                color: `rgb(${r},${g},${b})`,
                opacity: a,
            };
        }

        // For 6-digit hex or named colors, default opacity to 0.3 for fill areas
        return {
            color: colorStr,
            opacity: 0.3,
        };
    }

    /**
     * Convert a parsed color + opacity to an rgba string.
     */
    public static toRgba(color: string, opacity: number): string {
        // If already rgba/rgb format
        const rgbMatch = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
        if (rgbMatch) {
            return `rgba(${rgbMatch[1]},${rgbMatch[2]},${rgbMatch[3]},${opacity})`;
        }

        // Handle 6-digit hex colors
        const hexMatch = color.match(/^#([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/);
        if (hexMatch) {
            const r = parseInt(hexMatch[1], 16);
            const g = parseInt(hexMatch[2], 16);
            const b = parseInt(hexMatch[3], 16);
            return `rgba(${r},${g},${b},${opacity})`;
        }

        // Handle 8-digit hex colors (#RRGGBBAA) — use alpha from hex, override with opacity
        const hex8Match = color.match(/^#([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/);
        if (hex8Match) {
            const r = parseInt(hex8Match[1], 16);
            const g = parseInt(hex8Match[2], 16);
            const b = parseInt(hex8Match[3], 16);
            return `rgba(${r},${g},${b},${opacity})`;
        }

        // Fallback: return color as-is
        return color;
    }
}
