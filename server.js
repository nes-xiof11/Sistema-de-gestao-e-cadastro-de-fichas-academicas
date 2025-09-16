// server.js adaptado para MySQL com suas tabelas reais
const express = require("express");
const mysql = require("mysql2");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const fs = require("fs");
const pdfParse = require("pdf-parse");
const bcrypt = require("bcryptjs");
const path = require("path");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

const SECRET_KEY = "minha_chave_super_secreta";

// Pasta de uploads
// const UPLOAD_DIR = path.join(__dirname, "uploads");
// if (!fs.existsSync(UPLOAD_DIR)) {
//   fs.mkdirSync(UPLOAD_DIR);
// }
// const storage = multer.diskStorage({
//   destination: (req, file, cb) => cb(null, UPLOAD_DIR),
//   filename: (req, file, cb) => {
//     const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
//     cb(null, `${unique}${path.extname(file.originalname)}`);
//   },
// });
// const upload = multer({ storage });

// ---------- Conexão MySQL ----------
const db = mysql.createConnection({
  host: "localhost",
  user: "root", // ajuste para seu MySQL
  password: "", // ajuste sua senha
  database: "sistema_academico", // ajuste para seu banco
});

db.connect((err) => {
  if (err) throw err;
  console.log("Conectado ao MySQL");
});

// ---------- Middleware ----------
function authMiddleware(req, res, next) {
  const authHeader = req.headers["authorization"];
  if (!authHeader) return res.status(401).json({ error: "Token ausente" });

  const [bearer, token] = authHeader.split(" ");
  if (bearer !== "Bearer" || !token) return res.status(401).json({ error: "Formato de token inválido" });

  try {
    req.user = jwt.verify(token, SECRET_KEY);
    next();
  } catch (err) {
    return res.status(401).json({ error: "Token inválido ou expirado" });
  }
}

// ---------- Auth ----------
app.post("/register", (req, res) => {
  const { nome, codigo, tipo, password } = req.body;
  if (!nome || !codigo || !tipo || !password)
    return res.status(400).json({ error: "nome, codigo, tipo e password são obrigatórios" });

  const hashed = bcrypt.hashSync(password, 8);

  db.query("INSERT INTO usuario (nome, codigo, tipo) VALUES (?, ?, ?)", [nome, codigo, tipo], (err, result) => {
    if (err) return res.status(400).json({ error: "Erro ao registrar usuário: " + err.message });

    // opcional: tabela auxiliar users_auth (se quiser separar senha)
    db.query(
      "INSERT INTO users_auth (usuario_id, password) VALUES (?, ?)",
      [result.insertId, hashed],
      (err2) => {
        if (err2) console.warn("Aviso: senha não salva em users_auth (crie essa tabela se quiser separar credenciais).");
      }
    );

    res.json({ message: "Usuário registrado com sucesso", id: result.insertId });
  });
});

app.post("/login", (req, res) => {
  const { codigo, password } = req.body;
  db.query("SELECT * FROM usuario WHERE codigo = ?", [codigo], (err, rows) => {
    if (err) return res.status(500).json({ error: "Erro no servidor" });
    if (rows.length === 0) return res.status(401).json({ error: "Usuário não encontrado" });

    const user = rows[0];

    // verificar senha (se estiver em tabela separada)
    db.query("SELECT password FROM users_auth WHERE usuario_id = ?", [user.id], (err2, passRows) => {
      if (err2 || passRows.length === 0) return res.status(401).json({ error: "Senha não encontrada" });

      const valid = bcrypt.compareSync(password, passRows[0].password);
      if (!valid) return res.status(401).json({ error: "Credenciais inválidas" });

      const token = jwt.sign({ id: user.id, nome: user.nome, tipo: user.tipo }, SECRET_KEY, { expiresIn: "6h" });
      res.json({ token });
    });
  });
});

// ---------- Upload Fichas ----------
async function extractContent(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".pdf") {
    const data = await pdfParse(fs.readFileSync(filePath));
    return data.text;
  } else if (ext === ".txt") {
    return fs.readFileSync(filePath, "utf8");
  }
  throw new Error("Formato não suportado (use PDF ou TXT)");
}

