// src/services/pdf-service.js

import { generateReportDownloadUrl } from './report-service';

/**
 * Generate inspection PDF using HTML template and modern print API
 * @param {Object} inspection - Inspection data
 * @param {Object} options - Generation options
 * @returns {Promise<Object>} Result object with success status and URL/error
 */
export async function generateInspectionPDF(inspection, options = {}) {
  try {
    // Generate HTML report
    const htmlUrl = generateReportDownloadUrl(inspection, 'complete');
    
    // Open in new window for PDF generation
    const pdfWindow = window.open(htmlUrl, '_blank');
    
    if (!pdfWindow) {
      throw new Error('Pop-up bloqueado. Permita pop-ups para gerar PDF.');
    }
    
    // Return success - user can manually print to PDF
    return {
      success: true,
      url: htmlUrl,
      message: 'Relatório aberto em nova janela. Use Ctrl+P para imprimir/salvar como PDF.'
    };
    
  } catch (error) {
    console.error('Error generating inspection PDF:', error);
    return {
      success: false,
      error: error.message || 'Erro ao gerar relatório PDF'
    };
  }
}

/**
 * Generate non-conformities PDF using HTML template
 * @param {Object} inspection - Inspection data
 * @param {Object} options - Generation options
 * @returns {Promise<Object>} Result object with success status and URL/error
 */
export async function generateNonConformitiesPDF(inspection, options = {}) {
  try {
    // Generate HTML report for non-conformities only
    const htmlUrl = generateReportDownloadUrl(inspection, 'non_conformities');
    
    // Open in new window for PDF generation
    const pdfWindow = window.open(htmlUrl, '_blank');
    
    if (!pdfWindow) {
      throw new Error('Pop-up bloqueado. Permita pop-ups para gerar PDF.');
    }
    
    // Return success - user can manually print to PDF
    return {
      success: true,
      url: htmlUrl,
      message: 'Relatório de não conformidades aberto em nova janela. Use Ctrl+P para imprimir/salvar como PDF.'
    };
    
  } catch (error) {
    console.error('Error generating non-conformities PDF:', error);
    return {
      success: false,
      error: error.message || 'Erro ao gerar relatório PDF de não conformidades'
    };
  }
}

/**
 * Upload report to storage (placeholder for future implementation)
 * @param {Blob} pdfBlob - PDF blob data
 * @param {string} filename - File name
 * @returns {Promise<string>} Download URL
 */
export async function uploadReportToStorage(pdfBlob, filename) {
  // This would typically upload to Firebase Storage or similar
  // For now, we'll create a local blob URL
  return URL.createObjectURL(pdfBlob);
}

/**
 * Preview PDF in browser
 * @param {Object} inspection - Inspection data
 * @param {string} type - Report type ('complete' or 'non_conformities')
 * @returns {Promise<Object>} Result object
 */
export async function previewPDF(inspection, type = 'complete') {
  try {
    const htmlUrl = generateReportDownloadUrl(inspection, type);
    window.open(htmlUrl, '_blank');
    
    return {
      success: true,
      message: 'Preview aberto em nova janela'
    };
  } catch (error) {
    console.error('Error previewing PDF:', error);
    return {
      success: false,
      error: error.message || 'Erro ao visualizar preview'
    };
  }
}