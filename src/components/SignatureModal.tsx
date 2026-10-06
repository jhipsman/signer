import React, { useRef, useState, useEffect } from 'react';
import { XIcon } from './Icons';

interface Props {
  onClose: () => void;
  onSave: (signatureData: string, signatureText?: string) => void;
}

type TabMode = 'draw' | 'type';

const SIGNATURE_FONTS = [
  { name: 'Dancing Script', css: "'Dancing Script', cursive" },
  { name: 'Great Vibes', css: "'Great Vibes', cursive" },
  { name: 'Sacramento', css: "'Sacramento', cursive" },
  { name: 'Satisfy', css: "'Satisfy', cursive" },
  { name: 'Brush Script', css: "'Brush Script MT', 'Segoe Script', cursive" },
  { name: 'Georgia Italic', css: "Georgia, 'Times New Roman', serif" },
];

export default function SignatureModal({ onClose, onSave }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasContent, setHasContent] = useState(false);
  const [penColor, setPenColor] = useState('#1a1a2e');
  const [penWidth, setPenWidth] = useState(2);
  const [tab, setTab] = useState<TabMode>('type');
  const [typedName, setTypedName] = useState('');
  const [selectedFont, setSelectedFont] = useState(0);
  const [typedSize, setTypedSize] = useState(48);
  const typedCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = 500;
    canvas.height = 200;
    clearDrawCanvas();
  }, []);

  function clearDrawCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#ccc';
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(20, 160);
    ctx.lineTo(480, 160);
    ctx.stroke();
    ctx.setLineDash([]);
    setHasContent(false);
  }

  useEffect(() => {
    renderTypedPreview();
  }, [typedName, selectedFont, typedSize, penColor]);

  function renderTypedPreview() {
    const canvas = typedCanvasRef.current;
    if (!canvas) return;
    canvas.width = 500;
    canvas.height = 200;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, 500, 200);

    ctx.strokeStyle = '#ccc';
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(20, 160);
    ctx.lineTo(480, 160);
    ctx.stroke();
    ctx.setLineDash([]);

    if (typedName) {
      ctx.fillStyle = penColor;
      ctx.font = `italic ${typedSize}px ${SIGNATURE_FONTS[selectedFont].css}`;
      ctx.textBaseline = 'alphabetic';
      const measured = ctx.measureText(typedName);
      const x = (500 - measured.width) / 2;
      ctx.fillText(typedName, Math.max(10, x), 150);
    }
  }

  const startDraw = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    ctx.beginPath();
    ctx.moveTo((e.clientX - rect.left) * scaleX, (e.clientY - rect.top) * scaleY);
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
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    ctx.lineTo((e.clientX - rect.left) * scaleX, (e.clientY - rect.top) * scaleY);
    ctx.stroke();
    setHasContent(true);
  };

  const endDraw = () => setIsDrawing(false);

  const saveSignature = () => {
    if (tab === 'draw') {
      const canvas = canvasRef.current;
      if (!canvas || !hasContent) return;
      onSave(canvas.toDataURL('image/png'));
    } else {
      if (!typedName.trim()) return;
      const canvas = typedCanvasRef.current;
      if (!canvas) return;
      onSave(
        canvas.toDataURL('image/png'),
        typedName.trim()
      );
    }
    onClose();
  };

  const canSave = tab === 'draw' ? hasContent : typedName.trim().length > 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal fade-in" onClick={(e) => e.stopPropagation()} style={{ minWidth: 560 }}>
        <div className="modal-header">
          <span className="modal-title">Create Signature</span>
          <button className="btn btn-icon" onClick={onClose}><XIcon /></button>
        </div>
        <div className="modal-body">
          {/* Tabs */}
          <div style={{ display: 'flex', gap: 0, marginBottom: 16, borderBottom: '1px solid var(--border)' }}>
            <button
              className={`btn ${tab === 'type' ? 'active' : ''}`}
              style={{ borderBottom: tab === 'type' ? '2px solid var(--accent)' : '2px solid transparent', borderRadius: 0 }}
              onClick={() => setTab('type')}
            >
              Type Signature
            </button>
            <button
              className={`btn ${tab === 'draw' ? 'active' : ''}`}
              style={{ borderBottom: tab === 'draw' ? '2px solid var(--accent)' : '2px solid transparent', borderRadius: 0 }}
              onClick={() => setTab('draw')}
            >
              Draw Signature
            </button>
          </div>

          {tab === 'type' ? (
            <>
              <div className="input-group">
                <label className="input-label">Your name</label>
                <input
                  className="input"
                  placeholder="Type your full name..."
                  value={typedName}
                  onChange={(e) => setTypedName(e.target.value)}
                  autoFocus
                  style={{ fontSize: 16 }}
                />
              </div>

              <div className="input-group">
                <label className="input-label">Signature style</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {SIGNATURE_FONTS.map((font, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedFont(i)}
                      style={{
                        padding: '12px 8px',
                        background: selectedFont === i ? 'var(--accent-muted)' : 'var(--bg-primary)',
                        border: selectedFont === i ? '2px solid var(--accent)' : '1px solid var(--border)',
                        borderRadius: 'var(--radius)',
                        cursor: 'pointer',
                        color: 'var(--text-primary)',
                        fontFamily: font.css,
                        fontStyle: 'italic',
                        fontSize: 20,
                        textAlign: 'center',
                        overflow: 'hidden',
                        whiteSpace: 'nowrap',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {typedName || font.name}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
                <input type="color" className="color-picker" value={penColor} onChange={(e) => setPenColor(e.target.value)} />
                <label className="input-label" style={{ margin: 0 }}>Size:</label>
                <select className="select" value={typedSize} onChange={(e) => setTypedSize(Number(e.target.value))}>
                  {[24, 32, 40, 48, 56, 64, 72].map((s) => (
                    <option key={s} value={s}>{s}px</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: 4 }}>
                <label className="input-label">Preview</label>
              </div>
              <canvas
                ref={typedCanvasRef}
                style={{
                  width: '100%', height: 150,
                  border: '2px dashed var(--border)',
                  borderRadius: 'var(--radius)',
                  background: 'white',
                }}
              />
            </>
          ) : (
            <>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <input type="color" className="color-picker" value={penColor} onChange={(e) => setPenColor(e.target.value)} />
                <select className="select" value={penWidth} onChange={(e) => setPenWidth(Number(e.target.value))}>
                  {[1, 2, 3, 4, 5].map((w) => (
                    <option key={w} value={w}>{w}px</option>
                  ))}
                </select>
                <button className="btn btn-sm" onClick={clearDrawCanvas}>Clear</button>
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
            </>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={saveSignature} disabled={!canSave}>
            Save Signature
          </button>
        </div>
      </div>
    </div>
  );
}
