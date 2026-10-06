import React, { useState, useRef } from 'react';
import { mergePDFs, downloadBlob } from '../utils/pdf';
import { XIcon, PlusIcon, TrashIcon } from './Icons';

interface Props {
  onClose: () => void;
  onMerged: (data: ArrayBuffer, name: string) => void;
}

export default function MergeModal({ onClose, onMerged }: Props) {
  const [files, setFiles] = useState<File[]>([]);
  const [merging, setMerging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = (newFiles: FileList | null) => {
    if (!newFiles) return;
    const pdfFiles = Array.from(newFiles).filter((f) => f.type === 'application/pdf');
    setFiles((prev) => [...prev, ...pdfFiles]);
  };

  const removeFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const doMerge = async () => {
    if (files.length < 2) return;
    setMerging(true);
    try {
      const buffers = await Promise.all(files.map((f) => f.arrayBuffer()));
      const merged = await mergePDFs(buffers);
      onMerged(merged.buffer as ArrayBuffer, 'merged.pdf');
      onClose();
    } finally {
      setMerging(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal fade-in" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">Merge PDFs</span>
          <button className="btn btn-icon" onClick={onClose}><XIcon /></button>
        </div>
        <div className="modal-body">
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12 }}>
            Add two or more PDF files to merge them into a single document.
          </p>
          <input ref={inputRef} type="file" accept=".pdf" multiple onChange={(e) => addFiles(e.target.files)} />
          <button className="btn btn-primary" onClick={() => inputRef.current?.click()}>
            <PlusIcon /> Add Files
          </button>
          <div style={{ marginTop: 12 }}>
            {files.map((f, i) => (
              <div key={i} className="pages-manage-item">
                <span>{f.name}</span>
                <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>
                  {(f.size / 1024).toFixed(0)} KB
                </span>
                <button className="btn btn-icon btn-sm btn-danger" onClick={() => removeFile(i)}>
                  <TrashIcon />
                </button>
              </div>
            ))}
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={doMerge} disabled={files.length < 2 || merging}>
            {merging ? 'Merging...' : 'Merge'}
          </button>
        </div>
      </div>
    </div>
  );
}
