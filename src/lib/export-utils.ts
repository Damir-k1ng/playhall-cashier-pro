import ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface ShiftExportData {
  cashier_name: string;
  started_at: string;
  ended_at: string | null;
  total_cash: number;
  total_kaspi: number;
  total_games: number;
  total_controllers: number;
  total_drinks: number;
  sessions_count: number;
  duration_hours: number;
}

interface TotalsExportData {
  revenue: number;
  cash: number;
  kaspi: number;
  games: number;
  controllers: number;
  drinks: number;
  sessions: number;
  avgCheck: number;
  shiftsCount: number;
  totalHours: number;
  revenuePerHour: number;
}

interface ExportParams {
  shifts: ShiftExportData[];
  totals: TotalsExportData;
  dateFrom: Date;
  dateTo: Date;
  cashierName?: string;
}

const formatCurrencyPlain = (value: number): string => {
  return new Intl.NumberFormat('ru-RU').format(value) + ' ₸';
};

const formatDatePlain = (dateStr: string): string => {
  return format(new Date(dateStr), 'dd.MM.yyyy HH:mm', { locale: ru });
};

export async function exportToExcel(params: ExportParams) {
  const { shifts, totals, dateFrom, dateTo, cashierName } = params;
  
  // Create workbook
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'PlayHall Cashier Pro';
  workbook.created = new Date();
  
  // Summary sheet
  const summarySheet = workbook.addWorksheet('Итого');
  
  // Add summary data
  summarySheet.addRow(['Отчёт по сменам']);
  summarySheet.addRow(['Период:', `${format(dateFrom, 'dd.MM.yyyy')} — ${format(dateTo, 'dd.MM.yyyy')}`]);
  summarySheet.addRow(['Кассир:', cashierName || 'Все кассиры']);
  summarySheet.addRow([]);
  summarySheet.addRow(['ИТОГО']);
  summarySheet.addRow(['Общая выручка', formatCurrencyPlain(totals.revenue)]);
  summarySheet.addRow(['Наличные', formatCurrencyPlain(totals.cash)]);
  summarySheet.addRow(['Kaspi', formatCurrencyPlain(totals.kaspi)]);
  summarySheet.addRow(['Игры', formatCurrencyPlain(totals.games)]);
  summarySheet.addRow(['Джойстики', formatCurrencyPlain(totals.controllers)]);
  summarySheet.addRow(['Напитки', formatCurrencyPlain(totals.drinks)]);
  summarySheet.addRow(['Количество сессий', totals.sessions.toString()]);
  summarySheet.addRow(['Количество смен', totals.shiftsCount.toString()]);
  summarySheet.addRow(['Часов работы', `${Math.round(totals.totalHours)}ч`]);
  summarySheet.addRow(['Средний чек', formatCurrencyPlain(totals.avgCheck)]);
  summarySheet.addRow(['Выручка в час', formatCurrencyPlain(totals.revenuePerHour)]);
  
  // Style title
  summarySheet.getCell('A1').font = { bold: true, size: 14 };
  summarySheet.getCell('A5').font = { bold: true };
  
  // Set column widths
  summarySheet.getColumn(1).width = 20;
  summarySheet.getColumn(2).width = 30;
  
  // Shifts detail sheet
  const shiftsSheet = workbook.addWorksheet('Детализация');
  
  // Add headers
  shiftsSheet.addRow([
    'Кассир',
    'Начало смены',
    'Конец смены',
    'Длительность',
    'Наличные',
    'Kaspi',
    'Выручка',
    'Игры',
    'Джойстики',
    'Напитки',
    'Сессий'
  ]);
  
  // Style header row
  shiftsSheet.getRow(1).font = { bold: true };
  shiftsSheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF008B8B' }
  };
  shiftsSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  
  // Add data rows
  shifts.forEach(shift => {
    shiftsSheet.addRow([
      shift.cashier_name,
      formatDatePlain(shift.started_at),
      shift.ended_at ? formatDatePlain(shift.ended_at) : 'Активна',
      `${shift.duration_hours}ч`,
      shift.total_cash,
      shift.total_kaspi,
      shift.total_cash + shift.total_kaspi,
      shift.total_games,
      shift.total_controllers,
      shift.total_drinks,
      shift.sessions_count
    ]);
  });
  
  // Set column widths
  shiftsSheet.getColumn(1).width = 15;
  shiftsSheet.getColumn(2).width = 18;
  shiftsSheet.getColumn(3).width = 18;
  shiftsSheet.getColumn(4).width = 12;
  shiftsSheet.getColumn(5).width = 12;
  shiftsSheet.getColumn(6).width = 12;
  shiftsSheet.getColumn(7).width = 12;
  shiftsSheet.getColumn(8).width = 12;
  shiftsSheet.getColumn(9).width = 12;
  shiftsSheet.getColumn(10).width = 12;
  shiftsSheet.getColumn(11).width = 10;
  
  // Generate filename
  const filename = `shifts_report_${format(dateFrom, 'dd-MM-yyyy')}_${format(dateTo, 'dd-MM-yyyy')}.xlsx`;
  
  // Download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function exportToPDF(params: ExportParams) {
  const { shifts, totals, dateFrom, dateTo, cashierName } = params;
  
  // Create PDF document
  const doc = new jsPDF();
  
  // Title
  doc.setFontSize(18);
  doc.text('Отчёт по сменам', 14, 20);
  
  // Period info
  doc.setFontSize(11);
  doc.setTextColor(100);
  doc.text(`Период: ${format(dateFrom, 'dd.MM.yyyy')} — ${format(dateTo, 'dd.MM.yyyy')}`, 14, 30);
  doc.text(`Кассир: ${cashierName || 'Все кассиры'}`, 14, 37);
  
  // Summary table
  doc.setFontSize(14);
  doc.setTextColor(0);
  doc.text('Сводка', 14, 50);
  
  autoTable(doc, {
    startY: 55,
    head: [['Показатель', 'Значение']],
    body: [
      ['Общая выручка', formatCurrencyPlain(totals.revenue)],
      ['Наличные', formatCurrencyPlain(totals.cash)],
      ['Kaspi', formatCurrencyPlain(totals.kaspi)],
      ['Игры', formatCurrencyPlain(totals.games)],
      ['Джойстики', formatCurrencyPlain(totals.controllers)],
      ['Напитки', formatCurrencyPlain(totals.drinks)],
      ['Количество сессий', totals.sessions.toString()],
      ['Количество смен', totals.shiftsCount.toString()],
      ['Часов работы', `${Math.round(totals.totalHours)}ч`],
      ['Средний чек', formatCurrencyPlain(totals.avgCheck)],
      ['Выручка в час', formatCurrencyPlain(totals.revenuePerHour)],
    ],
    theme: 'striped',
    headStyles: { fillColor: [0, 139, 139] },
    styles: { fontSize: 10 },
    margin: { left: 14, right: 14 }
  });
  
  // Get the final Y position after summary table
  const finalY = (doc as any).lastAutoTable.finalY || 130;
  
  // Shifts detail table
  doc.setFontSize(14);
  doc.text('Детализация по сменам', 14, finalY + 15);
  
  autoTable(doc, {
    startY: finalY + 20,
    head: [['Кассир', 'Начало', 'Конец', 'Часы', 'Наличные', 'Kaspi', 'Итого', 'Сессий']],
    body: shifts.map(shift => [
      shift.cashier_name,
      format(new Date(shift.started_at), 'dd.MM HH:mm'),
      shift.ended_at ? format(new Date(shift.ended_at), 'dd.MM HH:mm') : 'Активна',
      `${shift.duration_hours}ч`,
      formatCurrencyPlain(shift.total_cash),
      formatCurrencyPlain(shift.total_kaspi),
      formatCurrencyPlain(shift.total_cash + shift.total_kaspi),
      shift.sessions_count.toString()
    ]),
    theme: 'striped',
    headStyles: { fillColor: [0, 139, 139] },
    styles: { fontSize: 9 },
    margin: { left: 14, right: 14 },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 22 },
      2: { cellWidth: 22 },
      3: { cellWidth: 12 },
      4: { cellWidth: 22 },
      5: { cellWidth: 22 },
      6: { cellWidth: 22 },
      7: { cellWidth: 12 }
    }
  });
  
  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Сформировано: ${format(new Date(), 'dd.MM.yyyy HH:mm')} | Страница ${i} из ${pageCount}`,
      14,
      doc.internal.pageSize.height - 10
    );
  }
  
  // Generate filename
  const filename = `shifts_report_${format(dateFrom, 'dd-MM-yyyy')}_${format(dateTo, 'dd-MM-yyyy')}.pdf`;
  
  // Download
  doc.save(filename);
}
