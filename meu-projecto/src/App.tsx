// src/App.tsx
import React, { useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Sidebar from "./Sidebar";
import PainelDocente from "./PainelDocente";
import MinhasDisciplinas from "./MinhasDisciplinas";
import "./App.css";

const App: React.FC = () => {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  return (
    <BrowserRouter>
      <div className="app" style={{ display: "flex" }}>
        <Sidebar isOpen={isOpen} />

        <div style={{ flex: 1, padding: "20px" }}>
          <button
            className="toggle-btn"
            onClick={() => setIsOpen(!isOpen)}
            style={{ marginBottom: "20px" }}
          >
            {isOpen ? "Fechar Menu" : "Abrir Menu"}
          </button>

          <Routes>
            {/* Home vazio */}
            <Route path="/" element={<div></div>} />

            {/* Adicionar Fichas mostra PainelDocente */}
            <Route path="/adicionar" element={<PainelDocente />} />

            {/* Minhas Disciplinas */}
            <Route path="/disciplinas" element={<MinhasDisciplinas />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
};

export default App;
