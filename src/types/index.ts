export interface PDFDocumentInfo {
  name: string;
  pageCount: number;
  fileSize: number;
  author?: string;
  title?: string;
  subject?: string;
  creator?: string;
  producer?: string;
  creationDate?: string;
  modificationDate?: string;
}

export type AnnotationType = 'highlight' | 'underline' | 'strikethrough' | 'freetext' | 'drawing' | 'sticky-note' | 'rectangle' | 'circle' | 'arrow' | 'signature';

export type ToolMode = 'select' | 'pan' | 'text' | 'highlight' | 'underline' | 'strikethrough' | 'drawing' | 'eraser' | 'sticky-note' | 'rectangle' | 'circle' | 'arrow' | 'signature' | 'stamp' | 'redact';

export interface Annotation {
  id: string;
  type: AnnotationType;
  pageNumber: number;
  x: number;
  y: number;
  width?: number;
  height?: number;
  content?: string;
  color: string;
  opacity: number;
  fontSize?: number;
  fontFamily?: string;
  strokeWidth?: number;
  points?: Array<{ x: number; y: number }>;
  timestamp: number;
}

export interface Bookmark {
  id: string;
  title: string;
  pageNumber: number;
  children?: Bookmark[];
}

export interface SearchResult {
  pageNumber: number;
  matchIndex: number;
  text: string;
}

export type SidebarTab = 'thumbnails' | 'bookmarks' | 'annotations' | 'signatures' | 'pages';

export type ViewMode = 'single' | 'continuous' | 'two-page';
