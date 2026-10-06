import { useState, useCallback, useRef } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { loadPDF, getPDFInfo, addAnnotationsToPDF, downloadBlob } from '../utils/pdf';
import type { Annotation, PDFDocumentInfo } from '../types';

export function usePDFDocument() {
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [pdfInfo, setPdfInfo] = useState<PDFDocumentInfo | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [loading, setLoading] = useState(false);
  const [pageRotations, setPageRotations] = useState<Map<number, number>>(new Map());
  const rawDataRef = useRef<ArrayBuffer | null>(null);
  const fileRef = useRef<File | null>(null);
  const undoStackRef = useRef<Annotation[][]>([]);
  const redoStackRef = useRef<Annotation[][]>([]);

  const openFile = useCallback(async (file: File) => {
    setLoading(true);
    try {
      const data = await file.arrayBuffer();
      rawDataRef.current = data.slice(0);
      fileRef.current = file;
      const doc = await loadPDF(data);
      const info = await getPDFInfo(doc, file);
      setPdfDoc(doc);
      setPdfInfo(info);
      setTotalPages(doc.numPages);
      setCurrentPage(1);
      setAnnotations([]);
      setPageRotations(new Map());
      undoStackRef.current = [];
      redoStackRef.current = [];
    } finally {
      setLoading(false);
    }
  }, []);

  const openFromBuffer = useCallback(async (data: ArrayBuffer, name: string) => {
    setLoading(true);
    try {
      rawDataRef.current = data.slice(0);
      const file = new File([data], name, { type: 'application/pdf' });
      fileRef.current = file;
      const doc = await loadPDF(data);
      const info = await getPDFInfo(doc, file);
      setPdfDoc(doc);
      setPdfInfo(info);
      setTotalPages(doc.numPages);
      setCurrentPage(1);
      setAnnotations([]);
      setPageRotations(new Map());
    } finally {
      setLoading(false);
    }
  }, []);

  const addAnnotation = useCallback((annotation: Annotation) => {
    setAnnotations((prev) => {
      undoStackRef.current.push([...prev]);
      redoStackRef.current = [];
      return [...prev, annotation];
    });
  }, []);

  const removeAnnotation = useCallback((id: string) => {
    setAnnotations((prev) => {
      undoStackRef.current.push([...prev]);
      redoStackRef.current = [];
      return prev.filter((a) => a.id !== id);
    });
  }, []);

  const updateAnnotation = useCallback((id: string, updates: Partial<Annotation>) => {
    setAnnotations((prev) => {
      undoStackRef.current.push([...prev]);
      redoStackRef.current = [];
      return prev.map((a) => (a.id === id ? { ...a, ...updates } : a));
    });
  }, []);

  const undo = useCallback(() => {
    const prev = undoStackRef.current.pop();
    if (prev) {
      setAnnotations((current) => {
        redoStackRef.current.push([...current]);
        return prev;
      });
    }
  }, []);

  const redo = useCallback(() => {
    const next = redoStackRef.current.pop();
    if (next) {
      setAnnotations((current) => {
        undoStackRef.current.push([...current]);
        return next;
      });
    }
  }, []);

  const canUndo = undoStackRef.current.length > 0;
  const canRedo = redoStackRef.current.length > 0;

  const savePDF = useCallback(async () => {
    if (!rawDataRef.current || !fileRef.current) return;
    const saved = await addAnnotationsToPDF(rawDataRef.current, annotations, pageRotations);
    const name = fileRef.current.name.replace('.pdf', '_edited.pdf');
    downloadBlob(saved, name);
  }, [annotations, pageRotations]);

  const rotatePage = useCallback((pageNum: number, degrees: number) => {
    setPageRotations((prev) => {
      const next = new Map(prev);
      const current = next.get(pageNum) || 0;
      next.set(pageNum, (current + degrees) % 360);
      return next;
    });
  }, []);

  return {
    pdfDoc,
    pdfInfo,
    currentPage,
    setCurrentPage,
    totalPages,
    annotations,
    addAnnotation,
    removeAnnotation,
    updateAnnotation,
    loading,
    openFile,
    openFromBuffer,
    savePDF,
    undo,
    redo,
    canUndo,
    canRedo,
    rawData: rawDataRef,
    fileName: fileRef.current?.name || '',
    pageRotations,
    rotatePage,
  };
}
