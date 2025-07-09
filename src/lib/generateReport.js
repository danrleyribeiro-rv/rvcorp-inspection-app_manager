export function generateReportHtml(inspectionData) {
  const {
    title,
    cod,
    scheduled_date,
    address,
    area,
    topics,
    observation,
  } = inspectionData;

  

  const formattedDate = new Date(scheduled_date._seconds * 1000).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  let numTopics = topics.length;
  let numItems = 0;
  let numDetails = 0;
  let nonConformitiesCount = 0;

  topics.forEach(topic => {
    const items = topic.items || [];
    numItems += items.length;
    items.forEach(item => {
      const details = item.details || [];
      numDetails += details.length;
      details.forEach(detail => {
        if (detail.is_damaged) {
          nonConformitiesCount++;
        }
        if (detail.non_conformities && detail.non_conformities.length > 0) {
          nonConformitiesCount += detail.non_conformities.length;
        }
      });
    });
  });

  const generalObservation = observation === null ? 'Nenhuma observação adicional registrada para esta unidade.' : observation;

  let topicsHtml = '';
  topics.forEach(topic => {
    const topicName = topic.name;
    const topicDescription = topic.description;
    const topicObservation = topic.observation === null ? '' : topic.observation;

    topicsHtml += `
      <section class="mb-8 print:mb-6 page-break">
        <h2 class="text-2xl font-semibold text-slate-700 mb-4 border-b border-slate-300 pb-2 print:text-xl print:mb-3 print:pb-1">
          ${topicName}
        </h2>
        ${topicDescription ? `<p class="text-slate-600 print:text-sm mb-4">${topicDescription}</p>` : ''}
        ${topicObservation ? `<p class="text-slate-600 print:text-sm mb-4"><strong>Observação do Tópico:</strong> ${topicObservation}</p>` : ''}
        <div class="space-y-6">
    `;

    const items = topic.items && topic.items.arrayValue && topic.items.arrayValue.values ? topic.items.arrayValue.values : [];
    items.forEach(item => {
      const itemName = item.name;
      const itemDescription = item.description;
      const itemObservation = item.observation === null ? '' : item.observation;

      topicsHtml += `
          <div class="border border-slate-200 rounded-lg p-4 print:p-3">
            <h3 class="text-xl font-semibold text-slate-700 mb-3 print:text-lg print:mb-2">${itemName}</h3>
            ${itemDescription ? `<p class="text-slate-600 print:text-sm mb-3">${itemDescription}</p>` : ''}
            ${itemObservation ? `<p class="text-slate-600 print:text-sm mb-3"><strong>Observação do Item:</strong> ${itemObservation}</p>` : ''}
            <div class="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 print:grid-cols-2 print:gap-x-6 print:gap-y-3">
      `;

      const details = item.details || [];
      details.forEach(detail => {
        const detailName = detail.name;
        const detailType = detail.type;
        const detailValue = detail.value === null ? 'Não preenchido' : detail.value;
        const detailObservation = detail.observation === null ? '' : detail.observation;
        const isDamaged = detail.is_damaged;
        const nonConformities = detail.non_conformities && detail.non_conformities.length > 0 ?
          detail.non_conformities.map(nc => nc.description).join(', ') : '';

        let valueDisplay = detailValue;
        if (detailType === 'boolean') {
          valueDisplay = getBooleanValue(detailFields.value) ? 'Sim' : 'Não';
        } else if (detailType === 'select' && getNullValue(detailFields.value) === null) {
          valueDisplay = 'Não selecionado';
        } else if (detailType === 'measure' && getNullValue(detailFields.value) === null) {
          valueDisplay = 'Não medido';
        }

        topicsHtml += `
              <div>
                <p class="text-sm text-slate-500 print:text-xs">${detailName}</p>
                <p class="text-slate-700 font-medium print:text-sm">${valueDisplay}</p>
                ${isDamaged ? `<p class="text-red-500 text-sm print:text-xs font-bold">Dano Encontrado</p>` : ''}
                ${nonConformities ? `<p class="text-red-500 text-sm print:text-xs">Não Conformidades: ${nonConformities}</p>` : ''}
                ${detailObservation ? `<p class="text-slate-600 text-sm print:text-xs">Obs: ${detailObservation}</p>` : ''}
              </div>
        `;
      });
      topicsHtml += `
            </div>
          </div>
      `;
    });
    topicsHtml += `
        </div>
      </section>
    `;
  });

  let allImageUrls = [];
  topics.forEach(topic => {
    (topic.items || []).forEach(item => {
      (item.details || []).forEach(detail => {
        if (detail.media && detail.media.length > 0) {
          detail.media.forEach(mediaItem => {
            if (mediaItem.url) {
              allImageUrls.push(mediaItem.url);
            }
          });
        }
      });
    });
  });

  let imagesHtml = '';
  if (allImageUrls.length > 0) {
    imagesHtml = allImageUrls.map(url => `
      <div class="aspect-w-1 aspect-h-1">
        <img alt="Foto da inspeção" class="object-cover rounded-lg shadow-md print:shadow-sm w-full h-full" src="${url}" />
      </div>
    `).join('');
  } else {
    imagesHtml = '<p class="text-slate-600 print:text-sm">Nenhuma imagem disponível para esta inspeção.</p>';
  }

  return `<!DOCTYPE html>
<html lang="pt-BR">

<head>
  <meta charset="utf-8" />
  <meta content="width=device-width, initial-scale=1.0" name="viewport" />
  <title>Inspeção de ${title}</title>
  <script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
  <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet" />
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap');

    body {
      font-family: 'Inter', sans-serif;
    }

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
              <img alt="Lince Logo" class="h-10 mr-3 print:h-8"
                src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxwYXRoIGQ9Ik01MCAwQzIyLjM4NTggMCAwIDIyLjM4NTggMCA1MEMwIDc3LjYxNDIgMjIuMzg1OCAxMDAgNTAgMTAwQzc3LjYxNDIgMTAwIDEwMCA3Ny42MTQyIDEwMCA1MEMxMDAgMjIuMzg1OCA3Ny42MTQyIDAgNTAgMFpNNTAgMTBDNzIuMDkxNCAxMCA5MCAyNy45MDg2IDkwIDUwQzkwIDcyLjA5MTQgNzIuMDkxNCA5MCA1MCA5MEMyNy45MDg2IDkwIDEwIDcyLjA5MTQgMTAgNTBDMTAgMjcuOTA4NiAyNy45MDg2IDEwIDUwIDEwWk01MCAyMEMzMy40MzE1IDIwIDIwIDMzLjQzMTUgMjAgNTBDMjAgNjYuNTY4NSAzMy40MzE1IDgwIDUwIDgwQzY2LjU2ODUgODAgODAgNjYuNTY4NSA4MCA1MEM4MCAzMy40MzE1IDY2LjU2ODUgMjAgNTAgMjBaTTUwIDMwQ0Q0LjQ3NzIgMzAgNDAgMzQuNDc3MiA0MCA0MEM0MCA0NS41MjI4IDQ0LjQ3NzIgNTAgNTAgNTVDNTUuNTIyOCA1MCA2MCA0NS41MjI4IDYwIDQwQzYwIDM0LjQ3NzIgNTUuNTIyOCAzMCA1MCAzMFpNNTAgNjBDNDQuNDc3MiA2MCA0MCA2NC40NzcyIDQwIDcwQzQwIDc1LjUyMjggNDQuNDc3MiA4MCA1MCA4MEM1NS41MjI4IDgwIDYwIDc1LjUyMjggNjAgNzBDNjAgNjQuNDc3MiA1NS41MjI4IDYwIDUwIDYwWiIgZmlsbD0iIzRBOTBFMiIvPgo8L3N2Zz4=" />
              <div>
                <h1 class="text-xl font-semibold print:text-lg">Lince</h1>
                <p class="text-sm print:text-xs">Em algum lugar Bacana - 777, Último Andar</p>
                <p class="text-sm print:text-xs">Edifício HeavenTouch, Magic Island/BR</p>
              </div>
            </div>
            <div class="text-right">
              <h2 class="text-xl font-semibold print:text-lg">Inspeção de ${title} <span
                  class="material-icons align-middle text-3xl print:text-2xl">home_work</span></h2>
              <p class="text-sm print:text-xs font-bold">${cod}</p>
              <p class="text-xs print:text-[10px]"><strong>Realizado em:</strong> ${formattedDate}</p>
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
                      <p class="text-slate-700 font-medium print:text-sm">${title}</p>
                    </div>
                    <div>
                      <p class="text-sm text-slate-500 print:text-xs">Tipo da Unidade</p>
                      <p class="text-slate-700 font-medium print:text-sm">Apartamento</p>
                    </div>
                    <div class="md:col-span-2 print:col-span-2 border-t border-slate-200 pt-4 print:pt-3">
                      <p class="text-sm text-slate-500 print:text-xs">Lincer</p>
                      <p class="text-slate-700 font-medium print:text-sm">Waldemar Pereira Borges Júnior</p>
                    </div>
                    <div class="md:col-span-2 print:col-span-2 border-t border-slate-200 pt-4 print:pt-3">
                      <p class="text-sm text-slate-500 print:text-xs">Endereço</p>
                      <p class="text-slate-700 font-medium print:text-sm">${address ? `${address.street || ''}, ${address.number || ''}, ${address.neighborhood || ''}, ${address.city || ''} - ${address.state || ''}, ${address.cep || ''}` : 'Endereço não disponível'}</p>
                    </div>
                  </div>
                  <div class="mt-4 pt-4 border-t border-slate-200">
                  </div>
                </div>
              </div>
              <div class="md:w-1/3 mt-6 md:mt-0 print:mt-4 relative">
                <img alt="Mapa da localização da unidade"
                  class="w-full h-auto max-h-80 object-cover rounded-lg shadow-md print:shadow-sm"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuD45kjnH_3sds8L7zV6JL-R0TNPs67u9XyqjFleES5KFXwjbckKljxSZZ6f8ZwgLKMhA90LwcOqNyfwCc3BMhU-GEgWGIgsrzb_yCbNT42rv5lZHFnxI6OfRcydu02WbfojHuW9DSABWMf_H_GEgWGIgsrzb_yCbNT42rv5lZHFnxI6OfRcydu02WbfojHuW9DSABWMf_VMzeXPFlRdzsBaOprR8Uig6vX3u2X_hxR0V8xWzqsFTh1P7hamdGvIxCgQPhQuhmBXAWJACLOXjhsSMkoLFX2jT6YDFamklhlqpKBhw7x6TN1DnF4PfUwD435mdKQg" />
                <div class="absolute inset-0 flex items-center justify-center">
                  <div class="bg-white p-2 rounded-md shadow-lg text-center">
                    <span class="material-icons text-red-500 text-4xl">place</span>
                    <p class="text-xs text-slate-700 font-medium">${title}</p>
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
                <p class="text-slate-700 font-medium print:text-sm">${area} m²</p>
              </div>
              <div>
                <p class="text-sm text-slate-500 print:text-xs">Nº de Tópicos</p>
                <p class="text-slate-700 font-medium print:text-sm">${numTopics}</p>
              </div>
              <div>
                <p class="text-sm text-slate-500 print:text-xs">Nº de Itens</p>
                <p class="text-slate-700 font-medium print:text-sm">${numItems}</p>
              </div>
              <div>
                <p class="text-sm text-slate-500 print:text-xs">Nº de Detalhes</p>
                <p class="text-slate-700 font-medium print:text-sm">${numDetails}</p>
              </div>
              <div>
                <p class="text-sm text-slate-500 print:text-xs">Versão do Documento</p>
                <p class="text-slate-700 font-medium print:text-sm">1.0.0</p>
              </div>
              <div>
                <p class="text-sm text-slate-500 print:text-xs">Não Conformidades Encontradas</p>
                <p class="text-slate-700 font-medium print:text-sm">${nonConformitiesCount}</p>
              </div>
            </div>
          </section>
          <section class="mb-8 print:mb-6">
            <h2
              class="text-2xl font-semibold text-slate-700 mb-4 border-b border-slate-300 pb-2 print:text-xl print:mb-3 print:pb-1">
              Observações Gerais</h2>
            <p class="text-slate-600 print:text-sm">${generalObservation}</p>
          </section>
          ${topicsHtml}
          <section class="mb-8 print:mb-6">
            <h2
              class="text-2xl font-semibold text-slate-700 mb-4 border-b border-slate-300 pb-2 print:text-xl print:mb-3 print:pb-1">
              Fotos da Unidade</h2>
            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 print:grid-cols-3">
              ${imagesHtml}
            </div>
          </section>
        </main>
        <footer style="background-color: #312456;" class="text-white text-xs p-4 print:p-2 mt-auto">
          <div class="container mx-auto flex justify-between items-center">
            <div class="flex items-center">
              <span class="material-icons text-lg mr-2 print:text-base">home_work</span>
              <span>Inspeção de ${title}: ${title} - ${cod}</span>
            </div>
            <span>Página 1 de 1</span>
          </div>
        </footer>
      </div>
    </div>
  </div>

</body>

</html>`;
}