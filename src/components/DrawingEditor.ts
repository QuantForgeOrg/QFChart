import { ChartContext, DrawingElement, DataCoordinate } from "../types";
import * as echarts from "echarts";

export class DrawingEditor {
  private context: ChartContext;
  private isEditing: boolean = false;
  private currentDrawing: DrawingElement | null = null;
  private editingPointIndex: number | null = null;
  private zr: any;

  // Temporary ZRender elements for visual feedback during drag
  private editGroup: any = null;
  private editLine: any = null;
  private editStartPoint: any = null;
  private editEndPoint: any = null;

  private isMovingShape: boolean = false;
  private dragStart: { x: number; y: number } | null = null;
  private initialPixelPoints: { x: number; y: number }[] = [];

  constructor(context: ChartContext) {
    this.context = context;
    this.zr = this.context.getChart().getZr();
    this.bindEvents();
  }

  private bindEvents() {
    this.context.events.on("drawing:point:mousedown", this.onPointMouseDown);
    this.context.events.on("drawing:mousedown", this.onDrawingMouseDown);
  }

  private onDrawingMouseDown = (payload: {
    id: string;
    x: number;
    y: number;
  }) => {
    if (this.isEditing) return;

    const drawing = this.context.getDrawing(payload.id);
    if (!drawing) return;

    this.isEditing = true;
    this.isMovingShape = true;
    this.currentDrawing = JSON.parse(JSON.stringify(drawing));
    this.dragStart = { x: payload.x, y: payload.y };

    // Capture initial pixel positions
    this.initialPixelPoints = drawing.points.map((p) => {
      const pixel = this.context.coordinateConversion.dataToPixel(p);
      return pixel ? { x: pixel.x, y: pixel.y } : { x: 0, y: 0 }; // Fallback
    });

    this.context.lockChart();
    this.createEditGraphic();

    this.zr.on("mousemove", this.onMouseMove);
    this.zr.on("mouseup", this.onMouseUp);
  };

  private onPointMouseDown = (payload: { id: string; pointIndex: number }) => {
    if (this.isEditing) return;

    const drawing = this.context.getDrawing(payload.id);
    if (!drawing) return;

    // Start Editing
    this.isEditing = true;
    this.currentDrawing = JSON.parse(JSON.stringify(drawing)); // Deep copy
    this.editingPointIndex = payload.pointIndex;

    this.context.lockChart();

    // Create visual feedback (overlay)
    this.createEditGraphic();

    // Hide the actual drawing (optional, but good for UX so we don't see double)
    // Actually, we can just drag the overlay and update the drawing on mouseup.
    // The underlying drawing remains visible but static until updated.

    // Bind temporary drag listeners
    this.zr.on("mousemove", this.onMouseMove);
    this.zr.on("mouseup", this.onMouseUp);
    // Global mouseup to catch releases outside chart area if needed (window listener better?)
    // ZRender usually handles global mouseup if initiated within.
  };

  private createEditGraphic() {
    if (!this.currentDrawing) return;

    this.editGroup = new echarts.graphic.Group();

    // We need current pixel coordinates
    const p1Data = this.currentDrawing.points[0];
    const p2Data = this.currentDrawing.points[1];

    const p1 = this.context.coordinateConversion.dataToPixel(p1Data);
    const p2 = this.context.coordinateConversion.dataToPixel(p2Data);

    if (!p1 || !p2) return;

    // Create Line
    this.editLine = new echarts.graphic.Line({
      shape: { x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y },
      style: {
        stroke: this.currentDrawing.style?.color || "#3b82f6",
        lineWidth: this.currentDrawing.style?.lineWidth || 2,
        lineDash: [4, 4], // Dashed to indicate editing
      },
      silent: true, // Events pass through to handlers
    });

    // Create Points (we only really need to visualize the one being dragged, but showing both is fine)
    this.editStartPoint = new echarts.graphic.Circle({
      shape: { cx: p1.x, cy: p1.y, r: 5 },
      style: { fill: "#fff", stroke: "#3b82f6", lineWidth: 2 },
      z: 1000,
    });

    this.editEndPoint = new echarts.graphic.Circle({
      shape: { cx: p2.x, cy: p2.y, r: 5 },
      style: { fill: "#fff", stroke: "#3b82f6", lineWidth: 2 },
      z: 1000,
    });

    this.editGroup.add(this.editLine);
    this.editGroup.add(this.editStartPoint);
    this.editGroup.add(this.editEndPoint);

    this.zr.add(this.editGroup);
  }

