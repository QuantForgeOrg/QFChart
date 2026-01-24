import { SeriesRenderer } from './renderers/SeriesRenderer';
import { LineRenderer } from './renderers/LineRenderer';
import { StepRenderer } from './renderers/StepRenderer';
import { HistogramRenderer } from './renderers/HistogramRenderer';
import { ScatterRenderer } from './renderers/ScatterRenderer';
import { OHLCBarRenderer } from './renderers/OHLCBarRenderer';
import { ShapeRenderer } from './renderers/ShapeRenderer';
import { BackgroundRenderer } from './renderers/BackgroundRenderer';
import { FillRenderer } from './renderers/FillRenderer';

export class SeriesRendererFactory {
    private static renderers: Map<string, SeriesRenderer> = new Map();

    static {
        this.register('line', new LineRenderer());
        this.register('step', new StepRenderer());
        this.register('histogram', new HistogramRenderer());
        this.register('columns', new HistogramRenderer());
        this.register('circles', new ScatterRenderer());
        this.register('cross', new ScatterRenderer());
        this.register('char', new ScatterRenderer());
        this.register('bar', new OHLCBarRenderer());
        this.register('candle', new OHLCBarRenderer());
        this.register('shape', new ShapeRenderer());
        this.register('background', new BackgroundRenderer());
        this.register('fill', new FillRenderer());
    }

    public static register(style: string, renderer: SeriesRenderer) {
        this.renderers.set(style, renderer);
    }

    public static get(style: string): SeriesRenderer {
        return this.renderers.get(style) || this.renderers.get('line')!; // Default to line
    }
}