app.post("/fichas", authMiddleware, upload.single("ficha"), async (req, res) => {
  if (req.user.tipo !== "professor") return res.status(403).json({ error: "Apenas professores podem enviar fichas" });

  try {
    const { titulo, id_disciplina } = req.body;
    if (!req.file) return res.status(400).json({ error: "Nenhum arquivo enviado" });

    const conteudo = await extractContent(req.file.path);
    fs.unlinkSync(req.file.path);

    db.query(
      "INSERT INTO ficha (titulo, conteudo, id_disciplina) VALUES (?, ?, ?)",
      [titulo, conteudo, id_disciplina],
      (err, result) => {
        if (err) return res.status(500).json({ error: "Erro ao salvar ficha: " + err.message });
        res.json({ message: "Ficha salva", ficha_id: result.insertId });
      }
    );
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ---------- Pesquisa de Fichas ----------
app.get("/search", authMiddleware, (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: "Query vazia" });

  const like = `%${q}%`;
  db.query("SELECT * FROM ficha WHERE titulo LIKE ? OR conteudo LIKE ?", [like, like], (err, rows) => {
    if (err) return res.status(500).json({ error: "Erro na pesquisa" });
    res.json(rows);
  });
});

// ---------- Dúvidas e Respostas ----------
app.post("/duvida", authMiddleware, (req, res) => {
  const { descricao } = req.body;
  db.query("INSERT INTO duvida (descricao, id_usuario) VALUES (?, ?)", [descricao, req.user.id], (err, result) => {
    if (err) return res.status(500).json({ error: "Erro ao registrar dúvida" });
    res.json({ message: "Dúvida registrada", id: result.insertId });
  });
});

app.post("/resposta", authMiddleware, (req, res) => {
  const { pagina, trecho, id_ficha, id_duvida } = req.body;
  db.query(
    "INSERT INTO resposta (pagina, trecho, id_ficha, id_duvida) VALUES (?, ?, ?, ?)",
    [pagina, trecho, id_ficha, id_duvida],
    (err, result) => {
      if (err) return res.status(500).json({ error: "Erro ao salvar resposta" });
      res.json({ message: "Resposta registrada", id: result.insertId });
    }
  );
});

app.post("/disciplinas", (req, res)=> {
  const {codigo, nome, ano, semestre} = req.body;
  db.query("INSERT INTO disciplinas(codigo,nome, ano, semestre) values(?, ?, ?, ?)",
  [codigo, nome, ano, semestre], 
  (err, result) => {
    if (err) return res.status(500).json({ error: "Erro ao salvar disciplina" });
    res.json({ message: " registrada", id: result.insertId })
  }
  )
}) 

app.get("/disciplinas", (req, res) => {
  db.query("SELECT * FROM sistema_academico.disciplinas", (err, rows) => {
    if (err) return res.status(500).json({ error: "Erro na pesquisa" });
    res.json(rows);
  });
})

app.delete("/disciplinas/:codigo", async (req, res) => {
  const {codigo} = req.params
  console.log(codigo)
  db.query("DELETE FROM disciplinas where codigo = ?", [codigo], 
    (err, result) => {
    if (err) return res.status(500).json({ error: "Erro ao eliminar disciplina" });
    res.json({ message: " eliminada", id: result.insertId })
  })
})

// Configurar uploads
const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    const nomeUnico = Date.now() + "-" + file.originalname;
    cb(null, nomeUnico);
  },
});

const upload = multer({ storage });

app.use("/uploads", express.static(path.join(__dirname, "./uploads")));

// Rota para receber ficha
app.post("/fichas", upload.single("ficheiro"), async (req, res) => {
  const { disciplina, tema } = req.body;
  const ficheiro = req.file?.filename;

  if (!disciplina || !tema || !ficheiro) {
    return res.status(400).json({ error: "Campos obrigatórios faltando" });
  }

  try {
    const novaFicha = await prisma.ficha.create({
      data: {
        disciplina,
        tema,
        ficheiro,
      },
    });

    console.log("Ficha salva:", novaFicha);
    res.status(201).json(novaFicha);
  } catch (error) {
    console.error("Erro ao salvar ficha:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
})

// ---------- Start ----------
const PORT = 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