  private onMouseMove = (e: any) => {
    if (!this.isEditing || !this.currentDrawing) return;

    const x = e.offsetX;
    const y = e.offsetY;

    if (this.isMovingShape && this.dragStart) {
      const dx = x - this.dragStart.x;
      const dy = y - this.dragStart.y;

      // Apply delta to all points
      const newP1 = {
        x: this.initialPixelPoints[0].x + dx,
        y: this.initialPixelPoints[0].y + dy,
      };
      const newP2 = {
        x: this.initialPixelPoints[1].x + dx,
        y: this.initialPixelPoints[1].y + dy,
      };

      this.editLine.setShape({
        x1: newP1.x,
        y1: newP1.y,
        x2: newP2.x,
        y2: newP2.y,
      });
      this.editStartPoint.setShape({ cx: newP1.x, cy: newP1.y });
      this.editEndPoint.setShape({ cx: newP2.x, cy: newP2.y });
    } else if (this.editingPointIndex !== null) {
      // Update the pixel position of the edited point in the overlay
      if (this.editingPointIndex === 0) {
        this.editLine.setShape({ x1: x, y1: y });
        this.editStartPoint.setShape({ cx: x, cy: y });
      } else {
        this.editLine.setShape({ x2: x, y2: y });
        this.editEndPoint.setShape({ cx: x, cy: y });
      }
    }
  };

  private onMouseUp = (e: any) => {
    if (!this.isEditing) return;

    // Commit changes
    this.finishEditing(e.offsetX, e.offsetY);
  };

  private finishEditing(finalX: number, finishY: number) {
    if (!this.currentDrawing) return;

    if (this.isMovingShape && this.dragStart) {
      const dx = finalX - this.dragStart.x;
      const dy = finishY - this.dragStart.y;

      // Update all points
      const newPoints = this.initialPixelPoints.map((p, i) => {
        const newX = p.x + dx;
        const newY = p.y + dy;
        return this.context.coordinateConversion.pixelToData({
          x: newX,
          y: newY,
        });
      });

      // Check if conversion succeeded
      if (newPoints.every((p) => p !== null)) {
        // Update points
        // Assuming 2 points for line tool
        if (newPoints[0] && newPoints[1]) {
          this.currentDrawing.points[0] = newPoints[0];
          this.currentDrawing.points[1] = newPoints[1];

          // Update pane index if we moved significantly (using start point as ref)
          if (newPoints[0].paneIndex !== undefined) {
            this.currentDrawing.paneIndex = newPoints[0].paneIndex;
          }

          this.context.updateDrawing(this.currentDrawing);
        }
      }
    } else if (this.editingPointIndex !== null) {
      // Convert final pixel to data
      const newData = this.context.coordinateConversion.pixelToData({
        x: finalX,
        y: finishY,
      });

      if (newData) {
        this.currentDrawing.points[this.editingPointIndex] = newData;

        if (this.editingPointIndex === 0 && newData.paneIndex !== undefined) {
          this.currentDrawing.paneIndex = newData.paneIndex;
        }

        this.context.updateDrawing(this.currentDrawing);
      }
    }

    // Cleanup
    this.isEditing = false;
    this.isMovingShape = false;
    this.dragStart = null;
    this.initialPixelPoints = [];
    this.currentDrawing = null;
    this.editingPointIndex = null;

    if (this.editGroup) {
      this.zr.remove(this.editGroup);
      this.editGroup = null;
    }

    this.zr.off("mousemove", this.onMouseMove);
    this.zr.off("mouseup", this.onMouseUp);

    this.context.unlockChart();
  }
}
