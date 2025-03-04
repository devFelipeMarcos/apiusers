import "dotenv/config"; // Para variáveis de ambiente
import { PrismaClient } from "@prisma/client";
import express from "express";
import bcrypt from "bcrypt"; // Para hash de senhas
import cors from "cors"; // Opcional: para permitir acesso de frontend

const app = express();
const db = new PrismaClient();

// Middlewares
app.use(express.json());
app.use(cors()); // Habilita CORS se necessário

// Configurações
const PORT = process.env.PORT || 10000;

// ------------------------------------------
// Middleware de Erro Global
// ------------------------------------------
app.use((err, req, res, next) => {
  console.error("[ERRO GLOBAL]", err);
  res.status(500).json({ error: "Erro interno do servidor" });
});

// ------------------------------------------
// CRUD
// ------------------------------------------

// CREATE
app.post("/users", async (req, res) => {
  const { username, password, name } = req.body;

  // Validação
  if (!username || !password) {
    return res.status(400).json({
      error: "Campos obrigatórios faltando: username e password",
    });
  }

  if (password.length < 6) {
    return res.status(400).json({
      error: "Senha deve ter pelo menos 6 caracteres",
    });
  }

  try {
    // Verifica se usuário já existe
    const existingUser = await db.users.findUnique({
      where: { login: username },
    });

    if (existingUser) {
      return res.status(409).json({ error: "Usuário já existe" });
    }

    // Cria hash da senha
    const hashedPassword = await bcrypt.hash(password, 10);

    // Salva no banco
    const newUser = await db.users.create({
      data: {
        login: username,
        password: hashedPassword,
        name: name,
      },
    });

    // Retorna resposta sem a senha
    const { password: _, ...userData } = newUser;
    return res.status(201).json(userData);
  } catch (error) {
    console.error("[ERRO AO CRIAR USUÁRIO]", error);
    throw error; // O middleware global captura
  }
});

// READ (Todos os usuários)
app.get("/users", async (req, res) => {
  try {
    const users = await db.users.findMany({
      select: { id: true, login: true, name: true }, // Não retorna senha
    });
    return res.json(users);
  } catch (error) {
    console.error("[ERRO AO BUSCAR USUÁRIOS]", error);
    throw error;
  }
});

// UPDATE
app.put("/users/:login", async (req, res) => {
  const { login } = req.params;
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ error: "Campo 'name' é obrigatório" });
  }

  try {
    const updatedUser = await db.users.update({
      where: { login },
      data: { name },
      select: { id: true, login: true, name: true }, // Não retorna senha
    });

    return res.json(updatedUser);
  } catch (error) {
    if (error.code === "P2025") {
      // Erro do Prisma para registro não encontrado
      return res.status(404).json({ error: "Usuário não encontrado" });
    }
    console.error("[ERRO AO ATUALIZAR USUÁRIO]", error);
    throw error;
  }
});

// DELETE
app.delete("/users/:login", async (req, res) => {
  const { login } = req.params;

  try {
    await db.users.delete({ where: { login } });
    return res.status(204).send(); // 204 = No Content
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }
    console.error("[ERRO AO DELETAR USUÁRIO]", error);
    throw error;
  }
});

// ------------------------------------------
// Inicialização do Servidor
// ------------------------------------------
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
