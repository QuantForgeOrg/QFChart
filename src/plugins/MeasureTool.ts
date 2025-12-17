import { ChartContext, PluginConfig } from '../types';
import { AbstractPlugin } from '../components/AbstractPlugin';
import * as echarts from 'echarts';

type PluginState = 'idle' | 'drawing' | 'finished';

export class MeasureTool extends AbstractPlugin {
    private zr!: any;

    private state: PluginState = 'idle';

    private startPoint: number[] | null = null;
    private endPoint: number[] | null = null;

    // ZRender Elements
    private group: any = null;
    private rect: any = null; // Measurement Box
    private labelRect: any = null; // Label Background
    private labelText: any = null; // Label Text
    private lineV: any = null; // Vertical Arrow Line
    private lineH: any = null; // Horizontal Arrow Line
    private arrowStart: any = null; // Start Arrow
    private arrowEnd: any = null; // End Arrow

    constructor(options: { name?: string; icon?: string }) {
        super({
            id: 'measure',
            name: options?.name || 'Measure',
            icon:
                options?.icon ||
                `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e3e3e3"><path d="M160-240q-33 0-56.5-23.5T80-320v-320q0-33 23.5-56.5T160-720h640q33 0 56.5 23.5T880-640v320q0 33-23.5 56.5T800-240H160Zm0-80h640v-320H680v160h-80v-160h-80v160h-80v-160h-80v160h-80v-160H160v320Zm120-160h80-80Zm160 0h80-80Zm160 0h80-80Zm-120 0Z"/></svg>`,
        });
    }

    protected onInit(): void {
        this.zr = this.chart.getZr();
    }

    protected onActivate(): void {
        this.state = 'idle';
        this.chart.getZr().setCursorStyle('crosshair');

        // We can use this.on() to register listeners that will be cleaned up automatically on destroy
        // BUT we need manual control over add/remove for deactivate() logic.
        // AbstractPlugin.on() is for lifecycle-bound listeners.
        // Here we toggle listeners based on tool state.
        // So we'll use ZRender direct listeners as before, but maybe cleaner.

        this.zr.on('click', this.onClick);
        this.zr.on('mousemove', this.onMouseMove);

        // We can still use the Event Bus for internal communication if needed
    }

    protected onDeactivate(): void {
        this.state = 'idle';
        this.chart.getZr().setCursorStyle('default');

        this.zr.off('click', this.onClick);
        this.zr.off('mousemove', this.onMouseMove);

        // Clean up clear listeners if any
        this.disableClearListeners();

        // @ts-ignore - state type comparison
        if (this.state === 'drawing') {
            this.removeGraphic();
        }
    }

    protected onDestroy(): void {
        this.removeGraphic();
    }

    // --- Interaction Handlers ---

    private onMouseDown = () => {
        if (this.state === 'finished') {
            this.removeGraphic();
        }
    };

    private onChartInteraction = () => {
        if (this.group) {
            this.removeGraphic();
        }
    };

    private onClick = (params: any) => {
        if (this.state === 'idle') {
            this.state = 'drawing';
            this.startPoint = [params.offsetX, params.offsetY];
            this.endPoint = [params.offsetX, params.offsetY];
            this.initGraphic();
            this.updateGraphic();
        } else if (this.state === 'drawing') {
            this.state = 'finished';
            this.endPoint = [params.offsetX, params.offsetY];
            this.updateGraphic();
            this.context.disableTools();

            // Enable listeners to clear the graphic on interaction
            this.enableClearListeners();
        }
    };

    private enableClearListeners(): void {
        const clickHandler = () => {
            this.removeGraphic();
        };
        setTimeout(() => {
            this.zr.on('click', clickHandler);
        }, 10);

        this.zr.on('mousedown', this.onMouseDown);
        this.context.events.on('chart:dataZoom', this.onChartInteraction);

        this.clearHandlers = {
            click: clickHandler,
            mousedown: this.onMouseDown,
            dataZoom: this.onChartInteraction,
        };
    }

    private clearHandlers: any = {};

    private disableClearListeners(): void {
        if (this.clearHandlers.click) this.zr.off('click', this.clearHandlers.click);
        if (this.clearHandlers.mousedown) this.zr.off('mousedown', this.clearHandlers.mousedown);
        if (this.clearHandlers.dataZoom) {
            this.context.events.off('chart:dataZoom', this.clearHandlers.dataZoom);
        }
        this.clearHandlers = {};
    }

    private onMouseMove = (params: any) => {
        if (this.state !== 'drawing') return;
        this.endPoint = [params.offsetX, params.offsetY];
        this.updateGraphic();
    };

    // --- Graphics ---

