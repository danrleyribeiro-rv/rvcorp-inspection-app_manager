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
  const template = getReportTemplate();
  
  // Extract basic inspection data
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
    nonConformitiesCount: getTotalNonConformitiesCount(inspection),
    detailedContent: generateDetailedInspectionContent(inspection)
  };
  
  // Replace template placeholders
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
    .replace(/{{DETAILED_CONTENT}}/g, inspectionData.detailedContent);
  
  return html;
}

/**
 * Generate non-conformities only report
 * @param {Object} inspection - Inspection data
 * @returns {string} HTML content
 */
function generateNonConformitiesReport(inspection) {
  const template = getReportTemplate();
  
  // Extract non-conformities
  const nonConformities = getAllNonConformities(inspection);
  
  // Generate NC-specific content
  const ncContent = generateNonConformitiesContent(nonConformities);
  
  // Extract basic inspection data
  const inspectionData = {
    title: `${inspection.title || 'Vistoria sem título'} - Relatório de Não Conformidades`,
    cod: inspection.cod || 'SEM-CÓDIGO',
    createdAt: formatDate(inspection.created_at),
    area: inspection.area || 'N/A',
    observation: `Este relatório contém apenas as não conformidades encontradas durante a vistoria. Total de não conformidades: ${nonConformities.length}`,
    address: inspection.address_string || 'Endereço não informado',
    inspector: inspection.inspectors?.name || 'Não atribuído',
    project: inspection.projects?.title || 'Projeto não informado',
    topicsCount: inspection.topics?.length || 0,
    itemsCount: getTotalItemsCount(inspection),
    detailsCount: getTotalDetailsCount(inspection),
    nonConformitiesCount: nonConformities.length,
    detailedContent: ncContent
  };
  
  // Replace template placeholders
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
    .replace(/{{DETAILED_CONTENT}}/g, inspectionData.detailedContent);
  
  return html;
}

/**
 * Get the report template HTML
 * @returns {string} Template HTML
 */
