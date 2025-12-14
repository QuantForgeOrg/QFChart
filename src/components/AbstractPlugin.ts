import { ChartContext, Plugin, PluginConfig, OHLCV } from "../types";
import { EventType, EventHandler } from "../utils/EventBus";

export abstract class AbstractPlugin implements Plugin {
  public id: string;
  public name?: string;
  public icon?: string;

  protected context!: ChartContext;
  private eventListeners: Array<{ event: EventType; handler: EventHandler }> =
    [];

  constructor(config: PluginConfig) {
    this.id = config.id;
    this.name = config.name;
    this.icon = config.icon;
  }

  public init(context: ChartContext): void {
    this.context = context;
    this.onInit();
  }

  /**
   * Lifecycle hook called after context is initialized.
   * Override this instead of init().
   */
  protected onInit(): void {}

  public activate(): void {
    this.onActivate();
    this.context.events.emit("plugin:activated", this.id);
  }

  /**
   * Lifecycle hook called when the plugin is activated.
   */
  protected onActivate(): void {}

  public deactivate(): void {
    this.onDeactivate();
    this.context.events.emit("plugin:deactivated", this.id);
  }

  /**
   * Lifecycle hook called when the plugin is deactivated.
   */
  protected onDeactivate(): void {}

  public destroy(): void {
    this.removeAllListeners();
    this.onDestroy();
  }

  /**
   * Lifecycle hook called when the plugin is destroyed.
   */
  protected onDestroy(): void {}

  // --- Helper Methods ---

  /**
   * Register an event listener that will be automatically cleaned up on destroy.
   */
  protected on(event: EventType, handler: EventHandler): void {
    this.context.events.on(event, handler);
    this.eventListeners.push({ event, handler });
  }

  /**
   * Remove a specific event listener.
   */
  protected off(event: EventType, handler: EventHandler): void {
    this.context.events.off(event, handler);
    this.eventListeners = this.eventListeners.filter(
      (l) => l.event !== event || l.handler !== handler
    );
  }

  /**
   * Remove all listeners registered by this plugin.
   */
  protected removeAllListeners(): void {
    this.eventListeners.forEach(({ event, handler }) => {
      this.context.events.off(event, handler);
    });
    this.eventListeners = [];
  }

  /**
   * Access to the ECharts instance.
   */
  protected get chart() {
    return this.context.getChart();
  }

  /**
   * Access to market data.
   */
  protected get marketData(): OHLCV[] {
    return this.context.getMarketData();
  }
}

