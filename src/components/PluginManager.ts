import { ChartContext, Plugin } from "../types";
// We need to import AbstractPlugin if we check instanceof, or just treat all as Plugin interface

export class PluginManager {
  private plugins: Map<string, Plugin> = new Map();
  private activePluginId: string | null = null;
  private context: ChartContext;
  private toolbarContainer: HTMLElement;
  private tooltipElement: HTMLElement | null = null;
  private hideTimeout: any = null;

  constructor(context: ChartContext, toolbarContainer: HTMLElement) {
    this.context = context;
    this.toolbarContainer = toolbarContainer;
    this.createTooltip();
    this.renderToolbar();
  }

  private createTooltip() {
    this.tooltipElement = document.createElement("div");
    Object.assign(this.tooltipElement.style, {
      position: "fixed",
      display: "none",
      backgroundColor: "#1e293b",
      color: "#e2e8f0",
      padding: "6px 10px",
      borderRadius: "6px",
      fontSize: "13px",
      lineHeight: "1.4",
      fontWeight: "500",
      border: "1px solid #334155",
      zIndex: "9999",
      pointerEvents: "none",
      whiteSpace: "nowrap",
      boxShadow:
        "0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.15)",
      fontFamily: this.context.getOptions().fontFamily || "sans-serif",
      transition: "opacity 0.15s ease-in-out, transform 0.15s ease-in-out",
      opacity: "0",
      transform: "translateX(-5px)",
    });
    document.body.appendChild(this.tooltipElement);
  }

  public destroy() {
    if (this.tooltipElement && this.tooltipElement.parentNode) {
      this.tooltipElement.parentNode.removeChild(this.tooltipElement);
    }
    this.tooltipElement = null;
  }

  private showTooltip(target: HTMLElement, text: string) {
    if (!this.tooltipElement) return;

    // Clear any pending hide to prevent race conditions
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
      this.hideTimeout = null;
    }

    const rect = target.getBoundingClientRect();
    this.tooltipElement.textContent = text;
    this.tooltipElement.style.display = "block";

    // Position to the right of the button, centered vertically
    const tooltipRect = this.tooltipElement.getBoundingClientRect();
    const top = rect.top + (rect.height - tooltipRect.height) / 2;
    const left = rect.right + 10; // 10px gap

    this.tooltipElement.style.top = `${top}px`;
    this.tooltipElement.style.left = `${left}px`;

    // Trigger animation
    requestAnimationFrame(() => {
      if (this.tooltipElement) {
        this.tooltipElement.style.opacity = "1";
        this.tooltipElement.style.transform = "translateX(0)";
      }
    });
  }

  private hideTooltip() {
    if (!this.tooltipElement) return;
    this.tooltipElement.style.opacity = "0";
    this.tooltipElement.style.transform = "translateX(-5px)";

    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
    }

    // Wait for transition to finish before hiding
    this.hideTimeout = setTimeout(() => {
      if (this.tooltipElement) {
        this.tooltipElement.style.display = "none";
      }
      this.hideTimeout = null;
    }, 150);
  }

  public register(plugin: Plugin): void {
    if (this.plugins.has(plugin.id)) {
      console.warn(`Plugin with id ${plugin.id} is already registered.`);
      return;
    }
    this.plugins.set(plugin.id, plugin);
    plugin.init(this.context);
    this.addButton(plugin);
  }

  public unregister(pluginId: string): void {
    const plugin = this.plugins.get(pluginId);
    if (plugin) {
      if (this.activePluginId === pluginId) {
        this.deactivatePlugin();
      }
      plugin.destroy?.();
      this.plugins.delete(pluginId);
      this.removeButton(pluginId);
    }
  }

  public activatePlugin(pluginId: string): void {
    // If same plugin is clicked, deactivate it (toggle)
    if (this.activePluginId === pluginId) {
      this.deactivatePlugin();
      return;
    }

    // Deactivate current active plugin
    if (this.activePluginId) {
      this.deactivatePlugin();
    }

    const plugin = this.plugins.get(pluginId);
    if (plugin) {
      this.activePluginId = pluginId;
      this.setButtonActive(pluginId, true);
      plugin.activate?.();
    }
  }

  public deactivatePlugin(): void {
    if (this.activePluginId) {
      const plugin = this.plugins.get(this.activePluginId);
      plugin?.deactivate?.();
      this.setButtonActive(this.activePluginId, false);
      this.activePluginId = null;
    }
  }

  // --- UI Handling ---

  private renderToolbar(): void {
    this.toolbarContainer.innerHTML = "";
    this.toolbarContainer.style.display = "flex";
    this.toolbarContainer.style.flexDirection = "column";
    this.toolbarContainer.style.width = "40px";
    this.toolbarContainer.style.backgroundColor =
      this.context.getOptions().backgroundColor || "#1e293b";
    this.toolbarContainer.style.borderRight = "1px solid #334155";
    this.toolbarContainer.style.padding = "5px";
    this.toolbarContainer.style.boxSizing = "border-box";
    this.toolbarContainer.style.gap = "5px";
    this.toolbarContainer.style.flexShrink = "0";
  }

  private addButton(plugin: Plugin): void {
    const btn = document.createElement("button");
    btn.id = `qfchart-plugin-btn-${plugin.id}`;
    // Removed native title to use custom tooltip
    // btn.title = plugin.name || plugin.id;
    btn.style.width = "30px";
    btn.style.height = "30px";
    btn.style.padding = "4px";
    btn.style.border = "1px solid transparent";
    btn.style.borderRadius = "4px";
    btn.style.backgroundColor = "transparent";
    btn.style.cursor = "pointer";
    btn.style.color = this.context.getOptions().fontColor || "#cbd5e1";
    btn.style.display = "flex";
    btn.style.alignItems = "center";
    btn.style.justifyContent = "center";

    // Icon
    if (plugin.icon) {
      btn.innerHTML = plugin.icon;
    } else {
      btn.innerText = (plugin.name || plugin.id).substring(0, 2).toUpperCase();
    }

    // Hover effects and Tooltip
    btn.addEventListener("mouseenter", () => {
      if (this.activePluginId !== plugin.id) {
        btn.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
      }
      this.showTooltip(btn, plugin.name || plugin.id);
    });

    btn.addEventListener("mouseleave", () => {
      if (this.activePluginId !== plugin.id) {
        btn.style.backgroundColor = "transparent";
      }
      this.hideTooltip();
    });

    btn.onclick = () => this.activatePlugin(plugin.id);

    this.toolbarContainer.appendChild(btn);
  }

  private removeButton(pluginId: string): void {
    const btn = this.toolbarContainer.querySelector(
      `#qfchart-plugin-btn-${pluginId}`
    );
    if (btn) {
      btn.remove();
    }
  }

  private setButtonActive(pluginId: string, active: boolean): void {
    const btn = this.toolbarContainer.querySelector(
      `#qfchart-plugin-btn-${pluginId}`
    ) as HTMLElement;
    if (btn) {
      if (active) {
        btn.style.backgroundColor = "#2563eb"; // Blue highlight
        btn.style.color = "#ffffff";
      } else {
        btn.style.backgroundColor = "transparent";
        btn.style.color = this.context.getOptions().fontColor || "#cbd5e1";
      }
    }
  }
}