function getReportTemplate() {
  return `<!DOCTYPE html>
<html lang="pt-BR">

<head>
  <meta charset="utf-8" />
  <meta content="width=device-width, initial-scale=1.0" name="viewport" />
  <title>{{INSPECTION_TITLE}}</title>
  <script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
  <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet" />
  <style>
        /* Bricolage Grotesque - Para títulos */
        @font-face {
            font-family: 'Bricolage Grotesque';
            src: url('./fonts/BricolageGrotesque_24pt-Regular.ttf') format('truetype');
            font-weight: 400;
            font-style: normal;
        }
        @font-face {
            font-family: 'Bricolage Grotesque';
            src: url('./fonts/BricolageGrotesque_24pt-Medium.ttf') format('truetype');
            font-weight: 500;
            font-style: normal;
        }
        @font-face {
            font-family: 'Bricolage Grotesque';
            src: url('./fonts/BricolageGrotesque_24pt-SemiBold.ttf') format('truetype');
            font-weight: 600;
            font-style: normal;
        }
        @font-face {
            font-family: 'Bricolage Grotesque';
            src: url('./fonts/BricolageGrotesque_24pt-Bold.ttf') format('truetype');
            font-weight: 700;
            font-style: normal;
        }

        /* Inter - Para corpo do texto */
        @font-face {
            font-family: 'Inter';
            src: url('./fonts/Inter-Regular.ttf') format('truetype');
            font-weight: 400;
            font-style: normal;
        }
        @font-face {
            font-family: 'Inter';
            src: url('./fonts/Inter-Medium.ttf') format('truetype');
            font-weight: 500;
            font-style: normal;
        }
        @font-face {
            font-family: 'Inter';
            src: url('./fonts/Inter-Bold.ttf') format('truetype');
            font-weight: 700;
            font-style: normal;
        }

        :root {
            --font-heading: 'Bricolage Grotesque', sans-serif;
            --font-body: 'Inter', sans-serif;
        }

        body {
            font-family: var(--font-body);
        }

        h1, h2, h3, h4, h5, h6 {
            font-family: var(--font-heading);
        }

        .severity-baixa { background-color: #fbbf24; color: #92400e; }
        .severity-media { background-color: #f97316; color: #ea580c; }
        .severity-alta { background-color: #ef4444; color: #dc2626; }
        .severity-critica { background-color: #8b5cf6; color: #7c3aed; }
        .severity-resolvida { background-color: #10b981; color: #047857; }

    @media print {
      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      .page-break {
        page-break-before: always;
      }

      .no-print {
        display: none;
      }

      .print-page {
        width: 210mm;
        height: 297mm;
        margin: 0 auto;
        padding: 15mm;
        box-shadow: none;
        page-break-after: always;
      }

      .print-page:last-child {
        page-break-after: auto;
      }
    }
  </style>
</head>

<body class="bg-gray-100 print:bg-white">
  <div class="min-h-screen flex flex-col">
    <div class="container mx-auto p-4 md:p-8 print:p-0">
      <div class="bg-white shadow-lg print:shadow-none print-page">
        <header style="background-color: #312456;" class="text-white p-6 print:p-4">
          <div class="flex justify-between items-center">
            <div class="flex items-center">
              <img alt="Lince Logo" class="h-12 mr-4 print:h-10" src="./logo.png" />
              <div>
                <p class="text-sm print:text-xs">Em algum lugar Bacana - 777, Último Andar</p>
                <p class="text-sm print:text-xs">Edifício HeavenTouch, Magic Island/BR</p>
              </div>
            </div>
            <div class="text-right">
              <h2 class="text-xl font-semibold print:text-lg">{{INSPECTION_TITLE}} <span
                  class="material-icons align-middle text-3xl print:text-2xl">home_work</span></h2>
              <p class="text-sm print:text-xs font-bold">{{INSPECTION_CODE}}</p>
              <p class="text-xs print:text-[10px]"><strong>Realizado em:</strong> {{INSPECTION_DATE}}</p>
            </div>
          </div>
        </header>
        <main class="p-6 flex-grow print:p-4">
          <section class="mb-8 print:mb-6">
            <div class="flex flex-col md:flex-row gap-x-8">
              <div class="flex-grow md:w-2/3">
                <h2 class="text-3xl font-semibold text-slate-700 mb-4 print:text-2xl print:mb-3">Sobre a Inspeção</h2>
                <div class="border-t border-slate-300 pt-4 print:pt-3">
                  <div
                    class="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 print:grid-cols-2 print:gap-x-6 print:gap-y-3">
                    <div>
                      <p class="text-sm text-slate-500 print:text-xs">Título</p>
                      <p class="text-slate-700 font-medium print:text-sm">{{INSPECTION_TITLE}}</p>
                    </div>
                    <div>
                      <p class="text-sm text-slate-500 print:text-xs">Tipo da Unidade</p>
                      <p class="text-slate-700 font-medium print:text-sm">{{PROJECT_TITLE}}</p>
                    </div>
                    <div class="md:col-span-2 print:col-span-2 border-t border-slate-200 pt-4 print:pt-3">
                      <p class="text-sm text-slate-500 print:text-xs">Lincer</p>
                      <p class="text-slate-700 font-medium print:text-sm">{{INSPECTOR_NAME}}</p>
                    </div>
                    <div class="md:col-span-2 print:col-span-2 border-t border-slate-200 pt-4 print:pt-3">
                      <p class="text-sm text-slate-500 print:text-xs">Endereço</p>
                      <p class="text-slate-700 font-medium print:text-sm">{{INSPECTION_ADDRESS}}</p>
                    </div>
                  </div>
                  <div class="mt-4 pt-4 border-t border-slate-200">
                  </div>
                </div>
              </div>
            </div>
          </section>
          <section class="mb-8 print:mb-6">
            <h2
              class="text-2xl font-semibold text-slate-700 mb-4 border-b border-slate-300 pb-2 print:text-xl print:mb-3 print:pb-1">
              Detalhes</h2>
            <div class="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-4 print:grid-cols-3 print:gap-x-6 print:gap-y-3">
              <div>
                <p class="text-sm text-slate-500 print:text-xs">Área</p>
                <p class="text-slate-700 font-medium print:text-sm">{{INSPECTION_AREA}} m²</p>
              </div>
              <div>
                <p class="text-sm text-slate-500 print:text-xs">Nº de Tópicos</p>
                <p class="text-slate-700 font-medium print:text-sm">{{TOPICS_COUNT}}</p>
              </div>
              <div>
                <p class="text-sm text-slate-500 print:text-xs">Nº de Itens</p>
                <p class="text-slate-700 font-medium print:text-sm">{{ITEMS_COUNT}}</p>
              </div>
              <div>
                <p class="text-sm text-slate-500 print:text-xs">Nº de Detalhes</p>
                <p class="text-slate-700 font-medium print:text-sm">{{DETAILS_COUNT}}</p>
              </div>
              <div>
                <p class="text-sm text-slate-500 print:text-xs">Versão do Documento</p>
                <p class="text-slate-700 font-medium print:text-sm">1.0.0</p>
              </div>
              <div>
                <p class="text-sm text-slate-500 print:text-xs">Não Conformidades Encontradas</p>
                <p class="text-slate-700 font-medium print:text-sm">{{NON_CONFORMITIES_COUNT}}</p>
              </div>
            </div>
          </section>
          <section class="mb-8 print:mb-6">
            <h2
              class="text-2xl font-semibold text-slate-700 mb-4 border-b border-slate-300 pb-2 print:text-xl print:mb-3 print:pb-1">
              Observações Gerais</h2>
            <p class="text-slate-600 print:text-sm">{{GENERAL_OBSERVATION}}</p>
          </section>
        </main>
        <footer style="background-color: #312456;" class="text-white text-xs p-4 print:p-2 mt-auto">
          <div class="container mx-auto flex justify-between items-center">
            <div class="flex items-center">
              <span class="material-icons text-lg mr-2 print:text-base">home_work</span>
              <span>{{INSPECTION_TITLE}} - {{INSPECTION_CODE}}</span>
            </div>
            <span>Capa</span>
          </div>
        </footer>
      </div>
      
      <!-- Páginas de Conteúdo Detalhado -->
      {{DETAILED_CONTENT}}
      
    </div>
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
    return '<div class="text-center py-8 text-gray-500"><p>Nenhum tópico encontrado na inspeção.</p></div>';
  }
  
  let html = '<div class="space-y-8">';
  
  inspection.topics.forEach((topic, topicIndex) => {
    html += `
      <div class="page-break">
        <section class="mb-8 print:mb-6">
          <h2 class="text-2xl font-semibold text-slate-700 mb-4 border-b border-slate-300 pb-2 print:text-xl print:mb-3 print:pb-1">
            ${topic.name || `Tópico ${topicIndex + 1}`}
          </h2>
          
          ${topic.description ? `
            <p class="text-slate-600 mb-4 print:text-sm">${topic.description}</p>
          ` : ''}
          
          ${topic.observation ? `
            <div class="mb-4">
              <h4 class="font-medium text-sm mb-2 text-slate-600">Observações do Tópico:</h4>
              <p class="text-slate-600 print:text-sm">${topic.observation}</p>
            </div>
          ` : ''}
          
          ${generateTopicMedia(topic)}
          ${generateTopicNonConformities(topic.non_conformities)}
          ${generateTopicItems(topic.items)}
        </section>
      </div>
    `;
  });
  
  html += '</div>';
  return html;
}

/**
 * Generate media section for topic
 * @param {Object} topic - Topic data
 * @returns {string} HTML content
 */
function generateTopicMedia(topic) {
  if (!topic.media || topic.media.length === 0) {
    return '';
  }
  
  return `
    <div class="mb-6">
      <h4 class="font-medium text-lg mb-3 text-slate-700">Fotos do Tópico</h4>
      <div class="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3 print:grid-cols-4">
        ${topic.media.filter(m => m.type === 'image').map(media => `
          <div class="aspect-square">
            <img src="${media.cloudUrl}" alt="Foto do tópico" class="w-full h-full object-cover rounded-lg shadow-sm" />
          </div>
        `).join('')}
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
  if (!items || items.length === 0) {
    return '';
  }
  
  let html = '<div class="space-y-6">';
  
  items.forEach((item, itemIndex) => {
    html += `
      <div class="border-l-4 border-blue-200 pl-4">
        <h3 class="text-xl font-semibold text-slate-700 mb-3">
          ${item.name || `Item ${itemIndex + 1}`}
        </h3>
        
        ${item.description ? `
          <p class="text-slate-600 mb-3 print:text-sm">${item.description}</p>
        ` : ''}
        
        ${item.observation ? `
          <div class="mb-3">
            <h5 class="font-medium text-sm mb-1 text-slate-600">Observações do Item:</h5>
            <p class="text-slate-600 print:text-sm">${item.observation}</p>
          </div>
        ` : ''}
        
        ${generateItemMedia(item)}
        ${generateItemNonConformities(item.non_conformities)}
        ${generateItemDetails(item.details)}
      </div>
    `;
  });
  
  html += '</div>';
  return html;
}

