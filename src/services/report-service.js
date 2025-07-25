// src/services/report-service.js

/**
 * Generate HTML report download URL using template
 * @param {Object} inspection - Inspection data
 * @param {string} type - Report type: 'complete' or 'non_conformities'
 * @returns {string} Blob URL for download
 */
export function generateReportDownloadUrl(inspection, type = 'complete') {
  try {
    let htmlContent;
    
    if (type === 'complete') {
      htmlContent = generateCompleteReport(inspection);
    } else if (type === 'non_conformities') {
      htmlContent = generateNonConformitiesReport(inspection);
    } else {
      throw new Error('Invalid report type');
    }
    
    const blob = new Blob([htmlContent], { type: 'text/html' });
    return URL.createObjectURL(blob);
  } catch (error) {
    console.error('Error generating report:', error);
    throw error;
  }
}

/**
 * Generate complete inspection report
 * @param {Object} inspection - Inspection data
 * @returns {string} HTML content
 */
function generateCompleteReport(inspection) {
  const template = getReportTemplate(inspection);
  
  const nonConformities = getAllNonConformities(inspection);

  const inspectionData = {
    title: inspection.title || 'Vistoria sem título',
    cod: inspection.cod || 'SEM-CÓDIGO',
    createdAt: formatDate(inspection.created_at),
    area: inspection.area || 'N/A',
    observation: inspection.observation || 'Nenhuma observação adicional registrada para esta unidade.',
    address: inspection.address_string || 'Endereço não informado',
    inspector: inspection.inspectors?.name || 'Não atribuído',
    project: inspection.projects?.title || 'Projeto não informado',
    topicsCount: inspection.topics?.length || 0,
    itemsCount: getTotalItemsCount(inspection),
    detailsCount: getTotalDetailsCount(inspection),
    nonConformitiesCount: nonConformities.length,
    detailedContent: generateDetailedInspectionContent(inspection)
  };
  
  const totalPages = (inspection.topics?.length || 0) + 1;
  
  let html = template
    .replace(/{{INSPECTION_TITLE}}/g, inspectionData.title)
    .replace(/{{INSPECTION_CODE}}/g, inspectionData.cod)
    .replace(/{{INSPECTION_DATE}}/g, inspectionData.createdAt)
    .replace(/{{INSPECTION_AREA}}/g, inspectionData.area)
    .replace(/{{INSPECTION_ADDRESS}}/g, inspectionData.address)
    .replace(/{{INSPECTOR_NAME}}/g, inspectionData.inspector)
    .replace(/{{PROJECT_TITLE}}/g, inspectionData.project)
    .replace(/{{TOPICS_COUNT}}/g, inspectionData.topicsCount)
    .replace(/{{ITEMS_COUNT}}/g, inspectionData.itemsCount)
    .replace(/{{DETAILS_COUNT}}/g, inspectionData.detailsCount)
    .replace(/{{NON_CONFORMITIES_COUNT}}/g, inspectionData.nonConformitiesCount)
    .replace(/{{GENERAL_OBSERVATION}}/g, inspectionData.observation)
    .replace(/{{DETAILED_CONTENT}}/g, inspectionData.detailedContent)
    .replace(/{{TOTAL_PAGES}}/g, totalPages);
  
  return html;
}

/**
 * Generate non-conformities only report
 * @param {Object} inspection - Inspection data
 * @returns {string} HTML content
 */
function generateNonConformitiesReport(inspection) {
  const template = getReportTemplate(inspection);
  
  const nonConformities = getAllNonConformities(inspection);
  const ncContent = generateNonConformitiesContent(inspection, nonConformities);
  
  const inspectionData = {
    title: `${inspection.title || 'Vistoria sem título'} - Relatório de Não Conformidades`,
    cod: inspection.cod || 'SEM-CÓDIGO',
    createdAt: formatDate(inspection.created_at),
    area: inspection.area || 'N/A',
    observation: `Este relatório contém apenas as não conformidades encontradas durante a vistoria. Total de não conformidades: ${nonConformities.length}`,
    address: inspection.address_string || 'Endereço não informado',
    inspector: inspection.inspectors?.name || 'Não atribuído',
    project: inspection.projects?.title || 'Projeto não informado',
    topicsCount: 0,
    itemsCount: 0,
    detailsCount: 0,
    nonConformitiesCount: nonConformities.length,
    detailedContent: ncContent
  };
  
  const totalPages = 2;
  
  let html = template
    .replace(/{{INSPECTION_TITLE}}/g, inspectionData.title)
    .replace(/{{INSPECTION_CODE}}/g, inspectionData.cod)
    .replace(/{{INSPECTION_DATE}}/g, inspectionData.createdAt)
    .replace(/{{INSPECTION_AREA}}/g, inspectionData.area)
    .replace(/{{INSPECTION_ADDRESS}}/g, inspectionData.address)
    .replace(/{{INSPECTOR_NAME}}/g, inspectionData.inspector)
    .replace(/{{PROJECT_TITLE}}/g, inspectionData.project)
    .replace(/{{TOPICS_COUNT}}/g, inspectionData.topicsCount)
    .replace(/{{ITEMS_COUNT}}/g, inspectionData.itemsCount)
    .replace(/{{DETAILS_COUNT}}/g, inspectionData.detailsCount)
    .replace(/{{NON_CONFORMITIES_COUNT}}/g, inspectionData.nonConformitiesCount)
    .replace(/{{GENERAL_OBSERVATION}}/g, inspectionData.observation)
    .replace(/{{DETAILED_CONTENT}}/g, inspectionData.detailedContent)
    .replace(/{{TOTAL_PAGES}}/g, totalPages);
  
  return html;
}

