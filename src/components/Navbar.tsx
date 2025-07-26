import React from 'react';

interface NavbarProps {
  activeMode: string;
  setActiveMode: (mode: string) => void;
}

const Navbar: React.FC<NavbarProps> = ({ activeMode, setActiveMode }) => {
  return (
    <nav className="tabs">
      <button
        id="visualizer-tab"
        className={`tab ${activeMode === 'visualizer' ? 'active' : ''}`}
        onClick={() => {
          console.log('Navbar: Cambiando a visualizer');
          setActiveMode('visualizer');
        }}
      >
        Visualizador
      </button>
      <button
        id="extractor-tab"
        className={`tab ${activeMode === 'extractor' ? 'active' : ''}`}
        onClick={() => {
          console.log('Navbar: Cambiando a extractor');
          setActiveMode('extractor');
        }}
      >
        Extractor
      </button>
      <button
        id="composer-tab"
        className={`tab ${activeMode === 'composer' ? 'active' : ''}`}
        onClick={() => {
          console.log('Navbar: Cambiando a composer');
          setActiveMode('composer');
        }}
      >
        Compositor
      </button>
    </nav>
  );
};

export default Navbar;