import React from 'react';

// Se mantiene el tipo AppMode para que sea consistente con App.tsx
export type AppMode = 'visualizer' | 'extractor' | 'composer' | 'reharmonizer';

// Se actualiza la interfaz para que coincida con las props que App.tsx está pasando
interface NavbarProps {
  activeMode: AppMode;
  onModeChange: (mode: AppMode) => void;
}

const Navbar: React.FC<NavbarProps> = ({ activeMode, onModeChange }) => {
  // CORRECCIÓN: Se utiliza tu estructura original de datos, pero añadiendo el nuevo modo.
  const modes: AppMode[] = ['visualizer', 'extractor', 'composer', 'reharmonizer'];
  
  // Se añade el nombre para el nuevo modo.
  const modeNames: { [key in AppMode]: string } = {
    visualizer: 'Visualizador',
    extractor: 'Extractor',
    composer: 'Compositor',
    reharmonizer: 'Rearmonizador',
  };

  return (
    // CORRECCIÓN: Se utiliza la clase "new-nav" que tenías en tu código original.
    <nav className="new-nav">
      {modes.map(mode => (
        <button
          key={mode}
          // CORRECCIÓN: Se utilizan las clases "new-nav-item" y "active" de tu código original.
          // Esto asegurará que tus estilos de neón se apliquen correctamente.
          className={`new-nav-item ${activeMode === mode ? 'active' : ''}`}
          // CORRECCIÓN: Se llama a onModeChange, que es el nombre de la prop en App.tsx.
          onClick={() => onModeChange(mode)}
        >
          {modeNames[mode]}
        </button>
      ))}
    </nav>
  );
};

export default Navbar;
