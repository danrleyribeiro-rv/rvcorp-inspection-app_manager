// src/services/pdf-service.js
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

    // Simular processo
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          filename: `${reportCode}.pdf`,
          url: `#preview-${reportCode}`
        });
      }, 2000);
    });

  } catch (error) {
    throw new Error('Falha ao gerar o relatório PDF');
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