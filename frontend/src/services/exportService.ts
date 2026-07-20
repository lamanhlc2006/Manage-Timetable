import api from './api';
import { ScheduleEvent } from './scheduleService';
import jsPDF from 'jspdf';
import dayjs from 'dayjs';

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

export const downloadPdfReport = (schedules: ScheduleEvent[], docTitle: string = 'BAO CAO LICH TRINH'): void => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Title Header
  doc.setFontSize(18);
  doc.setTextColor(24, 144, 255); // #1890ff
  doc.text(docTitle, 14, 20);

  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Ngay xuat: ${dayjs().format('DD/MM/YYYY HH:mm')}`, 14, 27);
  doc.text(`Tong so su kien: ${schedules.length}`, 14, 32);

  doc.setLineWidth(0.5);
  doc.setDrawColor(220, 220, 220);
  doc.line(14, 36, 196, 36);

  let y = 44;

  schedules.forEach((item, index) => {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }

    doc.setFontSize(12);
    doc.setTextColor(30, 30, 30);
    const titleText = `${index + 1}. ${item.title}`;
    doc.text(titleText, 14, y);

    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    const timeRange = `${dayjs(item.startTime).format('HH:mm DD/MM/YYYY')} - ${dayjs(item.endTime).format('HH:mm DD/MM/YYYY')}`;
    doc.text(`Thoi gian: ${timeRange}`, 14, y + 5);

    const meta = `Danh muc: ${item.category || 'N/A'} | Uu tien: ${item.priority || 'medium'} ${item.tags && item.tags.length ? '| Tags: ' + item.tags.join(', ') : ''}`;
    doc.text(meta, 14, y + 10);

    if (item.description) {
      doc.setTextColor(80, 80, 80);
      doc.text(`Ghi chu: ${item.description.substring(0, 80)}`, 14, y + 15);
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
