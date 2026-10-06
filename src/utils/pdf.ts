import * as pdfjsLib from 'pdfjs-dist';
import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist';
import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';
import type { Annotation, PDFDocumentInfo } from '../types';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

export async function loadPDF(data: ArrayBuffer): Promise<PDFDocumentProxy> {
  const copy = data.slice(0);
  return pdfjsLib.getDocument({ data: copy }).promise;
}

export async function renderPage(
  page: PDFPageProxy,
  canvas: HTMLCanvasElement,
  scale: number,
  extraRotation: number = 0
): Promise<void> {
  const totalRotation = (page.rotate + extraRotation) % 360;
  const viewport = page.getViewport({ scale, rotation: totalRotation });
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);
  canvas.style.width = Math.floor(viewport.width) + 'px';
  canvas.style.height = Math.floor(viewport.height) + 'px';
  const ctx = canvas.getContext('2d', { willReadFrequently: false })!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const renderTask = page.render({ canvasContext: ctx, viewport } as any);
  await renderTask.promise;
}

export async function getPageText(page: PDFPageProxy): Promise<string> {
  const content = await page.getTextContent();
  return content.items.map((item: any) => item.str).join(' ');
}

export async function getPDFInfo(
  doc: PDFDocumentProxy,
  file: File
): Promise<PDFDocumentInfo> {
  const metadata = await doc.getMetadata();
  const info = metadata.info as any;
  return {
    name: file.name,
    pageCount: doc.numPages,
    fileSize: file.size,
    author: info?.Author,
    title: info?.Title,
    subject: info?.Subject,
    creator: info?.Creator,
    producer: info?.Producer,
    creationDate: info?.CreationDate,
    modificationDate: info?.ModDate,
  };
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16) / 255,
        g: parseInt(result[2], 16) / 255,
        b: parseInt(result[3], 16) / 255,
      }
    : { r: 0, g: 0, b: 0 };
}

export async function addAnnotationsToPDF(
  originalData: ArrayBuffer,
  annotations: Annotation[],
  pageRotations: Map<number, number>
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(originalData);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const pages = pdfDoc.getPages();

  for (const [pageNum, rotation] of pageRotations) {
    if (pageNum > 0 && pageNum <= pages.length) {
      pages[pageNum - 1].setRotation(degrees(rotation));
    }
  }

  for (const annotation of annotations) {
    const pageIndex = annotation.pageNumber - 1;
    if (pageIndex < 0 || pageIndex >= pages.length) continue;
    const page = pages[pageIndex];
    const { height } = page.getSize();
    const { r, g, b } = hexToRgb(annotation.color);

    switch (annotation.type) {
      case 'freetext':
        page.drawText(annotation.content || '', {
          x: annotation.x,
          y: height - annotation.y - (annotation.fontSize || 14),
          size: annotation.fontSize || 14,
          font,
          color: rgb(r, g, b),
          opacity: annotation.opacity,
        });
        break;

      case 'rectangle':
        page.drawRectangle({
          x: annotation.x,
          y: height - annotation.y - (annotation.height || 50),
          width: annotation.width || 100,
          height: annotation.height || 50,
          borderColor: rgb(r, g, b),
          borderWidth: annotation.strokeWidth || 2,
          opacity: annotation.opacity,
        });
        break;

      case 'circle':
        page.drawEllipse({
          x: annotation.x + (annotation.width || 50) / 2,
          y: height - annotation.y - (annotation.height || 50) / 2,
          xScale: (annotation.width || 50) / 2,
          yScale: (annotation.height || 50) / 2,
          borderColor: rgb(r, g, b),
          borderWidth: annotation.strokeWidth || 2,
          opacity: annotation.opacity,
        });
        break;

      case 'highlight':
        page.drawRectangle({
          x: annotation.x,
          y: height - annotation.y - (annotation.height || 20),
          width: annotation.width || 100,
          height: annotation.height || 20,
          color: rgb(r, g, b),
          opacity: 0.3,
        });
        break;

      case 'drawing':
        if (annotation.points && annotation.points.length > 1) {
          for (let i = 0; i < annotation.points.length - 1; i++) {
            page.drawLine({
              start: {
                x: annotation.points[i].x,
                y: height - annotation.points[i].y,
              },
              end: {
                x: annotation.points[i + 1].x,
                y: height - annotation.points[i + 1].y,
              },
              thickness: annotation.strokeWidth || 2,
              color: rgb(r, g, b),
              opacity: annotation.opacity,
            });
          }
        }
        break;

      case 'signature':
        if (annotation.points && annotation.points.length > 1) {
          for (let i = 0; i < annotation.points.length - 1; i++) {
            page.drawLine({
              start: {
                x: annotation.points[i].x,
                y: height - annotation.points[i].y,
              },
              end: {
                x: annotation.points[i + 1].x,
                y: height - annotation.points[i + 1].y,
              },
              thickness: annotation.strokeWidth || 2,
              color: rgb(r, g, b),
              opacity: annotation.opacity,
            });
          }
        }
        break;
    }
  }

  return pdfDoc.save();
}

