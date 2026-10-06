import React, { useEffect, useRef, useCallback } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import type { Annotation, SidebarTab, PDFDocumentInfo } from '../types';
import { renderPage } from '../utils/pdf';
import {
  GridIcon, BookmarkIcon, LayersIcon, SignatureIcon, ListIcon,
  TrashIcon, RotateCWIcon, InfoIcon,
} from './Icons';

interface Props {
  activeTab: SidebarTab;
  onTabChange: (tab: SidebarTab) => void;
  pdfDoc: PDFDocumentProxy | null;
  pdfInfo: PDFDocumentInfo | null;
  currentPage: number;
  totalPages: number;
  onPageSelect: (page: number) => void;
  annotations: Annotation[];
  onDeleteAnnotation: (id: string) => void;
  onRotatePage: (page: number, degrees: number) => void;
  savedSignatures: Array<{ image: string; text?: string }>;
  onSelectSignature: (sig: { image: string; text?: string }) => void;
}

const tabs: Array<{ id: SidebarTab; icon: React.FC; label: string }> = [
  { id: 'thumbnails', icon: GridIcon, label: 'Pages' },
  { id: 'bookmarks', icon: BookmarkIcon, label: 'Bookmarks' },
  { id: 'annotations', icon: LayersIcon, label: 'Annotations' },
  { id: 'signatures', icon: SignatureIcon, label: 'Signatures' },
  { id: 'pages', icon: ListIcon, label: 'Info' },
];

function ThumbnailItem({ pdfDoc, pageNum, isActive, onClick }: {
  pdfDoc: PDFDocumentProxy;
  pageNum: number;
  isActive: boolean;
  onClick: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const page = await pdfDoc.getPage(pageNum);
      if (cancelled || !canvasRef.current) return;
      await renderPage(page, canvasRef.current, 0.3);
    })();
    return () => { cancelled = true; };
  }, [pdfDoc, pageNum]);

  return (
    <div className={`thumbnail-item ${isActive ? 'active' : ''}`} onClick={onClick}>
      <canvas ref={canvasRef} />
      <span className="thumbnail-label">{pageNum}</span>
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export default function Sidebar({
  activeTab, onTabChange, pdfDoc, pdfInfo, currentPage, totalPages,
  onPageSelect, annotations, onDeleteAnnotation, onRotatePage,
  savedSignatures, onSelectSignature,
}: Props) {
  const renderContent = () => {
    switch (activeTab) {
      case 'thumbnails':
        if (!pdfDoc) return <div style={{ padding: 16, color: 'var(--text-muted)', fontSize: 12 }}>No document loaded</div>;
        return (
          <div className="thumbnail-grid">
            {Array.from({ length: totalPages }, (_, i) => (
              <ThumbnailItem
                key={i + 1}
                pdfDoc={pdfDoc}
                pageNum={i + 1}
                isActive={currentPage === i + 1}
                onClick={() => onPageSelect(i + 1)}
              />
            ))}
          </div>
        );

      case 'bookmarks':
        return (
          <div style={{ padding: 16 }}>
            {totalPages > 0 ? (
              Array.from({ length: totalPages }, (_, i) => (
                <div key={i} className="bookmark-item" onClick={() => onPageSelect(i + 1)}>
                  <BookmarkIcon />
                  <span>Page {i + 1}</span>
                </div>
              ))
            ) : (
              <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>No bookmarks</div>
            )}
          </div>
        );

      case 'annotations':
        return (
          <div style={{ padding: 8 }}>
            {annotations.length === 0 ? (
              <div style={{ padding: 8, color: 'var(--text-muted)', fontSize: 12 }}>No annotations yet</div>
            ) : (
              annotations.map((ann) => (
                <div key={ann.id} className="annotation-item" onClick={() => onPageSelect(ann.pageNumber)}>
                  <div className="annotation-dot" style={{ background: ann.color }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12 }}>{ann.type}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Page {ann.pageNumber}</div>
                  </div>
                  <button className="btn btn-icon btn-sm btn-danger" onClick={(e) => { e.stopPropagation(); onDeleteAnnotation(ann.id); }}>
                    <TrashIcon />
                  </button>
                </div>
              ))
            )}
          </div>
        );

      case 'signatures':
        return (
          <div style={{ padding: 16 }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
              Saved signatures will appear here. Use the Sign tool to create one.
            </div>
            {savedSignatures.map((sig, i) => (
              <div
                key={i}
                style={{
                  padding: 12, marginBottom: 8, background: 'white',
                  borderRadius: 'var(--radius)', cursor: 'pointer',
                  border: '1px solid var(--border)',
                }}
                onClick={() => onSelectSignature(sig)}
              >
                <img src={sig.image} alt={`Signature ${i + 1}`} style={{ maxWidth: '100%', height: 40, objectFit: 'contain' }} />
              </div>
            ))}
          </div>
        );

      case 'pages':
        if (!pdfInfo) return <div style={{ padding: 16, color: 'var(--text-muted)', fontSize: 12 }}>No document loaded</div>;
        return (
          <div className="properties-panel">
            <h3><InfoIcon /> Document Properties</h3>
            {[
              ['File Name', pdfInfo.name],
              ['Pages', String(pdfInfo.pageCount)],
              ['File Size', formatFileSize(pdfInfo.fileSize)],
              ['Title', pdfInfo.title],
              ['Author', pdfInfo.author],
              ['Subject', pdfInfo.subject],
              ['Creator', pdfInfo.creator],
              ['Producer', pdfInfo.producer],
            ].filter(([, v]) => v).map(([label, value]) => (
              <div key={label} className="property-row">
                <span className="property-label">{label}</span>
                <span className="property-value">{value}</span>
              </div>
            ))}

            <h3 style={{ marginTop: 20 }}>Page Management</h3>
            {Array.from({ length: totalPages }, (_, i) => (
              <div key={i} className="pages-manage-item">
                <span>Page {i + 1}</span>
                <div className="pages-manage-actions">
                  <button className="btn btn-icon btn-sm tooltip" data-tooltip="Rotate" onClick={() => onRotatePage(i + 1, 90)}>
                    <RotateCWIcon />
                  </button>
                </div>
              </div>
            ))}
          </div>
        );
    }
  };

  return (
    <div className="sidebar">
      <div className="sidebar-tabs">
        {tabs.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            className={`sidebar-tab ${activeTab === id ? 'active' : ''}`}
            onClick={() => onTabChange(id)}
          >
            <Icon />
            <span>{label}</span>
          </button>
        ))}
      </div>
      <div className="sidebar-content">
        {renderContent()}
      </div>
    </div>
  );
}
