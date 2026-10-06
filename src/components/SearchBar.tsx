import React, { useState, useCallback } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { getPageText } from '../utils/pdf';
import { SearchIcon, ChevronUpIcon, ChevronDownIcon, XIcon } from './Icons';

interface Props {
  pdfDoc: PDFDocumentProxy | null;
  onNavigateToPage: (page: number) => void;
  onClose: () => void;
}

interface SearchResult {
  pageNumber: number;
  snippet: string;
}

export default function SearchBar({ pdfDoc, onNavigateToPage, onClose }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [currentResult, setCurrentResult] = useState(-1);
  const [searching, setSearching] = useState(false);

  const doSearch = useCallback(async () => {
    if (!pdfDoc || !query.trim()) return;
    setSearching(true);
    const found: SearchResult[] = [];
    for (let i = 1; i <= pdfDoc.numPages; i++) {
      const page = await pdfDoc.getPage(i);
      const text = await getPageText(page);
      const lowerText = text.toLowerCase();
      const lowerQuery = query.toLowerCase();
      if (lowerText.includes(lowerQuery)) {
        const idx = lowerText.indexOf(lowerQuery);
        const start = Math.max(0, idx - 30);
        const end = Math.min(text.length, idx + query.length + 30);
        found.push({
          pageNumber: i,
          snippet: '...' + text.substring(start, end) + '...',
        });
      }
    }
    setResults(found);
    setCurrentResult(found.length > 0 ? 0 : -1);
    if (found.length > 0) onNavigateToPage(found[0].pageNumber);
    setSearching(false);
  }, [pdfDoc, query, onNavigateToPage]);

  const goToResult = (idx: number) => {
    if (idx < 0 || idx >= results.length) return;
    setCurrentResult(idx);
    onNavigateToPage(results[idx].pageNumber);
  };

  return (
    <div className="search-bar">
      <SearchIcon />
      <input
        className="input"
        placeholder="Search in document..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') doSearch(); }}
        autoFocus
      />
      {results.length > 0 && (
        <span className="search-results-count">
          {currentResult + 1} / {results.length}
        </span>
      )}
      <button className="btn btn-icon btn-sm" onClick={() => goToResult(currentResult - 1)} disabled={currentResult <= 0}>
        <ChevronUpIcon />
      </button>
      <button className="btn btn-icon btn-sm" onClick={() => goToResult(currentResult + 1)} disabled={currentResult >= results.length - 1}>
        <ChevronDownIcon />
      </button>
      <button className="btn btn-icon btn-sm" onClick={onClose}>
        <XIcon />
      </button>
      {searching && <div className="spinner" style={{ width: 16, height: 16 }} />}
    </div>
  );
}
