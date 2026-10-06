import React, { useState } from 'react';
import { splitPDF, downloadBlob } from '../utils/pdf';
import { XIcon } from './Icons';

interface Props {
  totalPages: number;
  rawData: ArrayBuffer | null;
  onClose: () => void;
}

export default function SplitModal({ totalPages, rawData, onClose }: Props) {
  const [splitMode, setSplitMode] = useState<'range' | 'every'>('range');
  const [rangeText, setRangeText] = useState('');
  const [everyN, setEveryN] = useState(1);
  const [splitting, setSplitting] = useState(false);

  const doSplit = async () => {
    if (!rawData) return;
    setSplitting(true);
    try {
      let ranges: Array<{ start: number; end: number }> = [];

      if (splitMode === 'range') {
        const parts = rangeText.split(',').map((s) => s.trim());
        for (const part of parts) {
          if (part.includes('-')) {
            const [a, b] = part.split('-').map(Number);
            if (a && b && a <= b && b <= totalPages) {
              ranges.push({ start: a, end: b });
            }
          } else {
            const n = Number(part);
            if (n && n <= totalPages) {
              ranges.push({ start: n, end: n });
            }
          }
        }
      } else {
        for (let i = 0; i < totalPages; i += everyN) {
          ranges.push({ start: i + 1, end: Math.min(i + everyN, totalPages) });
        }
      }

      if (ranges.length === 0) return;
      const results = await splitPDF(rawData, ranges);
      results.forEach((data, i) => {
        downloadBlob(data, `split_${i + 1}.pdf`);
      });
      onClose();
    } finally {
      setSplitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal fade-in" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">Split PDF</span>
          <button className="btn btn-icon" onClick={onClose}><XIcon /></button>
        </div>
        <div className="modal-body">
          <div className="input-group">
            <label className="input-label">Split Mode</label>
            <select className="select" value={splitMode} onChange={(e) => setSplitMode(e.target.value as 'range' | 'every')}>
              <option value="range">By Page Ranges</option>
              <option value="every">Every N Pages</option>
            </select>
          </div>

          {splitMode === 'range' ? (
            <div className="input-group">
              <label className="input-label">Page Ranges (e.g., 1-3, 4-6, 7)</label>
              <input className="input" value={rangeText} onChange={(e) => setRangeText(e.target.value)} placeholder="1-3, 4-6" />
            </div>
          ) : (
            <div className="input-group">
              <label className="input-label">Split every N pages</label>
              <input className="input" type="number" min={1} max={totalPages} value={everyN} onChange={(e) => setEveryN(Number(e.target.value))} />
            </div>
          )}

          <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Total pages: {totalPages}</p>
        </div>
        <div className="modal-footer">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={doSplit} disabled={splitting}>
            {splitting ? 'Splitting...' : 'Split & Download'}
          </button>
        </div>
      </div>
    </div>
  );
}
