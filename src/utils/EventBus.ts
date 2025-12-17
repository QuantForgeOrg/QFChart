export type EventType =
    | 'mouse:down'
    | 'mouse:move'
    | 'mouse:up'
    | 'mouse:click'
    | 'chart:resize'
    | 'chart:dataZoom'
    | 'chart:updated'
    | 'plugin:activated'
    | 'plugin:deactivated'
    | 'drawing:hover'
    | 'drawing:mouseout'
    | 'drawing:mousedown'
    | 'drawing:click'
    | 'drawing:point:hover'
    | 'drawing:point:mouseout'
    | 'drawing:point:mousedown'
    | 'drawing:point:click'
    | 'drawing:selected'
    | 'drawing:deselected'
    | 'drawing:deleted';

export interface DrawingEventPayload {
    id: string;
    type?: string;
    pointIndex?: number;
    event?: any;
    x?: number;
    y?: number;
}

export type EventHandler<T = any> = (payload: T) => void;

export class EventBus {
    private handlers: Map<EventType, Set<EventHandler>> = new Map();

    public on<T = any>(event: EventType, handler: EventHandler<T>): void {
        if (!this.handlers.has(event)) {
            this.handlers.set(event, new Set());
        }
        this.handlers.get(event)!.add(handler);
    }

    public off<T = any>(event: EventType, handler: EventHandler<T>): void {
        const handlers = this.handlers.get(event);
        if (handlers) {
            handlers.delete(handler);
        }
    }

    public emit<T = any>(event: EventType, payload?: T): void {
        const handlers = this.handlers.get(event);
        if (handlers) {
            handlers.forEach((handler) => {
                try {
                    handler(payload);
                } catch (e) {
                    console.error(`Error in EventBus handler for ${event}:`, e);
                }
            });
        }
    }

    public clear(): void {
        this.handlers.clear();
    }
}