/**
 * Generate media section for item
 * @param {Object} item - Item data
 * @returns {string} HTML content
 */
function generateItemMedia(item) {
  if (!item.media || item.media.length === 0) {
    return '';
  }
  
  return `
    <div class="mb-4">
      <h5 class="font-medium text-base mb-2 text-slate-700">Fotos do Item</h5>
      <div class="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2 print:grid-cols-4">
        ${item.media.filter(m => m.type === 'image').map(media => `
          <div class="aspect-square">
            <img src="${media.cloudUrl}" alt="Foto do item" class="w-full h-full object-cover rounded shadow-sm" />
          </div>
        `).join('')}
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
  if (!details || details.length === 0) {
    return '';
  }
  
  let html = '<div class="space-y-4 ml-4">';
  
  details.forEach((detail, detailIndex) => {
    html += `
      <div class="border-l-2 border-gray-200 pl-3">
        <h4 class="text-lg font-medium text-slate-700 mb-2">
          ${detail.name || `Detalhe ${detailIndex + 1}`}
        </h4>
        
        ${detail.observation ? `
          <div class="mb-2">
            <h6 class="font-medium text-xs mb-1 text-slate-600 uppercase">Observações:</h6>
            <p class="text-slate-600 text-sm">${detail.observation}</p>
          </div>
        ` : ''}
        
        ${detail.value ? `
          <div class="mb-2">
            <h6 class="font-medium text-xs mb-1 text-slate-600 uppercase">Valor:</h6>
            <p class="text-slate-700 text-sm font-medium">${detail.value}</p>
          </div>
        ` : ''}
        
        ${detail.is_damaged ? `
          <div class="mb-2">
            <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
              ⚠️ Danos Identificados
            </span>
          </div>
        ` : ''}
        
        ${generateDetailMedia(detail)}
        ${generateDetailNonConformities(detail.non_conformities)}
      </div>
    `;
  });
  
  html += '</div>';
  return html;
}

/**
 * Generate media section for detail
 * @param {Object} detail - Detail data
 * @returns {string} HTML content
 */
function generateDetailMedia(detail) {
  if (!detail.media || detail.media.length === 0) {
    return '';
  }
  
  return `
    <div class="mb-3">
      <h6 class="font-medium text-sm mb-2 text-slate-700">Fotos do Detalhe</h6>
      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 print:grid-cols-3">
        ${detail.media.filter(m => m.type === 'image').map(media => `
          <div class="aspect-square">
            <img src="${media.cloudUrl}" alt="Foto do detalhe" class="w-full h-full object-cover rounded shadow-sm" />
          </div>
        `).join('')}
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
  if (!nonConformities || nonConformities.length === 0) {
    return '';
  }
  
  let html = `
    <div class="mb-4">
      <h5 class="font-medium text-base mb-3 text-slate-700">${title}</h5>
      <div class="space-y-3">
  `;
  
  nonConformities.forEach((nc, index) => {
    const severityClass = getSeverityClass(nc.severity);
    const severityText = getSeverityText(nc.severity);
    const statusText = nc.is_resolved ? 'Resolvida' : 'Aberta';
    const statusClass = nc.is_resolved ? 'severity-resolvida' : 'severity-alta';
    
    html += `
      <div class="border rounded-lg p-3 bg-gray-50 shadow-sm">
        <div class="flex justify-between items-start mb-2">
          <h6 class="font-semibold text-sm">${nc.title || 'Não Conformidade ' + (index + 1)}</h6>
          <div class="flex gap-1">
            <span class="px-2 py-1 rounded text-xs font-medium ${severityClass}">${severityText}</span>
            <span class="px-2 py-1 rounded text-xs font-medium ${statusClass}">${statusText}</span>
          </div>
        </div>
        
        ${nc.description ? `
          <p class="text-sm text-gray-700 mb-2">${nc.description}</p>
        ` : ''}
        
        ${nc.corrective_action ? `
          <div class="mb-2">
            <p class="text-xs text-gray-600 mb-1">Ação Corretiva:</p>
            <p class="text-sm text-gray-700">${nc.corrective_action}</p>
          </div>
        ` : ''}
        
        ${nc.deadline ? `
          <div class="mb-2">
            <p class="text-xs text-gray-600 mb-1">Prazo:</p>
            <p class="text-sm text-gray-700">${formatDate(nc.deadline)}</p>
          </div>
        ` : ''}
        
        ${nc.media && nc.media.length > 0 ? `
          <div class="mb-2">
            <p class="text-xs text-gray-600 mb-1">Evidências:</p>
            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1 print:grid-cols-3">
              ${nc.media.map(media => `
                <div class="aspect-square">
                  <img src="${media.cloudUrl}" alt="Evidência" class="w-full h-full object-cover rounded border" />
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
        
        ${nc.solved_media && nc.solved_media.length > 0 ? `
          <div class="mb-2">
            <p class="text-xs text-gray-600 mb-1">Evidências da Resolução:</p>
            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1 print:grid-cols-3">
              ${nc.solved_media.map(media => `
                <div class="aspect-square">
                  <img src="${media.cloudUrl}" alt="Resolução" class="w-full h-full object-cover rounded border-2 border-green-500" />
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    `;
  });
  
  html += `
      </div>
    </div>
  `;
  
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
    // Topic-level non-conformities
    if (topic.non_conformities) {
      topic.non_conformities.forEach(nc => {
        nonConformities.push({
          ...nc,
          context: {
            topic: topic.name,
            item: null,
            detail: null,
            topicIndex,
            itemIndex: null,
            detailIndex: null
          }
        });
      });
    }
    
    if (topic.items) {
      topic.items.forEach((item, itemIndex) => {
        // Item-level non-conformities
        if (item.non_conformities) {
          item.non_conformities.forEach(nc => {
            nonConformities.push({
              ...nc,
              context: {
                topic: topic.name,
                item: item.name,
                detail: null,
                topicIndex,
                itemIndex,
                detailIndex: null
              }
            });
          });
        }
        
        if (item.details) {
          item.details.forEach((detail, detailIndex) => {
            // Detail-level non-conformities
            if (detail.non_conformities) {
              detail.non_conformities.forEach(nc => {
                nonConformities.push({
                  ...nc,
                  context: {
                    topic: topic.name,
                    item: item.name,
                    detail: detail.name,
                    topicIndex,
                    itemIndex,
                    detailIndex
                  }
                });
              });
            }
          });
        }
      });
    }
  });
  
  return nonConformities;
}

/**
 * Generate non-conformities content HTML
 * @param {Array} nonConformities - Array of non-conformities
 * @returns {string} HTML content
 */
function generateNonConformitiesContent(nonConformities) {
  if (nonConformities.length === 0) {
    return '<div class="text-center py-8 text-gray-500"><p>Nenhuma não conformidade encontrada.</p></div>';
  }
  
  let html = '<div class="space-y-6">';
  
  nonConformities.forEach((nc, index) => {
    const severityClass = getSeverityClass(nc.severity);
    const severityText = getSeverityText(nc.severity);
    const statusText = nc.is_resolved ? 'Resolvida' : 'Aberta';
    const statusClass = nc.is_resolved ? 'severity-resolvida' : 'severity-alta';
    
    html += `
      <div class="border rounded-lg p-4 bg-white shadow-sm">
        <div class="flex justify-between items-start mb-3">
          <h3 class="font-semibold text-lg">${nc.title || 'Não Conformidade ' + (index + 1)}</h3>
          <div class="flex gap-2">
            <span class="px-2 py-1 rounded text-xs font-medium ${severityClass}">${severityText}</span>
            <span class="px-2 py-1 rounded text-xs font-medium ${statusClass}">${statusText}</span>
          </div>
        </div>
        
        <div class="mb-3">
          <p class="text-sm text-gray-600 mb-1">Localização:</p>
          <p class="text-sm">${nc.context.topic}${nc.context.item ? ' > ' + nc.context.item : ''}${nc.context.detail ? ' > ' + nc.context.detail : ''}</p>
        </div>
        
        ${nc.description ? `
          <div class="mb-3">
            <p class="text-sm text-gray-600 mb-1">Descrição:</p>
            <p class="text-sm">${nc.description}</p>
          </div>
        ` : ''}
        
        ${nc.corrective_action ? `
          <div class="mb-3">
            <p class="text-sm text-gray-600 mb-1">Ação Corretiva:</p>
            <p class="text-sm">${nc.corrective_action}</p>
          </div>
        ` : ''}
        
        ${nc.deadline ? `
          <div class="mb-3">
            <p class="text-sm text-gray-600 mb-1">Prazo:</p>
            <p class="text-sm">${formatDate(nc.deadline)}</p>
          </div>
        ` : ''}
        
        ${nc.media && nc.media.length > 0 ? `
          <div class="mb-3">
            <p class="text-sm text-gray-600 mb-2">Evidências:</p>
            <div class="grid grid-cols-3 gap-2">
              ${nc.media.map(media => `
                <img src="${media.cloudUrl}" alt="Evidência" class="w-full h-20 object-cover rounded" />
              `).join('')}
            </div>
          </div>
        ` : ''}
        
        ${nc.solved_media && nc.solved_media.length > 0 ? `
          <div class="mb-3">
            <p class="text-sm text-gray-600 mb-2">Evidências da Resolução:</p>
            <div class="grid grid-cols-3 gap-2">
              ${nc.solved_media.map(media => `
                <img src="${media.cloudUrl}" alt="Resolução" class="w-full h-20 object-cover rounded border-2 border-green-500" />
              `).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    `;
  });
  
  html += '</div>';
  return html;
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
  return severityMap[severity?.toLowerCase()] || 'severity-baixa';
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
  return severityMap[severity?.toLowerCase()] || 'Baixa';
}


/**
 * Get total items count
 * @param {Object} inspection - Inspection data
 * @returns {number} Total items count
 */
function getTotalItemsCount(inspection) {
  if (!inspection.topics) return 0;
  return inspection.topics.reduce((total, topic) => total + (topic.items?.length || 0), 0);
}

/**
 * Get total details count
 * @param {Object} inspection - Inspection data
 * @returns {number} Total details count
 */
function getTotalDetailsCount(inspection) {
  if (!inspection.topics) return 0;
  let total = 0;
  inspection.topics.forEach(topic => {
    if (topic.items) {
      topic.items.forEach(item => {
        total += item.details?.length || 0;
      });
    }
  });
  return total;
}

/**
 * Get total non-conformities count
 * @param {Object} inspection - Inspection data
 * @returns {number} Total non-conformities count
 */
function getTotalNonConformitiesCount(inspection) {
  return getAllNonConformities(inspection).length;
}

/**
 * Format date for display
 * @param {string} dateString - Date string
 * @returns {string} Formatted date
 */
function formatDate(dateString) {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      year: 'numeric',
      month: 'long', 
      day: 'numeric'
    });
  } catch {
    return 'N/A';
  }
}