import { parse as parseCsv } from 'csv-parse/sync';
import * as mammoth from 'mammoth';
import pdf from 'pdf-parse';
import * as XLSX from 'xlsx';

export type ParsedCsvRow = string[];

export const normalizeText = (value?: string) => {
  if (!value) return '';
  return value
    .replace(/\r/g, '\n')
    .replace(/[\t ]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

export const extractTextFromFile = async (fileBuffer: Buffer, originalName: string): Promise<string> => {
  const extension = originalName.split('.').pop()?.toLowerCase();

  if (extension === 'txt' || extension === 'md' || extension === 'json') {
    return normalizeText(fileBuffer.toString('utf8'));
  }

  if (extension === 'csv') {
    const parsed = parseCsv(fileBuffer.toString('utf8'), { columns: false, skip_empty_lines: true }) as ParsedCsvRow[];
    return normalizeText(parsed.map((row: ParsedCsvRow) => row.join(' | ')).join('\n'));
  }

  if (extension === 'xlsx' || extension === 'xls') {
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheets = workbook.Sheets;
    const rows: string[] = [];
    for (const sheetName of Object.keys(sheets)) {
      const sheet = sheets[sheetName];
      const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });
      rows.push(
        rawRows
          .map((row: any) => Object.values(row).filter((value) => value !== '').join(' | '))
          .filter(Boolean)
          .join('\n')
      );
    }
    return normalizeText(rows.join('\n'));
  }

  if (extension === 'pdf') {
    const data = await pdf(fileBuffer);
    return normalizeText(data.text || '');
  }

  if (extension === 'docx') {
    const result = await mammoth.extractRawText({ buffer: fileBuffer });
    return normalizeText(result.value || '');
  }

  return normalizeText(fileBuffer.toString('utf8'));
};