export async function mergePDFs(files: ArrayBuffer[]): Promise<Uint8Array> {
  const mergedDoc = await PDFDocument.create();
  for (const fileData of files) {
    const srcDoc = await PDFDocument.load(fileData);
    const pages = await mergedDoc.copyPages(srcDoc, srcDoc.getPageIndices());
    pages.forEach((page) => mergedDoc.addPage(page));
  }
  return mergedDoc.save();
}

export async function splitPDF(
  data: ArrayBuffer,
  ranges: Array<{ start: number; end: number }>
): Promise<Uint8Array[]> {
  const results: Uint8Array[] = [];
  for (const range of ranges) {
    const srcDoc = await PDFDocument.load(data);
    const newDoc = await PDFDocument.create();
    const indices = [];
    for (let i = range.start - 1; i < range.end; i++) {
      indices.push(i);
    }
    const pages = await newDoc.copyPages(srcDoc, indices);
    pages.forEach((page) => newDoc.addPage(page));
    results.push(await newDoc.save());
  }
  return results;
}

export async function deletePages(
  data: ArrayBuffer,
  pageNumbers: number[]
): Promise<Uint8Array> {
  const srcDoc = await PDFDocument.load(data);
  const newDoc = await PDFDocument.create();
  const allIndices = srcDoc.getPageIndices();
  const keepIndices = allIndices.filter((i) => !pageNumbers.includes(i + 1));
  if (keepIndices.length === 0) return srcDoc.save();
  const pages = await newDoc.copyPages(srcDoc, keepIndices);
  pages.forEach((page) => newDoc.addPage(page));
  return newDoc.save();
}

export async function reorderPages(
  data: ArrayBuffer,
  newOrder: number[]
): Promise<Uint8Array> {
  const srcDoc = await PDFDocument.load(data);
  const newDoc = await PDFDocument.create();
  const indices = newOrder.map((n) => n - 1);
  const pages = await newDoc.copyPages(srcDoc, indices);
  pages.forEach((page) => newDoc.addPage(page));
  return newDoc.save();
}

export async function extractPages(
  data: ArrayBuffer,
  pageNumbers: number[]
): Promise<Uint8Array> {
  const srcDoc = await PDFDocument.load(data);
  const newDoc = await PDFDocument.create();
  const indices = pageNumbers.map((n) => n - 1);
  const pages = await newDoc.copyPages(srcDoc, indices);
  pages.forEach((page) => newDoc.addPage(page));
  return newDoc.save();
}

export async function rotatePage(
  data: ArrayBuffer,
  pageNumber: number,
  rotationDegrees: number
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(data);
  const page = pdfDoc.getPage(pageNumber - 1);
  const currentRotation = page.getRotation().angle;
  page.setRotation(degrees(currentRotation + rotationDegrees));
  return pdfDoc.save();
}

export function downloadBlob(data: Uint8Array, filename: string) {
  const blob = new Blob([data as any], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
