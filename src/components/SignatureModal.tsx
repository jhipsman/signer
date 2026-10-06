import React, { useRef, useState, useEffect } from 'react';
import { XIcon } from './Icons';

interface Props {
  onClose: () => void;
  onSave: (signatureData: string) => void;
}

export default function SignatureModal({ onClose, onSave }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasContent, setHasContent] = useState(false);
  const [penColor, setPenColor] = useState('#1a1a2e');
  const [penWidth, setPenWidth] = useState(2);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = 500;
    canvas.height = 200;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#ddd';
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(20, 160);
    ctx.lineTo(480, 160);
    ctx.stroke();
    ctx.setLineDash([]);
  }, []);

  const startDraw = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.strokeStyle = penColor;
    ctx.lineWidth = penWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
    setHasContent(true);
  };

  const endDraw = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#ddd';
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(20, 160);
    ctx.lineTo(480, 160);
    ctx.stroke();
    ctx.setLineDash([]);
    setHasContent(false);
  };

  const saveSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasContent) return;
    onSave(canvas.toDataURL('image/png'));
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal fade-in" onClick={(e) => e.stopPropagation()} style={{ minWidth: 560 }}>
        <div className="modal-header">
          <span className="modal-title">Create Signature</span>
          <button className="btn btn-icon" onClick={onClose}><XIcon /></button>
        </div>
        <div className="modal-body">
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12 }}>
            Draw your signature below. It will be saved for future use.
          </p>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <input type="color" className="color-picker" value={penColor} onChange={(e) => setPenColor(e.target.value)} />
            <select className="select" value={penWidth} onChange={(e) => setPenWidth(Number(e.target.value))}>
              {[1, 2, 3, 4, 5].map((w) => (
                <option key={w} value={w}>{w}px</option>
              ))}
            </select>
          </div>
          <canvas
            ref={canvasRef}
            className="signature-pad"
            onMouseDown={startDraw}
            onMouseMove={draw}
            onMouseUp={endDraw}
            onMouseLeave={endDraw}
            style={{ width: '100%', height: 200 }}
          />
        </div>
        <div className="modal-footer">
          <button className="btn" onClick={clearCanvas}>Clear</button>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={saveSignature} disabled={!hasContent}>
            Save Signature
          </button>
        </div>
      </div>
    </div>
  );
}
