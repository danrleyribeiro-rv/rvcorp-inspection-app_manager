// src/utils/inspection-status.js
// Sistema de status visual interno da aplicação

/**
 * Determina o status visual interno baseado nos dados da inspeção
 * @param {Object} inspection - Dados da inspeção
 * @returns {string} - Status: 'pendente', 'editada', 'entregue'
 */
export const getInternalStatus = (inspection) => {
  if (!inspection) return 'pendente';
  
  // Se tem campo delivered_at preenchido, está entregue
  if (inspection.delivered_at) {
    return 'entregue';
  }
  
  // Se o status original não é 'pending', foi editada
  if (inspection.status && inspection.status !== 'pending') {
    return 'editada';
  }
  
  // Padrão é pendente
  return 'pendente';
};

/**
 * Retorna o texto em português para o status interno
 * @param {string} internalStatus - Status interno
 * @returns {string} - Texto em português
 */
export const getInternalStatusText = (internalStatus) => {
  const statusMap = {
    'pendente': 'Pendente',
    'editada': 'Editada',
    'entregue': 'Entregue'
  };
  return statusMap[internalStatus] || 'Pendente';
};

/**
 * Retorna as classes CSS para o status interno
 * @param {string} internalStatus - Status interno
 * @returns {string} - Classes CSS do Tailwind
 */
export const getInternalStatusColor = (internalStatus) => {
  const colorMap = {
    'pendente': 'bg-yellow-100 text-yellow-800 border-yellow-200',
    'editada': 'bg-blue-100 text-blue-800 border-blue-200',
    'entregue': 'bg-green-100 text-green-800 border-green-200'
  };
  return colorMap[internalStatus] || 'bg-gray-100 text-gray-800 border-gray-200';
};

/**
 * Retorna a cor hexadecimal para gráficos e mapas
 * @param {string} internalStatus - Status interno
 * @returns {string} - Cor hexadecimal
 */
export const getInternalStatusHexColor = (internalStatus) => {
  const colorMap = {
    'pendente': '#fbbf24',
    'editada': '#3b82f6',
    'entregue': '#10b981'
  };
  return colorMap[internalStatus] || '#6b7280';
};

/**
 * Retorna emoji para o status (usado em mapas)
 * @param {string} internalStatus - Status interno
 * @returns {string} - Emoji
 */
export const getInternalStatusEmoji = (internalStatus) => {
  const emojiMap = {
    'pendente': '⏳',
    'editada': '✏️',
    'entregue': '✅'
  };
  return emojiMap[internalStatus] || '📋';
};

/**
 * Lista todos os status disponíveis para filtros
 * @returns {Array} - Array de objetos com value e label
 */
export const getInternalStatusOptions = () => [
  { value: 'all', label: 'Todos' },
  { value: 'pendente', label: 'Pendente' },
  { value: 'editada', label: 'Editada' },
  { value: 'entregue', label: 'Entregue' }
];

/**
 * Marca uma inspeção como entregue
 * @param {Object} inspection - Dados da inspeção
 * @returns {Object} - Dados atualizados da inspeção
 */
export const markAsDelivered = (inspection) => {
  return {
    ...inspection,
    delivered_at: new Date(),
    delivered_by: 'current_user' // Será substituído pelo ID do usuário atual
  };
};

/**
 * Remove a marcação de entrega
 * @param {Object} inspection - Dados da inspeção
 * @returns {Object} - Dados atualizados da inspeção
 */
export const unmarkAsDelivered = (inspection) => {
  const { delivered_at, delivered_by, ...rest } = inspection;
  return rest;
};