import { Indicator as IndicatorInterface, IndicatorPlot } from "../types";

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
}
