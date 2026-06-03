import React from 'react';

interface TreeSelectionToolsProps {
  handleSelectAll: () => void;
  handleDeselectAll: () => void;
  handleCollapseAllEvents: () => void;
  handleExpandAllEvents: () => void;
}

export const TreeSelectionTools = ({
  handleSelectAll,
  handleDeselectAll,
  handleCollapseAllEvents,
  handleExpandAllEvents
}: TreeSelectionToolsProps) => {
  return (
    <div className="btn-group">
      <button
        type="button"
        className="btn btn-secondary btn-xs"
        title="Selecionar Todos os Documentos"
        onClick={handleSelectAll}
      >
        <span className="material-icons" style={{ fontSize: '12px' }}>check_circle</span>
        Todos
      </button>
      <button
        type="button"
        className="btn btn-secondary btn-xs"
        title="Limpar Seleção"
        onClick={handleDeselectAll}
      >
        <span className="material-icons" style={{ fontSize: '12px' }}>cancel</span>
        Nenhum
      </button>
      <button
        type="button"
        className="btn btn-secondary btn-xs"
        title="Recolher Todos os Eventos"
        onClick={handleCollapseAllEvents}
      >
        <span className="material-icons" style={{ fontSize: '12px' }}>expand_less</span>
        Recolher
      </button>
      <button
        type="button"
        className="btn btn-secondary btn-xs"
        title="Expandir Todos os Eventos"
        onClick={handleExpandAllEvents}
      >
        <span className="material-icons" style={{ fontSize: '12px' }}>expand_more</span>
        Expandir
      </button>
    </div>
  );
};
