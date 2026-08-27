import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { OrderItem } from '../models/order.model';

@Injectable({
  providedIn: 'root'
})
export class ExportService {

  // Export orders to Excel (.xlsx)
  exportToExcel(orders: OrderItem[], fileNamePrefix: string = 'EarthX_Orders') {
    if (!orders || orders.length === 0) {
      alert('No orders available to export.');
      return;
    }

    const exportData = orders.map((o, idx) => ({
      'Sr No': idx + 1,
      'Order ID': o.orderId,
      'Date': o.date,
      'Company Name': o.companyName,
      'Product Name': o.productName,
      'Quantity': o.qty,
      'Priority': o.priority,
      'Laser Print': o.laserPrint || '',
      'Process Status': o.orderStatus,
      'Packaging': o.box
    }));

    const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(exportData);
    
    // Auto-width columns
    const colWidths = [
      { wch: 8 },  // Sr No
      { wch: 14 }, // Order ID
      { wch: 14 }, // Date
      { wch: 28 }, // Company Name
      { wch: 28 }, // Product Name
      { wch: 10 }, // Quantity
      { wch: 12 }, // Priority
      { wch: 20 }, // Laser Print
      { wch: 20 }, // Process Status
      { wch: 16 }  // Packaging
    ];
    worksheet['!cols'] = colWidths;

    const workbook: XLSX.WorkBook = {
      Sheets: { 'Orders': worksheet },
      SheetNames: ['Orders']
    };

    const dateStr = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(workbook, `${fileNamePrefix}_${dateStr}.xlsx`);
  }

  // Export orders to PDF
  exportToPdf(orders: OrderItem[], title: string = 'Orders Report', fileNamePrefix: string = 'EarthX_Orders') {
    if (!orders || orders.length === 0) {
      alert('No orders available to export.');
      return;
    }

    const doc = new jsPDF('landscape', 'pt', 'a4');

    // Header banner styling
    doc.setFillColor(220, 38, 38); // EarthX Red
    doc.rect(0, 0, 842, 45, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(`EarthX Manufacturing — ${title}`, 40, 28);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const dateStr = new Date().toLocaleString();
    doc.text(`Generated: ${dateStr} | Total Records: ${orders.length}`, 580, 28);

    // Prepare table body
    const tableBody = orders.map((o, idx) => [
      (idx + 1).toString(),
      `#${o.orderId}`,
      o.date,
      o.companyName,
      o.productName,
      o.qty ? o.qty.toLocaleString() : '0',
      o.priority,
      o.laserPrint || '—',
      o.orderStatus,
      o.box
    ]);

    const totalQty = orders.reduce((sum, o) => sum + (Number(o.qty) || 0), 0);

    autoTable(doc, {
      startY: 55,
      head: [['Sr', 'Order ID', 'Date', 'Company Name', 'Product Name', 'Qty', 'Priority', 'Laser Print', 'Status', 'Box']],
      body: tableBody,
      foot: [['', '', '', 'Total Quantity', '', totalQty.toLocaleString(), '', '', '', '']],
      theme: 'grid',
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9
      },
      footStyles: {
        fillColor: [241, 245, 249],
        textColor: [220, 38, 38],
        fontStyle: 'bold',
        fontSize: 10
      },
      styles: {
        fontSize: 8.5,
        cellPadding: 4,
        overflow: 'linebreak'
      },
      columnStyles: {
        0: { cellWidth: 30, halign: 'center' },
        1: { cellWidth: 55, fontStyle: 'bold' },
        2: { cellWidth: 65 },
        3: { cellWidth: 150, textColor: [185, 28, 28], fontStyle: 'bold' },
        4: { cellWidth: 140 },
        5: { cellWidth: 45, halign: 'right', fontStyle: 'bold' },
        6: { cellWidth: 55, halign: 'center' },
        7: { cellWidth: 90 },
        8: { cellWidth: 80, halign: 'center' },
        9: { cellWidth: 60, halign: 'center' }
      },
      margin: { left: 30, right: 30 }
    });

    const fileDate = new Date().toISOString().slice(0, 10);
    doc.save(`${fileNamePrefix}_${fileDate}.pdf`);
  }
}
