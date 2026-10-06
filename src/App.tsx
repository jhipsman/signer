import React, { useState, useRef, useCallback, useEffect } from 'react';
import { usePDFDocument } from './hooks/usePDFDocument';
import Toolbar from './components/Toolbar';
import Sidebar from './components/Sidebar';
import PDFViewer from './components/PDFViewer';
import SearchBar from './components/SearchBar';
import MergeModal from './components/MergeModal';
import SplitModal from './components/SplitModal';
import SignatureModal from './components/SignatureModal';
import type { ToolMode, SidebarTab } from './types';
import { deletePages, extractPages, downloadBlob } from './utils/pdf';
import {
  FolderOpenIcon, SaveIcon, PrintIcon, UndoIcon, RedoIcon,
  ZoomInIcon, ZoomOutIcon, SearchIcon, MergeIcon, SplitIcon,
  SidebarIcon, SunIcon, MoonIcon, DownloadIcon, UploadIcon,
  RotateCWIcon, RotateCCWIcon, MaximizeIcon, TrashIcon,
  ScissorsIcon, ChevronLeftIcon, ChevronRightIcon, SignatureIcon,
  FileIcon,
} from './components/Icons';

export default function App() {
  const pdf = usePDFDocument();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mergeInputRef = useRef<HTMLInputElement>(null);

  const [activeTool, setActiveTool] = useState<ToolMode>('select');
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('thumbnails');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [scale, setScale] = useState(1.2);
  const [showSearch, setShowSearch] = useState(false);
  const [showMerge, setShowMerge] = useState(false);
  const [showSplit, setShowSplit] = useState(false);
  const [showSignature, setShowSignature] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [dragOver, setDragOver] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [savedSignatures, setSavedSignatures] = useState<string[]>([]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }, []);

  const handleOpenFile = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileSelected = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await pdf.openFile(file);
      showToast(`Opened: ${file.name}`);
    }
  }, [pdf, showToast]);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file?.type === 'application/pdf') {
      await pdf.openFile(file);
      showToast(`Opened: ${file.name}`);
    }
  }, [pdf, showToast]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  const zoomIn = () => setScale((s) => Math.min(s + 0.2, 5));
  const zoomOut = () => setScale((s) => Math.max(s - 0.2, 0.3));
  const zoomFit = () => setScale(1.0);

  const handleSave = useCallback(async () => {
    await pdf.savePDF();
    showToast('PDF saved with annotations');
  }, [pdf, showToast]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const handleNavigateToPage = useCallback((page: number) => {
    pdf.setCurrentPage(page);
    const el = document.getElementById(`page-${page}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [pdf]);

  const handleDeleteCurrentPage = useCallback(async () => {
    if (!pdf.rawData.current || pdf.totalPages <= 1) return;
    if (!confirm(`Delete page ${pdf.currentPage}?`)) return;
    const data = await deletePages(pdf.rawData.current, [pdf.currentPage]);
    await pdf.openFromBuffer(data.buffer as ArrayBuffer, pdf.fileName);
    showToast(`Deleted page ${pdf.currentPage}`);
  }, [pdf, showToast]);

  const handleExtractCurrentPage = useCallback(async () => {
    if (!pdf.rawData.current) return;
    const data = await extractPages(pdf.rawData.current, [pdf.currentPage]);
    downloadBlob(data, `page_${pdf.currentPage}.pdf`);
    showToast(`Extracted page ${pdf.currentPage}`);
  }, [pdf, showToast]);

  const handleSaveSignature = useCallback((sigData: string) => {
    setSavedSignatures((prev) => [...prev, sigData]);
    showToast('Signature saved');
  }, [showToast]);

  const handleSelectSignature = useCallback((sig: string) => {
    setActiveTool('signature');
    showToast('Signature selected — click on the page to place it');
  }, [showToast]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'o': e.preventDefault(); handleOpenFile(); break;
          case 's': e.preventDefault(); handleSave(); break;
          case 'p': e.preventDefault(); handlePrint(); break;
          case 'f': e.preventDefault(); setShowSearch((s) => !s); break;
          case 'z': e.preventDefault(); if (e.shiftKey) pdf.redo(); else pdf.undo(); break;
          case '+': case '=': e.preventDefault(); zoomIn(); break;
          case '-': e.preventDefault(); zoomOut(); break;
        }
      }
      if (e.key === 'Escape') {
        setShowSearch(false);
        setActiveTool('select');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleOpenFile, handleSave, handlePrint, pdf]);

  const [color, setColor] = useState('#ff4757');
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [fontSize, setFontSize] = useState(14);
  const [opacity, setOpacity] = useState(1);

  return (
    <div
      className="app-container"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <input ref={fileInputRef} type="file" accept=".pdf" onChange={handleFileSelected} />

      {/* Top Bar */}
      <div className="topbar">
        <span className="topbar-logo">Signer</span>
        <span className="topbar-filename">{pdf.fileName || 'No document open'}</span>
        <div className="topbar-actions">
          <button className="btn btn-sm tooltip" data-tooltip="Open (Ctrl+O)" onClick={handleOpenFile}>
            <FolderOpenIcon /> Open
          </button>
          <button className="btn btn-sm tooltip" data-tooltip="Save (Ctrl+S)" onClick={handleSave} disabled={!pdf.pdfDoc}>
            <SaveIcon /> Save
          </button>
          <button className="btn btn-sm tooltip" data-tooltip="Print (Ctrl+P)" onClick={handlePrint} disabled={!pdf.pdfDoc}>
            <PrintIcon />
          </button>
          <button className="btn btn-sm tooltip" data-tooltip="Undo (Ctrl+Z)" onClick={pdf.undo} disabled={!pdf.canUndo}>
            <UndoIcon />
          </button>
          <button className="btn btn-sm tooltip" data-tooltip="Redo (Ctrl+Shift+Z)" onClick={pdf.redo} disabled={!pdf.canRedo}>
            <RedoIcon />
          </button>

          <div style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 4px' }} />

          <button className="btn btn-sm tooltip" data-tooltip="Merge PDFs" onClick={() => setShowMerge(true)}>
            <MergeIcon /> Merge
          </button>
          <button className="btn btn-sm tooltip" data-tooltip="Split PDF" onClick={() => setShowSplit(true)} disabled={!pdf.pdfDoc}>
            <SplitIcon /> Split
          </button>
          <button className="btn btn-sm tooltip" data-tooltip="Create Signature" onClick={() => setShowSignature(true)}>
            <SignatureIcon /> Sign
          </button>

          <div style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 4px' }} />

          <button className="btn btn-sm tooltip" data-tooltip="Search (Ctrl+F)" onClick={() => setShowSearch((s) => !s)} disabled={!pdf.pdfDoc}>
            <SearchIcon />
          </button>
          <button className="btn btn-sm tooltip" data-tooltip="Toggle Sidebar" onClick={() => setSidebarOpen((s) => !s)}>
            <SidebarIcon />
          </button>
          <button className="btn btn-sm tooltip" data-tooltip="Toggle Theme" onClick={() => setDarkMode((d) => !d)}>
            {darkMode ? <SunIcon /> : <MoonIcon />}
          </button>
        </div>
      </div>

      {/* Annotation Toolbar */}
      {pdf.pdfDoc && (
        <Toolbar
          activeTool={activeTool}
          onToolChange={setActiveTool}
          color={color}
          onColorChange={setColor}
          strokeWidth={strokeWidth}
          onStrokeWidthChange={setStrokeWidth}
          fontSize={fontSize}
          onFontSizeChange={setFontSize}
          opacity={opacity}
          onOpacityChange={setOpacity}
        />
      )}

      {/* Search Bar */}
      {showSearch && pdf.pdfDoc && (
        <SearchBar
          pdfDoc={pdf.pdfDoc}
          onNavigateToPage={handleNavigateToPage}
          onClose={() => setShowSearch(false)}
        />
      )}

      {/* Main Content */}
      <div className="main-content">
        {sidebarOpen && (
          <Sidebar
            activeTab={sidebarTab}
            onTabChange={setSidebarTab}
            pdfDoc={pdf.pdfDoc}
            pdfInfo={pdf.pdfInfo}
            currentPage={pdf.currentPage}
            totalPages={pdf.totalPages}
            onPageSelect={handleNavigateToPage}
            annotations={pdf.annotations}
            onDeleteAnnotation={pdf.removeAnnotation}
            onRotatePage={pdf.rotatePage}
            savedSignatures={savedSignatures}
            onSelectSignature={handleSelectSignature}
          />
        )}

        {pdf.pdfDoc ? (
          <PDFViewer
            pdfDoc={pdf.pdfDoc}
            currentPage={pdf.currentPage}
            totalPages={pdf.totalPages}
            scale={scale}
            activeTool={activeTool}
            annotations={pdf.annotations}
            onAddAnnotation={pdf.addAnnotation}
            onPageChange={pdf.setCurrentPage}
            color={color}
            strokeWidth={strokeWidth}
            fontSize={fontSize}
            opacity={opacity}
            pageRotations={pdf.pageRotations}
          />
        ) : (
          <div className="viewer-container">
            <div className="welcome-screen">
              <FileIcon />
              <h1 className="welcome-title">Signer</h1>
              <p className="welcome-subtitle">
                A full-featured PDF editor. Open a file or drag and drop a PDF to get started.
                View, annotate, sign, merge, split, and more.
              </p>
              <div className="welcome-actions">
                <button className="btn btn-primary welcome-btn" onClick={handleOpenFile}>
                  <FolderOpenIcon /> Open PDF
                </button>
                <button className="btn welcome-btn" style={{ border: '1px solid var(--border)' }} onClick={() => setShowMerge(true)}>
                  <MergeIcon /> Merge PDFs
                </button>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 16 }}>
                <div>Keyboard shortcuts: Ctrl+O Open · Ctrl+S Save · Ctrl+F Search · Ctrl+Z Undo · Ctrl+P Print</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className="status-bar">
        {pdf.pdfDoc && (
          <>
            <span className="status-bar-item">
              Page {pdf.currentPage} of {pdf.totalPages}
            </span>
            <span className="status-bar-item">
              <button className="btn btn-sm" onClick={() => handleNavigateToPage(Math.max(1, pdf.currentPage - 1))}>
                <ChevronLeftIcon />
              </button>
              <button className="btn btn-sm" onClick={() => handleNavigateToPage(Math.min(pdf.totalPages, pdf.currentPage + 1))}>
                <ChevronRightIcon />
              </button>
            </span>
            <span className="status-bar-item">
              {pdf.annotations.length} annotation{pdf.annotations.length !== 1 ? 's' : ''}
            </span>
            <div style={{ flex: 1 }} />
            <div className="zoom-controls">
              <button className="btn btn-icon btn-sm" onClick={zoomOut}><ZoomOutIcon /></button>
              <span className="zoom-value">{Math.round(scale * 100)}%</span>
              <button className="btn btn-icon btn-sm" onClick={zoomIn}><ZoomInIcon /></button>
              <button className="btn btn-sm" onClick={zoomFit}>Fit</button>
            </div>
            <span className="status-bar-item">
              <button className="btn btn-icon btn-sm tooltip" data-tooltip="Rotate Page CW" onClick={() => pdf.rotatePage(pdf.currentPage, 90)}>
                <RotateCWIcon />
              </button>
              <button className="btn btn-icon btn-sm tooltip" data-tooltip="Rotate Page CCW" onClick={() => pdf.rotatePage(pdf.currentPage, -90)}>
                <RotateCCWIcon />
              </button>
              <button className="btn btn-icon btn-sm tooltip" data-tooltip="Delete Page" onClick={handleDeleteCurrentPage}>
                <TrashIcon />
              </button>
              <button className="btn btn-icon btn-sm tooltip" data-tooltip="Extract Page" onClick={handleExtractCurrentPage}>
                <ScissorsIcon />
              </button>
            </span>
          </>
        )}
        {!pdf.pdfDoc && <span className="status-bar-item">Ready</span>}
      </div>

      {/* Drag Overlay */}
      {dragOver && (
        <div className="drop-overlay">
          <div className="drop-overlay-text">Drop PDF here</div>
        </div>
      )}

      {/* Modals */}
      {showMerge && (
        <MergeModal
          onClose={() => setShowMerge(false)}
          onMerged={async (data, name) => {
            await pdf.openFromBuffer(data, name);
            showToast('PDFs merged successfully');
          }}
        />
      )}
      {showSplit && pdf.rawData.current && (
        <SplitModal
          totalPages={pdf.totalPages}
          rawData={pdf.rawData.current}
          onClose={() => setShowSplit(false)}
        />
      )}
      {showSignature && (
        <SignatureModal
          onClose={() => setShowSignature(false)}
          onSave={handleSaveSignature}
        />
      )}

      {/* Toast */}
      {toast && <div className="toast">{toast}</div>}

      {/* Loading */}
      {pdf.loading && (
        <div className="modal-overlay" style={{ background: 'rgba(0,0,0,0.3)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <div className="spinner" />
            <span style={{ color: 'var(--text-primary)', fontSize: 14 }}>Loading PDF...</span>
          </div>
        </div>
      )}
    </div>
  );
}
