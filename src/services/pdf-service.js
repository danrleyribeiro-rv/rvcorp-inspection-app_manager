// src/services/pdf-service.js
import { generateReportHtml } from "@/lib/generateReport";

export const generateInspectionPDF = async (inspectionData, options = {}) => {
  const {
    isPreview = false,
    releaseInfo = null,
    inspectionCode = null,
    releaseIndex = 0
  } = options;

  try {
    // Gerar código do relatório
    const reportCode = releaseInfo 
      ? `RLT${(releaseIndex + 1).toString().padStart(2, '0')}-${inspectionCode}`
      : `PREVIEW-${inspectionCode || 'TEMP'}`;

    // Gerando PDF com código: ${reportCode}
    const htmlContent = generateReportHtml(inspectionData);

    // For now, we return the HTML content directly or simulate a download.
    // console.log("Generated HTML Content:", htmlContent);
    // console.log("Generated URL:", URL.createObjectURL(new Blob([htmlContent], { type: 'text/html' })));
    return {
      success: true,
      filename: `${reportCode}.html`,
      content: htmlContent, // Return the HTML content
      url: URL.createObjectURL(new Blob([htmlContent], { type: 'text/html' })) // Create a blob URL for preview/download
    };

  } catch (error) {
    console.error("Error generating PDF:", error);
    throw new Error(`Falha ao gerar o relatório PDF: ${error.message || error}`);
  }
};

export const downloadPDF = (url, filename) => {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};