/**
 * Get the report template HTML
 * @param {Object} inspection - Inspection data
 * @returns {string} Template HTML
 */
function getReportTemplate(inspection) {
    const logoSvg = `<svg viewBox="0 0 195 53" fill="none" xmlns="http://www.w3.org/2000/svg" class="h-full w-auto"><path d="M0 0H14.98V38.45H37.4V51.18H0V0Z" fill="currentColor"/><path d="M55.75 10.23V51.18H41.58V10.23H55.75Z" fill="currentColor"/><path d="M175.24 40.8C170.13 40.58 167.37 38.79 165.95 36.18L191.31 27.1C190.36 20.64 187.46 8.50999 171.2 8.50999C162.7 8.50999 152.72 12.29 149.81 23.99C149.19 26.47 148.8 30.08 147.29 32.14C144.17 36.43 138.23 40.33 131.4 40.33C122.79 40.33 120.72 35.13 120.72 29.43C120.72 24.17 123.36 20.5 128.24 20.5C134.84 20.5 136.01 28.09 136.01 28.12L146.61 22.52C146.61 22.52 144.67 8.48999 127.36 8.48999C119.1 8.48999 105.17 13.1 105.17 30.16C105.17 45.2 115.67 51.97 129.54 51.97C143.4 51.97 150.05 44.08 151.62 41.89C155.57 49.08 163.64 52.42 173.37 52.42C181.87 52.42 190.63 48.71 194.53 45.14L189.45 35.34C187.32 38.61 180.65 41.01 175.24 40.78V40.8ZM179.46 23.29L163.6 28.88C162.9 24.54 163.58 20.54 167.57 18.69C174.28 15.57 178.15 20.68 179.46 23.29Z" fill="currentColor"/><path d="M89.26 9.94999C81.78 9.48999 77.39 12.7 74.83 15.55L73.6 10.21H60.62V51.17H74.98V30.33C74.98 29.07 75.01 21.98 81.85 21.98C89.54 21.98 89.45 30.35 89.45 38.9V51.17H103.35V35.12C103.35 17.73 97.85 10.48 89.27 9.94999H89.26Z" fill="currentColor"/></svg>`;

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>{{INSPECTION_TITLE}}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    :root {
        --font-heading: 'Bricolage Grotesque', sans-serif;
        --font-body: 'Inter', sans-serif;
        --brand-color: #312456;
        --text-primary: #1f2937;
        --text-secondary: #4b5563;
        --border-color: #e5e7eb;
        --page-margin: 15mm;
    }

    * {
        box-sizing: border-box;
    }

    body {
        font-family: var(--font-body);
        background-color: #f9fafb;
        margin: 0;
        padding: 0;
        line-height: 1.5;
    }

    h1, h2, h3, h4, h5, h6 {
        font-family: var(--font-heading);
        font-weight: 700;
        color: var(--text-primary);
        margin: 0;
    }

    .severity-baixa { background-color: #fef3c7; color: #92400e; }
    .severity-media { background-color: #ffedd5; color: #9a3412; }
    .severity-alta { background-color: #fee2e2; color: #991b1b; }
    .severity-critica { background-color: #e0e7ff; color: #3730a3; }
    .severity-resolvida { background-color: #d1fae5; color: #065f46; }

    /* Screen styles */
    @media screen {
      .print-container {
        margin: 2rem auto;
        max-width: 210mm;
        background: #f9fafb;
        padding: 1rem;
      }
      .print-page {
        margin-bottom: 2rem;
        box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1);
        border-radius: 8px;
        overflow: hidden;
      }
    }

    /* Print styles - THE MOST IMPORTANT */
    @media print {
      @page {
        size: A4;
        margin: 20mm 15mm 20mm 15mm;
      }

      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
        background: white !important;
        font-size: 9pt;
        line-height: 1.4;
        color: #000;
        margin: 0;
        padding: 0;
      }

      .print-container {
        margin: 0;
        padding: 0;
        max-width: none;
        background: white;
      }

      .print-page {
        width: 100%;
        min-height: calc(297mm - 40mm);
        background: white !important;
        page-break-after: always;
        margin: 0;
        padding: 0;
        box-shadow: none;
        border-radius: 0;
        position: relative;
        display: flex;
        flex-direction: column;
      }

      .print-page:last-child {
        page-break-after: auto;
      }

      /* Cover page styling */
      .cover-page {
        padding: 0;
      }

      .cover-page .page-header {
        background-color: var(--brand-color) !important;
        color: white !important;
        margin: -20mm -15mm 20mm -15mm;
        padding: 8mm 15mm;
        width: calc(100% + 30mm);
        display: flex;
        align-items: center;
        justify-content: space-between;
      }

      /* Content pages get no header */
      .content-page {
        padding: 0;
      }

      .content-page .page-header {
        display: none !important;
      }

      /* All pages get footer */
      .page-footer {
        background-color: var(--brand-color) !important;
        color: white !important;
        margin: 20mm -15mm -20mm -15mm;
        padding: 5mm 15mm;
        width: calc(100% + 30mm);
        margin-top: auto;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }

      .page-main {
        flex-grow: 1;
        padding: 0;
      }
    }
    
    /* Common page styles */
    .print-page {
        background-color: white;
        position: relative;
        display: flex;
        flex-direction: column;
        min-height: 100vh;
    }
    
    .page-header {
        color: white;
        background-color: var(--brand-color);
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-size: 13px;
        padding: 12px 20px;
    }

    .page-footer {
        color: white;
        background-color: var(--brand-color);
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-size: 11px;
        padding: 8px 20px;
    }
    
    .page-header .logo-container {
        height: 8mm;
        flex-shrink: 0;
    }
    
    .page-footer .logo-container {
        height: 6mm;
        flex-shrink: 0;
    }
    
    .page-header .logo-container svg,
    .page-footer .logo-container svg {
        height: 100%;
        width: auto;
        color: white;
    }
    
    /* Detail text styling */
    .detail-text, .detail-value, .detail-observation {
        font-weight: 400;
        font-family: var(--font-body);
    }
    
    .page-main {
        flex-grow: 1;
        padding: 20px;
    }
    
    @media print {
      .page-main {
        padding: 10px 0;
        flex-grow: 1;
      }
    }
    
    /* Cover page grid */
    .cover-grid {
        display: grid;
        grid-template-columns: 2fr 1fr;
        gap: 20px;
        height: 100%;
        align-items: start;
    }
    
    .cover-details {
        display: flex;
        flex-direction: column;
        gap: 20px;
    }
    
    .cover-section {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 16px;
    }
    
    .cover-section h2 {
        font-size: 18px;
        margin-bottom: 12px;
        color: var(--brand-color);
        border-bottom: 2px solid var(--brand-color);
        padding-bottom: 6px;
    }
    
    .info-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 12px;
    }
    
    .info-grid.single {
        grid-template-columns: 1fr;
    }
    
    .info-item {
        display: flex;
        flex-direction: column;
        gap: 2px;
    }
    
    .info-label {
        font-size: 11px;
        font-weight: 600;
        color: #64748b;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }
    
    .info-value {
        font-size: 13px;
        font-weight: 500;
        color: #1e293b;
    }
    
    .cover-map-container {
        border: 2px solid var(--brand-color);
        border-radius: 12px;
        overflow: hidden;
        aspect-ratio: 1;
        background: #f1f5f9;
    }
    
    .cover-map-container img {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }
    
    .map-fallback {
        display: flex;
        align-items: center;
        justify-content: center;
        text-align: center;
        font-size: 14px;
        color: #64748b;
        flex-direction: column;
        height: 100%;
        gap: 8px;
    }

    /* Content page styles */
    .content-section {
        margin-bottom: 24px;
    }

    .topic-header {
        background: linear-gradient(135deg, var(--brand-color), #4c1d95);
        color: white;
        padding: 12px 16px;
        border-radius: 8px 8px 0 0;
        margin-bottom: 0;
    }

    .topic-content {
        border: 1px solid #e2e8f0;
        border-top: none;
        border-radius: 0 0 8px 8px;
        padding: 16px;
        background: white;
    }

    .item-container {
        border-left: 4px solid var(--brand-color);
        margin: 16px 0;
        padding-left: 16px;
        background: #f8fafc;
        border-radius: 0 8px 8px 0;
        padding-top: 12px;
        padding-bottom: 12px;
        padding-right: 12px;
    }

    .detail-container {
        margin: 12px 0 12px 20px;
        padding: 10px;
        background: white;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        border-left: 3px solid #64748b;
    }

    .media-grid {
        display: grid;
        gap: 8px;
        margin-top: 12px;
    }

    .media-grid.grid-3 { grid-template-columns: repeat(3, 1fr); }
    .media-grid.grid-4 { grid-template-columns: repeat(4, 1fr); }
    .media-grid.grid-5 { grid-template-columns: repeat(5, 1fr); }

    .media-item {
        aspect-ratio: 1;
        border-radius: 6px;
        overflow: hidden;
        border: 1px solid #e2e8f0;
        background: #f1f5f9;
    }

    .media-item img, .media-item video {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }

    .nc-container {
        background: #fef2f2;
        border: 1px solid #fecaca;
        border-radius: 8px;
        padding: 12px;
        margin: 12px 0;
    }

    .nc-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 8px;
    }

    .nc-badges {
        display: flex;
        gap: 6px;
        flex-shrink: 0;
    }

    .badge {
        padding: 2px 8px;
        border-radius: 12px;
        font-size: 10px;
        font-weight: 600;
        text-transform: uppercase;
    }

    @media print {
      .cover-grid {
        height: auto;
        min-height: calc(100vh - 180px);
      }
      
      .media-grid.grid-3 { grid-template-columns: repeat(2, 1fr); }
      .media-grid.grid-4 { grid-template-columns: repeat(3, 1fr); }
      .media-grid.grid-5 { grid-template-columns: repeat(3, 1fr); }
      
      /* Ensure content doesn't overflow into margins */
      .content-section {
        margin-bottom: 16px;
      }
      
      .topic-header, .topic-content {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="print-container">
    <!-- Cover Page -->
    <div class="print-page cover-page">
      <header class="page-header">
        <div class="logo-container">
          ${logoSvg}
        </div>
        <div style="text-align: right;">
          <h1 style="font-size: 16px; margin: 0; font-weight: bold;">{{INSPECTION_TITLE}}</h1>
          <p style="font-size: 13px; margin: 4px 0 0 0; opacity: 0.9;">Código: {{INSPECTION_CODE}}</p>
        </div>
      </header>
      
      <main class="page-main">
        <div class="cover-grid">
          <div class="cover-details">
            <div class="cover-section">
              <h2>Informações da Inspeção</h2>
              <div class="info-grid">
                <div class="info-item">
                  <span class="info-label">Projeto</span>
                  <span class="info-value">{{PROJECT_TITLE}}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Data da Inspeção</span>
                  <span class="info-value">{{INSPECTION_DATE}}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Inspetor Responsável</span>
                  <span class="info-value">{{INSPECTOR_NAME}}</span>
                </div>
                ${inspection.area && parseFloat(inspection.area) > 0 ? `<div class="info-item"><span class="info-label">Área Total</span><span class="info-value">{{INSPECTION_AREA}} m²</span></div>` : ''}
              </div>
              <div class="info-grid single" style="margin-top: 12px;">
                <div class="info-item">
                  <span class="info-label">Endereço da Propriedade</span>
                  <span class="info-value">{{INSPECTION_ADDRESS}}</span>
                </div>
              </div>
            </div>
            
            <div class="cover-section">
              <h2>Resumo Executivo</h2>
              <div class="info-grid">
                <div class="info-item">
                  <span class="info-label">Total de Tópicos</span>
                  <span class="info-value">{{TOPICS_COUNT}} tópicos avaliados</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Total de Itens</span>
                  <span class="info-value">{{ITEMS_COUNT}} itens verificados</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Pontos de Verificação</span>
                  <span class="info-value">{{DETAILS_COUNT}} detalhes analisados</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Não Conformidades</span>
                  <span class="info-value" style="color: {{NON_CONFORMITIES_COUNT}} > 0 ? '#dc2626' : '#059669';">{{NON_CONFORMITIES_COUNT}} identificadas</span>
                </div>
              </div>
            </div>
            
            <div class="cover-section">
              <h2>Observações Gerais</h2>
              <div style="font-size: 12px; line-height: 1.6; color: #475569;">
                {{GENERAL_OBSERVATION}}
              </div>
            </div>
          </div>
          
          <div class="cover-map-container">
            <img 
              src="https://maps.googleapis.com/maps/api/staticmap?center={{INSPECTION_ADDRESS}}&zoom=15&size=500x500&maptype=roadmap&markers=color:red%7C{{INSPECTION_ADDRESS}}&key=AIzaSyAKinxQeDtM7Ri_q71aQ6AF85sIYX0b_b4"
              alt="Localização da Inspeção"
              onerror="this.outerHTML='&lt;div class=&quot;map-fallback&quot;&gt;&lt;div style=&quot;font-size: 24px; margin-bottom: 8px;&quot;&gt;📍&lt;/div&gt;&lt;div style=&quot;font-weight: 600; margin-bottom: 4px;&quot;&gt;Localização&lt;/div&gt;&lt;div style=&quot;font-size: 12px; text-align: center; padding: 0 12px;&quot;&gt;{{INSPECTION_ADDRESS}}&lt;/div&gt;&lt;/div&gt;'"
            />
          </div>
        </div>
      </main>
      
      <footer class="page-footer">
        <div class="logo-container">
          ${logoSvg}
        </div>
        <span>Página 1 de {{TOTAL_PAGES}}</span>
      </footer>
    </div>
    
    <!-- Detailed Content Pages -->
    {{DETAILED_CONTENT}}
  </div>
</body>
</html>`;
}

/**
 * Generate detailed inspection content with topics, items, details and their media
 * @param {Object} inspection - Inspection data
 * @returns {string} HTML content
 */
function generateDetailedInspectionContent(inspection) {
  if (!inspection.topics || inspection.topics.length === 0) {
    return '';
  }
  
  const logoSvg = `<svg viewBox="0 0 195 53" fill="none" xmlns="http://www.w3.org/2000/svg" class="h-full w-auto"><path d="M0 0H14.98V38.45H37.4V51.18H0V0Z" fill="currentColor"/><path d="M55.75 10.23V51.18H41.58V10.23H55.75Z" fill="currentColor"/><path d="M175.24 40.8C170.13 40.58 167.37 38.79 165.95 36.18L191.31 27.1C190.36 20.64 187.46 8.50999 171.2 8.50999C162.7 8.50999 152.72 12.29 149.81 23.99C149.19 26.47 148.8 30.08 147.29 32.14C144.17 36.43 138.23 40.33 131.4 40.33C122.79 40.33 120.72 35.13 120.72 29.43C120.72 24.17 123.36 20.5 128.24 20.5C134.84 20.5 136.01 28.09 136.01 28.12L146.61 22.52C146.61 22.52 144.67 8.48999 127.36 8.48999C119.1 8.48999 105.17 13.1 105.17 30.16C105.17 45.2 115.67 51.97 129.54 51.97C143.4 51.97 150.05 44.08 151.62 41.89C155.57 49.08 163.64 52.42 173.37 52.42C181.87 52.42 190.63 48.71 194.53 45.14L189.45 35.34C187.32 38.61 180.65 41.01 175.24 40.78V40.8ZM179.46 23.29L163.6 28.88C162.9 24.54 163.58 20.54 167.57 18.69C174.28 15.57 178.15 20.68 179.46 23.29Z" fill="currentColor"/><path d="M89.26 9.94999C81.78 9.48999 77.39 12.7 74.83 15.55L73.6 10.21H60.62V51.17H74.98V30.33C74.98 29.07 75.01 21.98 81.85 21.98C89.54 21.98 89.45 30.35 89.45 38.9V51.17H103.35V35.12C103.35 17.73 97.85 10.48 89.27 9.94999H89.26Z" fill="currentColor"/></svg>`;
  let html = '';
  const totalPages = (inspection.topics?.length || 0) + 1;
  
  inspection.topics.forEach((topic, topicIndex) => {
    const currentPage = topicIndex + 2;
    
    html += `
      <div class="print-page content-page">
        <main class="page-main">
          <div class="content-section">
            <div class="topic-header">
              <h2 style="font-size: 20px; margin: 0; font-family: var(--font-heading);">${topic.name || `Tópico ${topicIndex + 1}`}</h2>
              ${topic.description ? `<p style="font-size: 13px; margin: 6px 0 0 0; opacity: 0.9; font-weight: 400;">${topic.description}</p>` : ''}
            </div>
            
            <div class="topic-content">
              ${topic.observation ? `
                <div style="background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 6px; padding: 12px; margin-bottom: 16px;">
                  <h4 style="font-size: 12px; font-weight: 600; color: var(--brand-color); margin: 0 0 6px 0; text-transform: uppercase;">Observações do Tópico</h4>
                  <p style="font-size: 13px; color: #475569; margin: 0; line-height: 1.5;">${topic.observation}</p>
                </div>
              ` : ''}
              
              ${generateTopicMedia(topic)}
              ${generateTopicNonConformities(topic.non_conformities)}
              ${generateTopicItems(topic.items)}
            </div>
          </div>
        </main>
        
        <footer class="page-footer">
          <div style="display: flex; align-items: center; gap: 8px;">
            <div class="logo-container">${logoSvg}</div>
            <span style="font-weight: 500;">${inspection.cod || 'SEM-CÓDIGO'}</span>
          </div>
          <span>Página ${currentPage} de ${totalPages}</span>
        </footer>
      </div>
    `;
  });
  
  return html;
}

/**
 * Generate media section for topic
 * @param {Object} topic - Topic data
 * @returns {string} HTML content
 */
function generateTopicMedia(topic) {
  if (!topic.media || topic.media.length === 0) return '';
  return `
    <div style="margin-bottom: 16px;">
      <div class="media-grid grid-3">
        ${topic.media.map(media => generateMediaElement(media, "Evidência do tópico")).join('')}
      </div>
    </div>
  `;
}

/**
 * Generate items content for topic
 * @param {Array} items - Items array
 * @returns {string} HTML content
 */
function generateTopicItems(items) {
  if (!items || items.length === 0) return '';
  let html = '';
  items.forEach((item, itemIndex) => {
    html += `
      <div class="item-container">
        <h3 style="font-size: 16px; font-weight: 700; color: var(--brand-color); margin: 0 0 8px 0; font-family: var(--font-heading);">
          ${item.name || `Item ${itemIndex + 1}`}
        </h3>
        ${item.description ? `<p style="font-size: 13px; color: #64748b; margin: 0 0 12px 0; line-height: 1.5; font-weight: 400;">${item.description}</p>` : ''}
        ${item.observation ? `
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; padding: 10px; margin-bottom: 12px;">
            <h5 style="font-size: 11px; font-weight: 600; color: #475569; margin: 0 0 4px 0; text-transform: uppercase;">Observações do Item</h5>
            <p style="font-size: 12px; color: #64748b; margin: 0; line-height: 1.4;">${item.observation}</p>
          </div>
        ` : ''}
        
        ${generateItemMedia(item)}
        ${generateItemNonConformities(item.non_conformities)}
        ${generateItemDetails(item.details)}
      </div>
    `;
  });
  return html;
}

/**
 * Generate media section for item
 * @param {Object} item - Item data
 * @returns {string} HTML content
 */
function generateItemMedia(item) {
  if (!item.media || item.media.length === 0) return '';
  return `
    <div style="margin-bottom: 12px;">
      <h5 style="font-size: 12px; font-weight: 600; color: #475569; margin: 0 0 6px 0; text-transform: uppercase;">Registros Fotográficos do Item</h5>
      <div class="media-grid grid-4">
        ${item.media.map(media => generateMediaElement(media, "Registro do item")).join('')}
      </div>
    </div>
  `;
}

/**
 * Generate details content for item
 * @param {Array} details - Details array
 * @returns {string} HTML content
 */
function generateItemDetails(details) {
  if (!details || details.length === 0) return '';
  let html = '';
  details.forEach((detail, detailIndex) => {
    html += `
      <div class="detail-container">
        <h4 style="font-size: 14px; font-weight: 600; color: #1e293b; margin: 0 0 8px 0; font-family: var(--font-heading);">
          ${detail.name || `Ponto de Verificação ${detailIndex + 1}`}
        </h4>
        ${detail.observation ? `
          <div style="margin-bottom: 8px;">
            <span style="font-size: 10px; font-weight: 600; color: #64748b; text-transform: uppercase; display: block; margin-bottom: 2px;">Observação</span>
            <p style="font-size: 12px; color: #475569; margin: 0; line-height: 1.4; font-weight: 400;">${detail.observation}</p>
          </div>
        ` : ''}
        ${detail.value ? `
          <div style="margin-bottom: 8px;">
            <span style="font-size: 10px; font-weight: 600; color: #64748b; text-transform: uppercase; display: block; margin-bottom: 2px;">Valor Registrado</span>
            <p style="font-size: 12px; color: #1e293b; margin: 0; font-weight: 500; background: #f1f5f9; padding: 4px 8px; border-radius: 4px; display: inline-block;">${detail.value}</p>
          </div>
        ` : ''}
        ${detail.is_damaged ? `
          <div style="margin-bottom: 8px;">
            <span style="background: #fef2f2; color: #dc2626; font-size: 10px; font-weight: 600; padding: 4px 8px; border-radius: 12px; text-transform: uppercase;">⚠️ Danos Identificados</span>
          </div>
        ` : ''}
        
        ${generateDetailMedia(detail)}
        ${generateDetailNonConformities(detail.non_conformities)}
      </div>
    `;
  });
  return html;
}

/**
 * Generate media section for detail
 * @param {Object} detail - Detail data
 * @returns {string} HTML content
 */
function generateDetailMedia(detail) {
  if (!detail.media || detail.media.length === 0) return '';
  return `
    <div style="margin-top: 8px;">
      <span style="font-size: 10px; font-weight: 600; color: #64748b; text-transform: uppercase; display: block; margin-bottom: 4px;">Registros Fotográficos</span>
      <div class="media-grid grid-5">
        ${detail.media.map(media => generateMediaElement(media, "Registro do detalhe")).join('')}
      </div>
    </div>
  `;
}

/**
 * Generate non-conformities for topic
 * @param {Array} nonConformities - Non-conformities array
 * @returns {string} HTML content
 */
function generateTopicNonConformities(nonConformities) {
  return generateNonConformitiesSection(nonConformities, 'Não Conformidades do Tópico');
}

/**
 * Generate non-conformities for item
 * @param {Array} nonConformities - Non-conformities array
 * @returns {string} HTML content
 */
function generateItemNonConformities(nonConformities) {
  return generateNonConformitiesSection(nonConformities, 'Não Conformidades do Item');
}

/**
 * Generate non-conformities for detail
 * @param {Array} nonConformities - Non-conformities array
 * @returns {string} HTML content
 */
function generateDetailNonConformities(nonConformities) {
  return generateNonConformitiesSection(nonConformities, 'Não Conformidades do Detalhe');
}

/**
 * Generate non-conformities section
 * @param {Array} nonConformities - Non-conformities array
 * @param {string} title - Section title
 * @returns {string} HTML content
 */
function generateNonConformitiesSection(nonConformities, title) {
  if (!nonConformities || nonConformities.length === 0) return '';
  let html = `
    <div style="margin-top: 16px;">
      <h5 style="font-size: 14px; font-weight: 600; color: #dc2626; margin: 0 0 12px 0; text-transform: uppercase; letter-spacing: 0.5px;">${title}</h5>
  `;
  nonConformities.forEach((nc, index) => {
    const severityClass = getSeverityClass(nc.severity);
    const severityText = getSeverityText(nc.severity);
    const statusText = nc.is_resolved ? 'Resolvida' : 'Aberta';
    const statusClass = nc.is_resolved ? 'severity-resolvida' : 'severity-alta';
    
    html += `
      <div class="nc-container">
        <div class="nc-header">
          <h6 style="font-size: 13px; font-weight: 600; color: #1e293b; margin: 0; flex-grow: 1;">${nc.title || 'Não Conformidade ' + (index + 1)}</h6>
          <div class="nc-badges">
            <span class="badge ${severityClass}">${severityText}</span>
            <span class="badge ${statusClass}">${statusText}</span>
          </div>
        </div>
        
        ${nc.description ? `<p style="font-size: 12px; color: #475569; margin: 0 0 8px 0; line-height: 1.4;">${nc.description}</p>` : ''}
        ${nc.corrective_action ? `
          <div style="margin-bottom: 8px;">
            <span style="font-size: 10px; font-weight: 600; color: #059669; text-transform: uppercase; display: block; margin-bottom: 2px;">Ação Corretiva</span>
            <p style="font-size: 11px; color: #374151; margin: 0; line-height: 1.3;">${nc.corrective_action}</p>
          </div>
        ` : ''}
        ${nc.deadline ? `
          <div style="margin-bottom: 8px;">
            <span style="font-size: 10px; font-weight: 600; color: #ea580c; text-transform: uppercase; display: block; margin-bottom: 2px;">Prazo para Correção</span>
            <p style="font-size: 11px; color: #374151; margin: 0; font-weight: 500;">${formatDate(nc.deadline)}</p>
          </div>
        ` : ''}
        
        ${(nc.media && nc.media.length > 0) ? `
          <div style="margin-top: 8px;">
            <span style="font-size: 10px; font-weight: 600; color: #64748b; text-transform: uppercase; display: block; margin-bottom: 4px;">Evidências do Problema</span>
            <div class="media-grid grid-4">
              ${nc.media.map(media => generateMediaElement(media, "Evidência")).join('')}
            </div>
          </div>
        ` : ''}
        
        ${(nc.solved_media && nc.solved_media.length > 0) ? `
          <div style="margin-top: 8px;">
            <span style="font-size: 10px; font-weight: 600; color: #059669; text-transform: uppercase; display: block; margin-bottom: 4px;">Evidências da Correção</span>
            <div class="media-grid grid-4">
              ${nc.solved_media.map(media => generateMediaElement(media, "Resolução", "border-2 border-green-500")).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    `;
  });
  html += `</div>`;
  return html;
}

/**
 * Get all non-conformities from inspection
 * @param {Object} inspection - Inspection data
 * @returns {Array} Array of non-conformities with context
 */
function getAllNonConformities(inspection) {
  const nonConformities = [];
  if (!inspection.topics) return nonConformities;
  
  inspection.topics.forEach((topic, topicIndex) => {
    if (topic.non_conformities) {
      topic.non_conformities.forEach(nc => nonConformities.push({ ...nc, context: { topic: topic.name, item: null, detail: null }}));
    }
    if (topic.items) {
      topic.items.forEach((item, itemIndex) => {
        if (item.non_conformities) {
          item.non_conformities.forEach(nc => nonConformities.push({ ...nc, context: { topic: topic.name, item: item.name, detail: null }}));
        }
        if (item.details) {
          item.details.forEach((detail, detailIndex) => {
            if (detail.non_conformities) {
              detail.non_conformities.forEach(nc => nonConformities.push({ ...nc, context: { topic: topic.name, item: item.name, detail: detail.name }}));
            }
          });
        }
      });
    }
  });
  return nonConformities;
}

/**
 * Generate non-conformities content HTML for the dedicated report
 * @param {Object} inspection - The full inspection object
 * @param {Array} nonConformities - Array of non-conformities
 * @returns {string} HTML content
 */
function generateNonConformitiesContent(inspection, nonConformities) {
    const logoSvg = `<svg viewBox="0 0 195 53" fill="none" xmlns="http://www.w3.org/2000/svg" class="h-full w-auto"><path d="M0 0H14.98V38.45H37.4V51.18H0V0Z" fill="currentColor"/><path d="M55.75 10.23V51.18H41.58V10.23H55.75Z" fill="currentColor"/><path d="M175.24 40.8C170.13 40.58 167.37 38.79 165.95 36.18L191.31 27.1C190.36 20.64 187.46 8.50999 171.2 8.50999C162.7 8.50999 152.72 12.29 149.81 23.99C149.19 26.47 148.8 30.08 147.29 32.14C144.17 36.43 138.23 40.33 131.4 40.33C122.79 40.33 120.72 35.13 120.72 29.43C120.72 24.17 123.36 20.5 128.24 20.5C134.84 20.5 136.01 28.09 136.01 28.12L146.61 22.52C146.61 22.52 144.67 8.48999 127.36 8.48999C119.1 8.48999 105.17 13.1 105.17 30.16C105.17 45.2 115.67 51.97 129.54 51.97C143.4 51.97 150.05 44.08 151.62 41.89C155.57 49.08 163.64 52.42 173.37 52.42C181.87 52.42 190.63 48.71 194.53 45.14L189.45 35.34C187.32 38.61 180.65 41.01 175.24 40.78V40.8ZM179.46 23.29L163.6 28.88C162.9 24.54 163.58 20.54 167.57 18.69C174.28 15.57 178.15 20.68 179.46 23.29Z" fill="currentColor"/><path d="M89.26 9.94999C81.78 9.48999 77.39 12.7 74.83 15.55L73.6 10.21H60.62V51.17H74.98V30.33C74.98 29.07 75.01 21.98 81.85 21.98C89.54 21.98 89.45 30.35 89.45 38.9V51.17H103.35V35.12C103.35 17.73 97.85 10.48 89.27 9.94999H89.26Z" fill="currentColor"/></svg>`;

    let contentHtml;

    if (nonConformities.length === 0) {
        contentHtml = '<div class="text-center py-8 text-slate-500"><p>Nenhuma não conformidade encontrada na vistoria.</p></div>';
    } else {
        contentHtml = '<div class="space-y-4">';
        nonConformities.forEach((nc, index) => {
            const severityClass = getSeverityClass(nc.severity);
            const severityText = getSeverityText(nc.severity);
            const statusText = nc.is_resolved ? 'Resolvida' : 'Aberta';
            const statusClass = nc.is_resolved ? 'severity-resolvida' : 'severity-alta';
            
            contentHtml += `
              <div class="border border-slate-200 rounded-lg p-4 bg-white shadow-sm">
                <div class="flex justify-between items-start mb-3">
                  <h3 class="font-bold text-base text-slate-800">${nc.title || 'Não Conformidade ' + (index + 1)}</h3>
                  <div class="flex gap-2 text-xs font-medium">
                    <span class="px-2 py-0.5 rounded-full ${severityClass}">${severityText}</span>
                    <span class="px-2 py-0.5 rounded-full ${statusClass}">${statusText}</span>
                  </div>
                </div>
                
                <div class="mb-3 text-sm"><p class="text-xs text-slate-500 mb-0.5">Localização:</p><p class="font-medium text-slate-700">${nc.context.topic}${nc.context.item ? ' > ' + nc.context.item : ''}${nc.context.detail ? ' > ' + nc.context.detail : ''}</p></div>
                ${nc.description ? `<div class="mb-3 text-sm"><p class="text-xs text-slate-500 mb-0.5">Descrição:</p><p class="text-slate-700">${nc.description}</p></div>` : ''}
                ${nc.corrective_action ? `<div class="mb-3 text-sm"><p class="text-xs text-slate-500 mb-0.5">Ação Corretiva:</p><p class="text-slate-700">${nc.corrective_action}</p></div>` : ''}
                ${nc.deadline ? `<div class="mb-3 text-sm"><p class="text-xs text-slate-500 mb-0.5">Prazo:</p><p class="text-slate-700">${formatDate(nc.deadline)}</p></div>` : ''}
                
                ${(nc.media && nc.media.length > 0) ? `<div class="mt-3"><p class="text-xs font-bold text-slate-600 mb-1">Evidências:</p><div class="grid grid-cols-5 gap-2">${nc.media.map(media => generateMediaElement(media, "Evidência")).join('')}</div></div>` : ''}
                ${(nc.solved_media && nc.solved_media.length > 0) ? `<div class="mt-3"><p class="text-xs font-bold text-slate-600 mb-1">Evidências da Resolução:</p><div class="grid grid-cols-5 gap-2">${nc.solved_media.map(media => generateMediaElement(media, "Resolução", "border-2 border-green-500")).join('')}</div></div>` : ''}
              </div>
            `;
        });
        contentHtml += '</div>';
    }

    return `
    <div class="print-page">
      <main class="page-main">
        <h2 class="text-2xl font-bold mb-4 border-b-2 border-slate-200 pb-2">Relatório de Não Conformidades</h2>
        ${contentHtml}
      </main>
      <footer class="page-footer flex justify-between items-center">
        <div class="flex items-center gap-2">
            <div class="logo-container">${logoSvg}</div>
            <span class="text-sm font-medium">${inspection.cod || 'SEM-CÓDIGO'}</span>
        </div>
        <span class="text-sm">Página 2 de 2</span>
      </footer>
    </div>
  `;
}

/**
 * Generates a self-contained HTML element for media (image or video).
 * @param {object} media - Media object with cloudUrl and type
 * @param {string} altText - Alt text for the media
 * @param {string} extraClasses - Extra classes to add to the container
 * @returns {string} HTML string for the media element
 */
function generateMediaElement(media, altText, extraClasses = '') {
  if (media.type === 'image') {
    return `
      <div class="media-item ${extraClasses}" style="position: relative;">
        <img src="${media.cloudUrl}" alt="${altText}" style="width: 100%; height: 100%; object-fit: cover;" />
        <div style="position: absolute; bottom: 2px; right: 2px; background: rgba(0,0,0,0.7); color: white; padding: 1px 4px; border-radius: 2px; font-size: 8px;">📷</div>
      </div>
    `;
  }
  
  if (media.type === 'video') {
    return `
      <div class="media-item ${extraClasses}" style="position: relative; background: #000;">
        <video style="width: 100%; height: 100%; object-fit: cover;"><source src="${media.cloudUrl}" type="video/mp4"></video>
        <div style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.3);">
          <span style="color: white; font-size: 16px;">▶</span>
        </div>
        <div style="position: absolute; bottom: 2px; right: 2px; background: rgba(0,0,0,0.7); color: white; padding: 1px 4px; border-radius: 2px; font-size: 8px;">🎬</div>
      </div>
    `;
  }
  
  return '';
}


/**
 * Get severity CSS class
 * @param {string} severity - Severity level
 * @returns {string} CSS class
 */
function getSeverityClass(severity) {
  const severityMap = {
    'baixa': 'severity-baixa',
    'média': 'severity-media', 
    'alta': 'severity-alta',
    'crítica': 'severity-critica'
  };
  if (!severity || !severity.trim()) return 'bg-gray-100 text-gray-600';
  return severityMap[severity.toLowerCase()] || 'severity-baixa';
}

/**
 * Get severity display text
 * @param {string} severity - Severity level
 * @returns {string} Display text
 */
function getSeverityText(severity) {
  const severityMap = {
    'baixa': 'Baixa',
    'média': 'Média',
    'alta': 'Alta', 
    'crítica': 'Crítica'
  };
  if (!severity || !severity.trim()) return 'Não Definida';
  return severityMap[severity.toLowerCase()] || 'Baixa';
}

function getTotalItemsCount(inspection) {
  if (!inspection.topics) return 0;
  return inspection.topics.reduce((total, topic) => total + (topic.items?.length || 0), 0);
}

function getTotalDetailsCount(inspection) {
  if (!inspection.topics) return 0;
  return inspection.topics.reduce((topicTotal, topic) => 
    topicTotal + (topic.items ? topic.items.reduce((itemTotal, item) => 
      itemTotal + (item.details?.length || 0), 0) : 0), 0);
}

function getTotalNonConformitiesCount(inspection) {
  return getAllNonConformities(inspection).length;
}

function formatDate(dateString) {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Data inválida';
    return date.toLocaleDateString('pt-BR', {
      year: 'numeric',
      month: 'long', 
      day: 'numeric'
    });
  } catch {
    return 'N/A';
  }
}