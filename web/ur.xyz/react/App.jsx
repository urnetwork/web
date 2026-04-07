import React from 'react';
import URSimulation from './URSimulation';

export default function App() {
  return (
    <div style={{ width: '100vw', height: '100vh', margin: 0, padding: 0 }}>
      {/* If you want any page-level wrappers, navbars, or context providers, 
          they go here. For a pure fullscreen view, simply return the simulation. 
      */}
      <URSimulation />
    </div>
  );
}
