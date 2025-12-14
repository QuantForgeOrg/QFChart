import { ChartContext, Plugin } from "../types";
// We need to import AbstractPlugin if we check instanceof, or just treat all as Plugin interface

export class PluginManager {
  private plugins: Map<string, Plugin> = new Map();
  private activePluginId: string | null = null;
  private context: ChartContext;
  private toolbarContainer: HTMLElement;

  constructor(context: ChartContext, toolbarContainer: HTMLElement) {
    this.context = context;
    this.toolbarContainer = toolbarContainer;
    this.renderToolbar();
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
    btn.title = plugin.name || plugin.id;
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

    // Hover effects
    btn.addEventListener("mouseenter", () => {
      if (this.activePluginId !== plugin.id) {
        btn.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
      }
    });
    btn.addEventListener("mouseleave", () => {
      if (this.activePluginId !== plugin.id) {
        btn.style.backgroundColor = "transparent";
      }
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
