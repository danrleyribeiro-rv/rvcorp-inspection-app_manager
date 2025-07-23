# Sistema de Versionamento de Inspeções

Este documento explica como configurar e usar o sistema de versionamento de inspeções que permite aos gerentes importar dados da coleção `inspections` para `inspections_data`.

## 🚀 Configuração Inicial

### 1. Configurar Regras do Firestore

Adicione estas regras ao seu arquivo `firestore.rules`:

```javascript
// Coleção para dados de inspeções gerenciadas pelos managers
match /inspections_data/{inspectionId} {
  allow read, write: if request.auth != null 
    && exists(/databases/$(database)/documents/managers/$(request.auth.uid));
}

// Coleção para histórico de pulls
match /inspection_pull_history/{historyId} {
  allow read, write: if request.auth != null 
    && exists(/databases/$(database)/documents/managers/$(request.auth.uid));
}
```

### 2. Inicializar Coleções (Opcional)

Execute o script de configuração no console do navegador:

```javascript
// Abra o console no navegador e execute:
if (window.setupVersioningCollections) {
  window.setupVersioningCollections();
}
```

## 📋 Como Usar

### 1. Acessar Controle de Versão

1. Vá para o editor de inspeções (`/inspections/[id]/editor`)
2. Clique na aba "Informações Gerais"
3. Role para baixo até a seção "Controle de Versão"

### 2. Estados do Sistema

#### 🆕 Primeira Importação
- **Status**: "Primeira Importação"
- **Ação**: Clique em "Importar Inspeção" para ver preview e importar

#### 🔄 Atualizações Disponíveis
- **Status**: "Atualizações Disponíveis" (badge vermelho piscando)
- **Ação**: Clique em "Visualizar e Atualizar" para ver mudanças

#### ✅ Sincronizado
- **Status**: "Sincronizado" (badge verde)
- **Ação**: Clique em "Visualizar Dados" para ver versão atual

### 3. Preview de Importação

O modal de preview mostra 4 abas:

1. **Visão Geral**: Estatísticas da inspeção (tópicos, itens, detalhes)
2. **Informações Gerais**: Título, área, observações
3. **Estrutura**: Organização hierárquica dos tópicos
4. **Alterações**: Comparação lado a lado (apenas para atualizações)

### 4. Histórico de Versões

- Mostra as 3 importações mais recentes
- Inclui número da versão, data e notas
- Cada importação incrementa o número da versão (v1, v2, v3...)

## 🗃️ Estrutura de Dados

### Coleção `inspections_data`

```javascript
{
  // Todos os campos da inspeção original +
  version: 1,                    // Número da versão
  source_inspection_id: "id",    // ID da inspeção original
  source_last_updated: timestamp, // Última atualização da fonte
  pulled_at: timestamp,          // Quando foi importada
  pulled_by: "manager_id",       // Quem importou
  pull_notes: "string",          // Notas da importação
  has_changes_available: false,   // Se há mudanças pendentes
  is_manager_copy: true          // Identifica como cópia do gerente
}
```

### Coleção `inspection_pull_history`

```javascript
{
  inspection_id: "id",
  version: 1,
  pulled_at: timestamp,
  pulled_by: "manager_id",
  pull_notes: "string",
  action: "pull"
}
```

## 🔧 Funcionalidades Avançadas

### 1. Detecção Automática de Mudanças

- O sistema compara timestamps automaticamente
- Detecta mudanças em informações gerais e estrutura
- Marca automaticamente quando há updates disponíveis

### 2. Comparação de Versões

- Mostra diferenças lado a lado
- Destaca campos alterados com cores
- Compara estrutura hierárquica (tópicos → itens → detalhes)

### 3. Versionamento Incremental

- Cada importação gera uma nova versão
- Histórico completo de todas as importações
- Metadados detalhados de cada operação

### 4. Notas de Importação

- Adicione comentários personalizados a cada importação
- Útil para documentar o motivo da atualização
- Visível no histórico de versões

## 🛠️ Solução de Problemas

### Erro de Permissões

Se você ver "Missing or insufficient permissions":

1. Verifique se as regras do Firestore foram configuradas
2. Certifique-se de que o usuário está autenticado
3. Confirme que existe um documento na coleção `managers`

### Primeira Vez Usando

1. O sistema mostrará um alerta de configuração
2. Copie as regras fornecidas para o Firestore
3. Publique as regras no Firebase Console
4. Recarregue a página

### Debugging

Use o console do navegador para ver logs detalhados:
- Erros de permissão são logados como warnings
- Estados de carregamento são rastreados
- Operações de importação são documentadas

## 🎯 Integração com Outros Componentes

### Hook `useInspectionVersioning`

```javascript
const {
  checkingChanges,
  changeInfo, 
  pullHistory,
  currentVersion,
  hasUpdatesAvailable,
  pullInspection,
  generatePreview
} = useInspectionVersioning(inspectionId);
```

### Componente de Indicador

```javascript
<InspectionUpdateIndicator 
  inspectionId={id}
  compact={true}
  onUpdateCompleted={() => {
    // Callback após atualização
  }}
/>
```

## 📝 Notas de Desenvolvimento

- O sistema usa o mesmo ID para documentos em ambas as coleções
- Operações são atômicas e incluem fallbacks para erros
- Timestamps são convertidos automaticamente para ISO strings
- Interface responsiva e acessível
- Suporte completo a loading states e error handling