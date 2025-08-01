import React from 'react';

// Se actualiza AppMode para incluir el nuevo modo 'editor'
export type AppMode = 'visualizer' | 'editor' | 'reharmonizer';

interface NavbarProps {
  activeMode: AppMode;
  onModeChange: (mode: AppMode) => void;
}

const Navbar: React.FC<NavbarProps> = ({ activeMode, onModeChange }) => {
  // Se actualiza la lista de modos disponibles
  const modes: AppMode[] = ['visualizer', 'editor', 'reharmonizer'];
  
  // Se actualizan los nombres para mostrar
  const modeNames: { [key in AppMode]: string } = {
    visualizer: 'Visualizador',
    editor: 'Editor de Canciones', // Nuevo nombre para el modo unificado
    reharmonizer: 'Rearmonizador',
  };

  return (
    <nav className="new-nav">
      {modes.map(mode => (
        <button
          key={mode}
          className={`new-nav-item ${activeMode === mode ? 'active' : ''}`}
          onClick={() => onModeChange(mode)}
        >
          {modeNames[mode]}
        </button>
      ))}
    </nav>
  );
};

export default Navbar;
