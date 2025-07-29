import React from 'react';

interface NavbarProps {
  activeMode: string;
  setActiveMode: (mode: string) => void;
}

const Navbar: React.FC<NavbarProps> = ({ activeMode, setActiveMode }) => {
  const modes = ['visualizer', 'extractor', 'composer'];
  const modeNames: { [key: string]: string } = {
    visualizer: 'Visualizador',
    extractor: 'Extractor',
    composer: 'Compositor',
  };

  return (
    <nav className="new-nav">
      {modes.map(mode => (
        <button
          key={mode}
          className={`new-nav-item ${activeMode === mode ? 'active' : ''}`}
          onClick={() => setActiveMode(mode)}
        >
          {modeNames[mode]}
        </button>
      ))}
    </nav>
  );
};

export default Navbar;
