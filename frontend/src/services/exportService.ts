import api from './api';
import { ScheduleEvent } from './scheduleService';
import jsPDF from 'jspdf';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';

const isOffline = (): boolean => {
  return localStorage.getItem('offlineMode') === 'true';
};

export const downloadIcsFile = async (): Promise<void> => {
  if (isOffline()) {
    const rawData = localStorage.getItem('schedules_data');
    const schedules: ScheduleEvent[] = rawData ? JSON.parse(rawData) : [];
    
    let icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Timetable Management//VN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
    ];

    schedules.forEach((s) => {
      const startStr = dayjs(s.startTime).format('YYYYMMDDTHHmmss[Z]');
      const endStr = dayjs(s.endTime).format('YYYYMMDDTHHmmss[Z]');
      icsContent.push('BEGIN:VEVENT');
      icsContent.push(`UID:${s._id}`);
      icsContent.push(`DTSTART:${startStr}`);
      icsContent.push(`DTEND:${endStr}`);
      icsContent.push(`SUMMARY:${s.title}`);
      icsContent.push(`DESCRIPTION:${s.description || ''} (Danh mục: ${s.category || 'N/A'})`);
      icsContent.push(`LOCATION:${s.category || ''}`);
      icsContent.push('END:VEVENT');
    });

    icsContent.push('END:VCALENDAR');

    const blob = new Blob([icsContent.join('\n')], { type: 'text/calendar;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'timetable.ics');
    document.body.appendChild(link);
    link.click();
    link.remove();
    return;
  }

  const response = await api.get('/schedules/export/ics', { responseType: 'blob' });
  const url = window.URL.createObjectURL(new Blob([response.data], { type: 'text/calendar' }));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', 'timetable.ics');
  document.body.appendChild(link);
  link.click();
  link.remove();
};

/**
 * Loads a font file from the given URL and returns its Base64 string.
 */
const loadFontAsBase64 = async (url: string): Promise<string> => {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

// Cache loaded fonts to avoid re-fetching
let fontCache: { regular?: string; bold?: string } = {};

const ensureFontsLoaded = async (): Promise<{ regular: string; bold: string }> => {
  if (fontCache.regular && fontCache.bold) {
    return fontCache as { regular: string; bold: string };
  }
  const [regular, bold] = await Promise.all([
    loadFontAsBase64('/fonts/Roboto-Regular.ttf'),
    loadFontAsBase64('/fonts/Roboto-Bold.ttf'),
  ]);
  fontCache = { regular, bold };
  return { regular, bold };
};

const registerFonts = (doc: jsPDF, fonts: { regular: string; bold: string }) => {
  doc.addFileToVFS('Roboto-Regular.ttf', fonts.regular);
  doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
  doc.addFileToVFS('Roboto-Bold.ttf', fonts.bold);
  doc.addFont('Roboto-Bold.ttf', 'Roboto', 'bold');
};

export const downloadPdfReport = async (schedules: ScheduleEvent[], docTitle: string = 'BÁO CÁO LỊCH TRÌNH CÁ NHÂN'): Promise<void> => {
  // Load Vietnamese-compatible fonts
  const fonts = await ensureFontsLoaded();

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Register Roboto fonts for Vietnamese Unicode support
  registerFonts(doc, fonts);

  // Title Header
  doc.setFont('Roboto', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(24, 144, 255); // #1890ff
  doc.text(docTitle, 14, 20);

  doc.setFont('Roboto', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Ngày xuất: ${dayjs().format('DD/MM/YYYY HH:mm')}`, 14, 27);
  doc.text(`Tổng số sự kiện: ${schedules.length}`, 14, 32);

  doc.setLineWidth(0.5);
  doc.setDrawColor(220, 220, 220);
  doc.line(14, 36, 196, 36);

  let y = 44;

  const priorityMap: Record<string, string> = {
    high: 'Cao',
    medium: 'Trung bình',
    low: 'Thấp',
  };

  schedules.forEach((item, index) => {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }

    doc.setFont('Roboto', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(30, 30, 30);
    const titleText = `${index + 1}. ${item.title}`;
    doc.text(titleText, 14, y);

    doc.setFont('Roboto', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    const timeRange = `${dayjs(item.startTime).format('HH:mm DD/MM/YYYY')} - ${dayjs(item.endTime).format('HH:mm DD/MM/YYYY')}`;
    doc.text(`Thời gian: ${timeRange}`, 14, y + 5);

    const priorityText = priorityMap[item.priority || 'medium'] || 'Trung bình';
    const meta = `Danh mục: ${item.category || 'N/A'} | Ưu tiên: ${priorityText} ${item.tags && item.tags.length ? '| Tags: ' + item.tags.join(', ') : ''}`;
    doc.text(meta, 14, y + 10);

    if (item.description) {
      doc.setTextColor(80, 80, 80);
      doc.text(`Ghi chú: ${item.description.substring(0, 80)}`, 14, y + 15);
      y += 22;
    } else {
      y += 17;
    }

    doc.setLineWidth(0.2);
    doc.setDrawColor(240, 240, 240);
    doc.line(14, y - 2, 196, y - 2);
  });

  doc.save('timetable-report.pdf');
};

const mapSchedulesToExportRows = (schedules: ScheduleEvent[]) => {
  return schedules.map((item, index) => ({
    'STT': index + 1,
    'Tiêu đề': item.title,
    'Ghi chú': item.description || '',
    'Bắt đầu': dayjs(item.startTime).format('HH:mm DD/MM/YYYY'),
    'Kết thúc': dayjs(item.endTime).format('HH:mm DD/MM/YYYY'),
    'Danh mục': item.category || 'N/A',
    'Độ ưu tiên': item.priority === 'high' ? 'Cao' : item.priority === 'low' ? 'Thấp' : 'Trung bình',
    'Thẻ': (item.tags || []).join(', '),
    'Người tạo': item.createdBy?.username || 'N/A',
  }));
};

export const downloadExcelReport = (schedules: ScheduleEvent[], filename: string = 'timetable-export.xlsx'): void => {
  const rows = mapSchedulesToExportRows(schedules);
  const worksheet = XLSX.utils.json_to_sheet(rows);

  // Set column widths for clean readability
  worksheet['!cols'] = [
    { wch: 6 },  // STT
    { wch: 30 }, // Tiêu đề
    { wch: 40 }, // Ghi chú
    { wch: 20 }, // Bắt đầu
    { wch: 20 }, // Kết thúc
    { wch: 15 }, // Danh mục
    { wch: 12 }, // Độ ưu tiên
    { wch: 20 }, // Thẻ
    { wch: 15 }, // Người tạo
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Lịch trình');
  XLSX.writeFile(workbook, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`);
};

export const downloadCsvReport = (schedules: ScheduleEvent[], filename: string = 'timetable-export.csv'): void => {
  const rows = mapSchedulesToExportRows(schedules);
  const csvText = Papa.unparse(rows);

  // Prepend UTF-8 BOM for proper Vietnamese character encoding in Microsoft Excel
  const blob = new Blob(['\uFEFF' + csvText], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  link.remove();
};
