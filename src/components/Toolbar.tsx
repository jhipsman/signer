import React from 'react';
import type { ToolMode } from '../types';
import {
  MousePointerIcon, HandIcon, TextIcon, HighlightIcon, UnderlineIcon,
  StrikethroughIcon, PenIcon, EraserIcon, StickyNoteIcon, RectangleIcon,
  CircleIcon, ArrowIcon, SignatureIcon, StampIcon, RedactIcon,
} from './Icons';

interface Props {
  activeTool: ToolMode;
  onToolChange: (tool: ToolMode) => void;
  color: string;
  onColorChange: (color: string) => void;
  strokeWidth: number;
  onStrokeWidthChange: (w: number) => void;
  fontSize: number;
  onFontSizeChange: (s: number) => void;
  opacity: number;
  onOpacityChange: (o: number) => void;
}

const tools: Array<{ mode: ToolMode; icon: React.FC; label: string }> = [
  { mode: 'select', icon: MousePointerIcon, label: 'Select' },
  { mode: 'pan', icon: HandIcon, label: 'Pan' },
  { mode: 'text', icon: TextIcon, label: 'Add Text' },
  { mode: 'highlight', icon: HighlightIcon, label: 'Highlight' },
  { mode: 'underline', icon: UnderlineIcon, label: 'Underline' },
  { mode: 'strikethrough', icon: StrikethroughIcon, label: 'Strikethrough' },
  { mode: 'drawing', icon: PenIcon, label: 'Draw' },
  { mode: 'eraser', icon: EraserIcon, label: 'Eraser' },
  { mode: 'sticky-note', icon: StickyNoteIcon, label: 'Sticky Note' },
  { mode: 'rectangle', icon: RectangleIcon, label: 'Rectangle' },
  { mode: 'circle', icon: CircleIcon, label: 'Circle' },
  { mode: 'arrow', icon: ArrowIcon, label: 'Arrow' },
  { mode: 'signature', icon: SignatureIcon, label: 'Sign' },
  { mode: 'stamp', icon: StampIcon, label: 'Stamp' },
  { mode: 'redact', icon: RedactIcon, label: 'Redact' },
];

export default function Toolbar({
  activeTool, onToolChange, color, onColorChange,
  strokeWidth, onStrokeWidthChange, fontSize, onFontSizeChange,
  opacity, onOpacityChange,
}: Props) {
  return (
    <div className="toolbar">
      <div className="toolbar-group">
        {tools.map(({ mode, icon: Icon, label }) => (
          <button
            key={mode}
            className={`btn btn-icon tooltip ${activeTool === mode ? 'active' : ''}`}
            data-tooltip={label}
            onClick={() => onToolChange(mode)}
          >
            <Icon />
          </button>
        ))}
      </div>

      <div className="toolbar-group">
        <input
          type="color"
          className="color-picker"
          value={color}
          onChange={(e) => onColorChange(e.target.value)}
          title="Color"
        />
        <select
          className="select"
          value={strokeWidth}
          onChange={(e) => onStrokeWidthChange(Number(e.target.value))}
          title="Stroke Width"
        >
          {[1, 2, 3, 4, 5, 8, 10].map((w) => (
            <option key={w} value={w}>{w}px</option>
          ))}
        </select>
        <select
          className="select"
          value={fontSize}
          onChange={(e) => onFontSizeChange(Number(e.target.value))}
          title="Font Size"
        >
          {[8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 64].map((s) => (
            <option key={s} value={s}>{s}pt</option>
          ))}
        </select>
        <select
          className="select"
          value={opacity}
          onChange={(e) => onOpacityChange(Number(e.target.value))}
          title="Opacity"
        >
          {[0.1, 0.2, 0.3, 0.5, 0.7, 0.8, 1].map((o) => (
            <option key={o} value={o}>{Math.round(o * 100)}%</option>
          ))}
        </select>
      </div>
    </div>
  );
}