    private initGraphic(): void {
        if (this.group) return;

        this.group = new echarts.graphic.Group();

        // 1. Rectangle (Box)
        this.rect = new echarts.graphic.Rect({
            shape: { x: 0, y: 0, width: 0, height: 0 },
            style: { fill: 'rgba(0,0,0,0)', stroke: 'transparent', lineWidth: 0 },
            z: 100,
        });

        // 2. Lines (Arrows)
        this.lineV = new echarts.graphic.Line({
            shape: { x1: 0, y1: 0, x2: 0, y2: 0 },
            style: { stroke: '#fff', lineWidth: 1, lineDash: [4, 4] },
            z: 101,
        });
        this.lineH = new echarts.graphic.Line({
            shape: { x1: 0, y1: 0, x2: 0, y2: 0 },
            style: { stroke: '#fff', lineWidth: 1, lineDash: [4, 4] },
            z: 101,
        });

        // Arrows
        this.arrowStart = new echarts.graphic.Polygon({
            shape: {
                points: [
                    [0, 0],
                    [-5, 10],
                    [5, 10],
                ],
            },
            style: { fill: '#fff' },
            z: 102,
        });
        this.arrowEnd = new echarts.graphic.Polygon({
            shape: {
                points: [
                    [0, 0],
                    [-5, -10],
                    [5, -10],
                ],
            },
            style: { fill: '#fff' },
            z: 102,
        });

        // 3. Label
        this.labelRect = new echarts.graphic.Rect({
            shape: { x: 0, y: 0, width: 0, height: 0, r: 4 },
            style: {
                fill: 'transparent',
                stroke: 'transparent',
                lineWidth: 0,
                shadowBlur: 5,
                shadowColor: 'rgba(0,0,0,0.3)',
            },
            z: 102,
        });

        this.labelText = new echarts.graphic.Text({
            style: {
                x: 0,
                y: 0,
                text: '',
                fill: '#fff',
                font: '12px sans-serif',
                align: 'center',
                verticalAlign: 'middle',
            },
            z: 103,
        });

        this.group.add(this.rect);
        this.group.add(this.lineV);
        this.group.add(this.lineH);
        this.group.add(this.arrowStart);
        this.group.add(this.arrowEnd);
        this.group.add(this.labelRect);
        this.group.add(this.labelText);

        this.zr.add(this.group);
    }

    private removeGraphic(): void {
        if (this.group) {
            this.zr.remove(this.group);
            this.group = null;
            // ... clear refs
            this.disableClearListeners();
        }
    }

    private updateGraphic(): void {
        if (!this.startPoint || !this.endPoint || !this.group) return;

        const [x1, y1] = this.startPoint;
        const [x2, y2] = this.endPoint;

        // Use Context Helper
        const p1 = this.context.coordinateConversion.pixelToData({ x: x1, y: y1 });
        const p2 = this.context.coordinateConversion.pixelToData({ x: x2, y: y2 });

        if (!p1 || !p2) return;

        const idx1 = Math.round(p1.timeIndex);
        const idx2 = Math.round(p2.timeIndex);
        const val1 = p1.value;
        const val2 = p2.value;

        const bars = idx2 - idx1;
        const priceDiff = val2 - val1;
        const priceChangePercent = (priceDiff / val1) * 100;
        const isUp = priceDiff >= 0;

        const color = isUp ? 'rgba(33, 150, 243, 0.2)' : 'rgba(236, 0, 0, 0.2)';
        const strokeColor = isUp ? '#2196F3' : '#ec0000';

        // --- Visuals ---
        this.rect.setShape({
            x: Math.min(x1, x2),
            y: Math.min(y1, y2),
            width: Math.abs(x2 - x1),
            height: Math.abs(y2 - y1),
        });
        this.rect.setStyle({ fill: color });

        const midX = (x1 + x2) / 2;
        const midY = (y1 + y2) / 2;

        this.lineV.setShape({ x1: midX, y1: y1, x2: midX, y2: y2 });
        this.lineV.setStyle({ stroke: strokeColor });

        this.lineH.setShape({ x1: x1, y1: midY, x2: x2, y2: midY });
        this.lineH.setStyle({ stroke: strokeColor });

        // Arrows
        const topY = Math.min(y1, y2);
        const bottomY = Math.max(y1, y2);

        this.arrowStart.setStyle({ fill: 'none' });
        this.arrowEnd.setStyle({ fill: 'none' });

        if (isUp) {
            this.arrowStart.setShape({
                points: [
                    [midX, topY],
                    [midX - 4, topY + 6],
                    [midX + 4, topY + 6],
                ],
            });
            this.arrowStart.setStyle({ fill: strokeColor });
        } else {
            this.arrowEnd.setShape({
                points: [
                    [midX, bottomY],
                    [midX - 4, bottomY - 6],
                    [midX + 4, bottomY - 6],
                ],
            });
            this.arrowEnd.setStyle({ fill: strokeColor });
        }

        // Label
        const textContent = [`${priceDiff.toFixed(2)} (${priceChangePercent.toFixed(2)}%)`, `${bars} bars, ${(bars * 0).toFixed(0)}d`].join('\n');

        const labelW = 140;
        const labelH = 40;
        const rectBottomY = Math.max(y1, y2);
        const rectTopY = Math.min(y1, y2);
        const rectCenterX = (x1 + x2) / 2;

        let labelX = rectCenterX - labelW / 2;
        let labelY = rectBottomY + 10;

        const canvasHeight = this.chart.getHeight();
        if (labelY + labelH > canvasHeight) {
            labelY = rectTopY - labelH - 10;
        }

        this.labelRect.setShape({
            x: labelX,
            y: labelY,
            width: labelW,
            height: labelH,
        });
        this.labelRect.setStyle({
            fill: '#1e293b',
            stroke: strokeColor,
            lineWidth: 1,
        });

        this.labelText.setStyle({
            x: labelX + labelW / 2,
            y: labelY + labelH / 2,
            text: textContent,
            fill: '#fff',
        });
    }
}
