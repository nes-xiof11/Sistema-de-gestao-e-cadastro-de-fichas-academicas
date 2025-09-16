import React, { useState } from "react";
import "./Painel.css";

const PainelDocente: React.FC = () => {
  const [disciplina, setDisciplina] = useState("");
  const [tema, setTema] = useState("");
  const [ficheiro, setFicheiro] = useState<File | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!disciplina || !tema || !ficheiro) {
      alert("Preencha todos os campos!");
      return;
    }

    const formData = new FormData();
    formData.append("disciplina", disciplina);
    formData.append("tema", tema);
    formData.append("ficheiro", ficheiro);

    try {
      const res = await fetch("http://localhost:3000/fichas", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      console.log("Ficha enviada com sucesso:", data);
      alert("Ficha enviada com sucesso!");

      // limpar campos
      setDisciplina("");
      setTema("");
      setFicheiro(null);
    } catch (err) {
      console.error("Erro ao enviar ficha:", err);
      alert("Erro ao enviar ficha");
    }
  };

  return (
    <div className="painel">
      <h1>PAINEL DO DOCENTE</h1>
      <h2>Adicionar Ficha</h2>
      <form className="form-ficha" onSubmit={handleSubmit}>
        <label>Disciplina:</label>
        <select value={disciplina} onChange={(e) => setDisciplina(e.target.value)}>
          <option value="">Selecione</option>
          <option>Matemática</option>
          <option>Física</option>
          <option>Programação Orientada a Objecto</option>
          <option>Circuitos Eletrônicos</option>
        </select>

        <label>Tema:</label>
        <input
          type="text"
          placeholder="Digite o tema"
          value={tema}
          onChange={(e) => setTema(e.target.value)}
        />

        <label>Ficheiro:</label>
        <input
          type="file"
          onChange={(e) => setFicheiro(e.target.files?.[0] || null)}
        />

        <button type="submit">ENVIAR</button>
      </form>
    </div>
  );
};

export default PainelDocente;


// import React from "react";
// import "./Painel.css";

// // async function handlerSubmit(e) {
// //   e.preventDefault()
// //   try {
// //     const res = await fetch("http://localhost:3000/", {
// //       method: "POST",
// //       headers: {
// //         "Content=Type":" application/json",
// //       },
// //       body: JSON.stringify({})
// //     })

// //   } catch ()
// // }
// const PainelDocente: React.FC = () => {
//   return (
//     <div className="painel">
//       <h1>PAINEL DO DOCENTE</h1>
//       <h2>Adicionar Ficha</h2>
//       <form className="form-ficha">
//         <label>Disciplina:</label>
//         <select>
//           <option>Matemática</option>
//           <option>Física</option>
//           <option>programacao orientada  a objecto</option>
//           <option>circuitos electronicos</option>
//         </select>

//         <label>Tema:</label>
//         <input type="text" placeholder="Digite o tema" />

//         <label>Ficheiro:</label>
//         <input type="file" />

//         <button type="submit">ENVIAR</button>
//       </form>
//     </div>
//   );
// };

// export default PainelDocente;
