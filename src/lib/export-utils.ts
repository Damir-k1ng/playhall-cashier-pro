import * as XLSX from 'xlsx';
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

export function exportToExcel(params: ExportParams) {
  const { shifts, totals, dateFrom, dateTo, cashierName } = params;
  
  // Create workbook
  const wb = XLSX.utils.book_new();
  
  // Summary sheet
  const summaryData = [
    ['Отчёт по сменам'],
    ['Период:', `${format(dateFrom, 'dd.MM.yyyy')} — ${format(dateTo, 'dd.MM.yyyy')}`],
    ['Кассир:', cashierName || 'Все кассиры'],
    [''],
    ['ИТОГО'],
    ['Общая выручка', formatCurrencyPlain(totals.revenue)],
    ['Наличные', formatCurrencyPlain(totals.cash)],
    ['Kaspi', formatCurrencyPlain(totals.kaspi)],
    ['Игры', formatCurrencyPlain(totals.games)],
    ['Джойстики', formatCurrencyPlain(totals.controllers)],
    ['Напитки', formatCurrencyPlain(totals.drinks)],
    ['Количество сессий', totals.sessions.toString()],
    ['Средний чек', formatCurrencyPlain(totals.avgCheck)],
  ];
  
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, summarySheet, 'Итого');
  
  // Shifts detail sheet
  const shiftsHeaders = [
    'Кассир',
    'Начало смены',
    'Конец смены',
    'Наличные',
    'Kaspi',
    'Выручка',
    'Игры',
    'Джойстики',
    'Напитки',
    'Сессий'
  ];
  
  const shiftsRows = shifts.map(shift => [
    shift.cashier_name,
    formatDatePlain(shift.started_at),
    shift.ended_at ? formatDatePlain(shift.ended_at) : 'Активна',
    shift.total_cash,
    shift.total_kaspi,
    shift.total_cash + shift.total_kaspi,
    shift.total_games,
    shift.total_controllers,
    shift.total_drinks,
    shift.sessions_count
  ]);
  
  const shiftsData = [shiftsHeaders, ...shiftsRows];
  const shiftsSheet = XLSX.utils.aoa_to_sheet(shiftsData);
  
  // Set column widths
  shiftsSheet['!cols'] = [
    { wch: 15 }, // Кассир
    { wch: 18 }, // Начало
    { wch: 18 }, // Конец
    { wch: 12 }, // Наличные
    { wch: 12 }, // Kaspi
    { wch: 12 }, // Выручка
    { wch: 12 }, // Игры
    { wch: 12 }, // Джойстики
    { wch: 12 }, // Напитки
    { wch: 8 },  // Сессий
  ];
  
  XLSX.utils.book_append_sheet(wb, shiftsSheet, 'Детализация');
  
  // Generate filename
  const filename = `shifts_report_${format(dateFrom, 'dd-MM-yyyy')}_${format(dateTo, 'dd-MM-yyyy')}.xlsx`;
  
  // Download
  XLSX.writeFile(wb, filename);
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
      ['Средний чек', formatCurrencyPlain(totals.avgCheck)],
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
    head: [['Кассир', 'Начало', 'Конец', 'Наличные', 'Kaspi', 'Итого', 'Сессий']],
    body: shifts.map(shift => [
      shift.cashier_name,
      format(new Date(shift.started_at), 'dd.MM HH:mm'),
      shift.ended_at ? format(new Date(shift.ended_at), 'dd.MM HH:mm') : 'Активна',
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
      0: { cellWidth: 25 },
      1: { cellWidth: 25 },
      2: { cellWidth: 25 },
      3: { cellWidth: 25 },
      4: { cellWidth: 25 },
      5: { cellWidth: 25 },
      6: { cellWidth: 15 }
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
