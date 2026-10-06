import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { renderPage } from '../utils/pdf';
import type { Annotation, ToolMode } from '../types';

interface Props {
  pdfDoc: PDFDocumentProxy | null;
  currentPage: number;
  totalPages: number;
  scale: number;
  activeTool: ToolMode;
  annotations: Annotation[];
  onAddAnnotation: (annotation: Annotation) => void;
  onPageChange: (page: number) => void;
  color: string;
  strokeWidth: number;
  fontSize: number;
  opacity: number;
  pageRotations: Map<number, number>;
}

export default function PDFViewer({
  pdfDoc, currentPage, totalPages, scale, activeTool,
  annotations, onAddAnnotation, onPageChange,
  color, strokeWidth, fontSize, opacity, pageRotations,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [renderedPages, setRenderedPages] = useState<Set<number>>(new Set());
  const canvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map());
  const annotationCanvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map());
  const isDrawing = useRef(false);
  const drawPoints = useRef<Array<{ x: number; y: number }>>([]);
  const drawStartRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!pdfDoc) return;
    setRenderedPages(new Set());
  }, [pdfDoc]);

  const renderPageToCanvas = useCallback(async (pageNum: number) => {
    if (!pdfDoc || renderedPages.has(pageNum)) return;
    const canvas = canvasRefs.current.get(pageNum);
    if (!canvas) return;
    try {
      const page = await pdfDoc.getPage(pageNum);
      const rotation = pageRotations.get(pageNum) || 0;
      await renderPage(page, canvas, scale, rotation);
      setRenderedPages((prev) => new Set([...prev, pageNum]));
    } catch {
      // page not available
    }
  }, [pdfDoc, scale, pageRotations, renderedPages]);

  useEffect(() => {
    if (!pdfDoc) return;
    setRenderedPages(new Set());
    const pagesToRender = [];
    for (let i = 1; i <= totalPages; i++) {
      pagesToRender.push(i);
    }
    let cancelled = false;
    (async () => {
      for (const p of pagesToRender) {
        if (cancelled) break;
        const canvas = canvasRefs.current.get(p);
        if (!canvas) continue;
        try {
          const page = await pdfDoc.getPage(p);
          const rotation = pageRotations.get(p) || 0;
          await renderPage(page, canvas, scale, rotation);
        } catch {
          // skip
        }
      }
    })();
    return () => { cancelled = true; };
  }, [pdfDoc, scale, totalPages, pageRotations]);

  useEffect(() => {
    renderAnnotations();
  }, [annotations, scale]);

  const renderAnnotations = useCallback(() => {
    for (const [pageNum, canvas] of annotationCanvasRefs.current) {
      const ctx = canvas.getContext('2d');
      if (!ctx) continue;
      const pdfCanvas = canvasRefs.current.get(pageNum);
      if (pdfCanvas) {
        canvas.width = pdfCanvas.width;
        canvas.height = pdfCanvas.height;
      }
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const pageAnnotations = annotations.filter((a) => a.pageNumber === pageNum);
      for (const ann of pageAnnotations) {
        ctx.save();
        ctx.globalAlpha = ann.opacity;

        switch (ann.type) {
          case 'highlight':
            ctx.fillStyle = ann.color;
            ctx.globalAlpha = 0.3;
            ctx.fillRect(ann.x * scale, ann.y * scale, (ann.width || 100) * scale, (ann.height || 20) * scale);
            break;

          case 'underline':
            ctx.strokeStyle = ann.color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(ann.x * scale, (ann.y + (ann.height || 20)) * scale);
            ctx.lineTo((ann.x + (ann.width || 100)) * scale, (ann.y + (ann.height || 20)) * scale);
            ctx.stroke();
            break;

          case 'strikethrough':
            ctx.strokeStyle = ann.color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            const midY = (ann.y + (ann.height || 20) / 2) * scale;
            ctx.moveTo(ann.x * scale, midY);
            ctx.lineTo((ann.x + (ann.width || 100)) * scale, midY);
            ctx.stroke();
            break;

          case 'freetext':
            ctx.fillStyle = ann.color;
            ctx.font = `${(ann.fontSize || 14) * scale}px Inter, sans-serif`;
            ctx.fillText(ann.content || '', ann.x * scale, (ann.y + (ann.fontSize || 14)) * scale);
            break;

          case 'drawing':
          case 'signature':
            if (ann.points && ann.points.length > 1) {
              ctx.strokeStyle = ann.color;
              ctx.lineWidth = (ann.strokeWidth || 2) * scale;
              ctx.lineCap = 'round';
              ctx.lineJoin = 'round';
              ctx.beginPath();
              ctx.moveTo(ann.points[0].x * scale, ann.points[0].y * scale);
              for (let i = 1; i < ann.points.length; i++) {
                ctx.lineTo(ann.points[i].x * scale, ann.points[i].y * scale);
              }
              ctx.stroke();
            }
            break;

          case 'rectangle':
            ctx.strokeStyle = ann.color;
            ctx.lineWidth = (ann.strokeWidth || 2) * scale;
            ctx.strokeRect(ann.x * scale, ann.y * scale, (ann.width || 100) * scale, (ann.height || 50) * scale);
            break;

          case 'circle':
            ctx.strokeStyle = ann.color;
            ctx.lineWidth = (ann.strokeWidth || 2) * scale;
            ctx.beginPath();
            const cx = (ann.x + (ann.width || 50) / 2) * scale;
            const cy = (ann.y + (ann.height || 50) / 2) * scale;
            const rx = ((ann.width || 50) / 2) * scale;
            const ry = ((ann.height || 50) / 2) * scale;
            ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
            ctx.stroke();
            break;

          case 'arrow':
            ctx.strokeStyle = ann.color;
            ctx.fillStyle = ann.color;
            ctx.lineWidth = (ann.strokeWidth || 2) * scale;
            const sx = ann.x * scale;
            const sy = ann.y * scale;
            const ex = (ann.x + (ann.width || 100)) * scale;
            const ey = (ann.y + (ann.height || 0)) * scale;
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.lineTo(ex, ey);
            ctx.stroke();
            const angle = Math.atan2(ey - sy, ex - sx);
            const headLen = 12 * scale;
            ctx.beginPath();
            ctx.moveTo(ex, ey);
            ctx.lineTo(ex - headLen * Math.cos(angle - Math.PI / 6), ey - headLen * Math.sin(angle - Math.PI / 6));
            ctx.lineTo(ex - headLen * Math.cos(angle + Math.PI / 6), ey - headLen * Math.sin(angle + Math.PI / 6));
            ctx.closePath();
            ctx.fill();
            break;

          case 'sticky-note':
            const noteSize = 24 * scale;
            ctx.fillStyle = '#fbbf24';
            ctx.fillRect(ann.x * scale, ann.y * scale, noteSize, noteSize);
            ctx.strokeStyle = '#d97706';
            ctx.lineWidth = 1;
            ctx.strokeRect(ann.x * scale, ann.y * scale, noteSize, noteSize);
            break;
        }
        ctx.restore();
      }
    }
  }, [annotations, scale]);

  const getCanvasCoords = (e: React.MouseEvent, pageNum: number) => {
    const canvas = annotationCanvasRefs.current.get(pageNum);
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / scale,
      y: (e.clientY - rect.top) / scale,
    };
  };

  const handleMouseDown = (e: React.MouseEvent, pageNum: number) => {
    if (activeTool === 'select' || activeTool === 'pan') return;
    const coords = getCanvasCoords(e, pageNum);
    if (!coords) return;

    if (activeTool === 'text') {
      const content = prompt('Enter text:');
      if (content) {
        onAddAnnotation({
          id: crypto.randomUUID(),
          type: 'freetext',
          pageNumber: pageNum,
          x: coords.x,
          y: coords.y,
          content,
          color,
          opacity,
          fontSize,
          timestamp: Date.now(),
        });
      }
      return;
    }

    if (activeTool === 'sticky-note') {
      const content = prompt('Note text:');
      onAddAnnotation({
        id: crypto.randomUUID(),
        type: 'sticky-note',
        pageNumber: pageNum,
        x: coords.x,
        y: coords.y,
        content: content || '',
        color,
        opacity,
        timestamp: Date.now(),
      });
      return;
    }

    isDrawing.current = true;
    drawStartRef.current = coords;
    drawPoints.current = [coords];
  };

  const handleMouseMove = (e: React.MouseEvent, pageNum: number) => {
    if (!isDrawing.current) return;
    const coords = getCanvasCoords(e, pageNum);
    if (!coords) return;

    if (activeTool === 'drawing' || activeTool === 'signature') {
      drawPoints.current.push(coords);
      const canvas = annotationCanvasRefs.current.get(pageNum);
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      renderAnnotations();
      ctx.strokeStyle = color;
      ctx.lineWidth = strokeWidth * scale;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalAlpha = opacity;
      ctx.beginPath();
      const pts = drawPoints.current;
      ctx.moveTo(pts[0].x * scale, pts[0].y * scale);
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(pts[i].x * scale, pts[i].y * scale);
      }
      ctx.stroke();
    } else if (drawStartRef.current) {
      const canvas = annotationCanvasRefs.current.get(pageNum);
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      renderAnnotations();
      ctx.strokeStyle = activeTool === 'redact' ? '#000' : color;
      ctx.fillStyle = activeTool === 'redact' ? '#000' : 'transparent';
      ctx.lineWidth = strokeWidth * scale;
      ctx.globalAlpha = activeTool === 'highlight' ? 0.3 : opacity;

      const start = drawStartRef.current;
      const w = (coords.x - start.x) * scale;
      const h = (coords.y - start.y) * scale;

      if (activeTool === 'rectangle' || activeTool === 'highlight' ||
          activeTool === 'underline' || activeTool === 'strikethrough' || activeTool === 'redact') {
        if (activeTool === 'highlight' || activeTool === 'redact') {
          ctx.fillStyle = activeTool === 'redact' ? '#000' : color;
          ctx.fillRect(start.x * scale, start.y * scale, w, h);
        } else {
          ctx.strokeRect(start.x * scale, start.y * scale, w, h);
        }
      } else if (activeTool === 'circle') {
        ctx.beginPath();
        ctx.ellipse(
          (start.x + (coords.x - start.x) / 2) * scale,
          (start.y + (coords.y - start.y) / 2) * scale,
          Math.abs(w) / 2, Math.abs(h) / 2,
          0, 0, Math.PI * 2
        );
        ctx.stroke();
      } else if (activeTool === 'arrow') {
        ctx.beginPath();
        ctx.moveTo(start.x * scale, start.y * scale);
        ctx.lineTo(coords.x * scale, coords.y * scale);
        ctx.stroke();
      }
    }
  };

  const handleMouseUp = (e: React.MouseEvent, pageNum: number) => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    const coords = getCanvasCoords(e, pageNum);
    if (!coords || !drawStartRef.current) return;

    const start = drawStartRef.current;

    if (activeTool === 'drawing' || activeTool === 'signature') {
      if (drawPoints.current.length > 1) {
        onAddAnnotation({
          id: crypto.randomUUID(),
          type: activeTool === 'signature' ? 'signature' : 'drawing',
          pageNumber: pageNum,
          x: start.x,
          y: start.y,
          color,
          opacity,
          strokeWidth,
          points: [...drawPoints.current],
          timestamp: Date.now(),
        });
      }
    } else if (activeTool === 'highlight') {
      onAddAnnotation({
        id: crypto.randomUUID(),
        type: 'highlight',
        pageNumber: pageNum,
        x: Math.min(start.x, coords.x),
        y: Math.min(start.y, coords.y),
        width: Math.abs(coords.x - start.x),
        height: Math.abs(coords.y - start.y),
        color,
        opacity: 0.3,
        timestamp: Date.now(),
      });
    } else if (activeTool === 'underline') {
      onAddAnnotation({
        id: crypto.randomUUID(),
        type: 'underline',
        pageNumber: pageNum,
        x: Math.min(start.x, coords.x),
        y: Math.min(start.y, coords.y),
        width: Math.abs(coords.x - start.x),
        height: Math.abs(coords.y - start.y),
        color,
        opacity,
        timestamp: Date.now(),
      });
    } else if (activeTool === 'strikethrough') {
      onAddAnnotation({
        id: crypto.randomUUID(),
        type: 'strikethrough',
        pageNumber: pageNum,
        x: Math.min(start.x, coords.x),
        y: Math.min(start.y, coords.y),
        width: Math.abs(coords.x - start.x),
        height: Math.abs(coords.y - start.y),
        color,
        opacity,
        timestamp: Date.now(),
      });
    } else if (activeTool === 'rectangle') {
      onAddAnnotation({
        id: crypto.randomUUID(),
        type: 'rectangle',
        pageNumber: pageNum,
        x: Math.min(start.x, coords.x),
        y: Math.min(start.y, coords.y),
        width: Math.abs(coords.x - start.x),
        height: Math.abs(coords.y - start.y),
        color,
        opacity,
        strokeWidth,
        timestamp: Date.now(),
      });
    } else if (activeTool === 'circle') {
      onAddAnnotation({
        id: crypto.randomUUID(),
        type: 'circle',
        pageNumber: pageNum,
        x: Math.min(start.x, coords.x),
        y: Math.min(start.y, coords.y),
        width: Math.abs(coords.x - start.x),
        height: Math.abs(coords.y - start.y),
        color,
        opacity,
        strokeWidth,
        timestamp: Date.now(),
      });
    } else if (activeTool === 'arrow') {
      onAddAnnotation({
        id: crypto.randomUUID(),
        type: 'arrow',
        pageNumber: pageNum,
        x: start.x,
        y: start.y,
        width: coords.x - start.x,
        height: coords.y - start.y,
        color,
        opacity,
        strokeWidth,
        timestamp: Date.now(),
      });
    } else if (activeTool === 'redact') {
      onAddAnnotation({
        id: crypto.randomUUID(),
        type: 'rectangle',
        pageNumber: pageNum,
        x: Math.min(start.x, coords.x),
        y: Math.min(start.y, coords.y),
        width: Math.abs(coords.x - start.x),
        height: Math.abs(coords.y - start.y),
        color: '#000000',
        opacity: 1,
        strokeWidth: 0,
        timestamp: Date.now(),
      });
    }

    drawPoints.current = [];
    drawStartRef.current = null;
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const pageElements = el.querySelectorAll('[data-page]');
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const p = Number((entry.target as HTMLElement).dataset.page);
            if (p) onPageChange(p);
          }
        }
      },
      { root: el, threshold: 0.5 }
    );
    pageElements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [totalPages, onPageChange]);

  if (!pdfDoc) return null;

  const isAnnotationTool = activeTool !== 'select' && activeTool !== 'pan';

  return (
    <div className="viewer-container" ref={containerRef}>
      {Array.from({ length: totalPages }, (_, i) => {
        const pageNum = i + 1;
        return (
          <div key={pageNum} className="page-wrapper" data-page={pageNum} id={`page-${pageNum}`}>
            <canvas
              ref={(el) => { if (el) canvasRefs.current.set(pageNum, el); }}
            />
            <canvas
              ref={(el) => { if (el) annotationCanvasRefs.current.set(pageNum, el); }}
              className={`annotation-layer ${isAnnotationTool ? 'active' : ''}`}
              onMouseDown={(e) => handleMouseDown(e, pageNum)}
              onMouseMove={(e) => handleMouseMove(e, pageNum)}
              onMouseUp={(e) => handleMouseUp(e, pageNum)}
              onMouseLeave={(e) => { if (isDrawing.current) handleMouseUp(e, pageNum); }}
            />
          </div>
        );
      })}
    </div>
  );
}
