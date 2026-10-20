import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { MongoClient, Db } from 'mongodb';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isProduction = process.env.NODE_ENV === 'production';
const PORT = Number(process.env.PORT) || 3000;

// MongoDB client singleton
let mongoClient: MongoClient | null = null;
let mongoDb: Db | null = null;

async function getMongoDb(): Promise<Db | null> {
  const uri = process.env.MONGODB_URI;
  if (!uri) return null;

  if (mongoDb) return mongoDb;

  try {
    mongoClient = new MongoClient(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    await mongoClient.connect();
    mongoDb = mongoClient.db();
    console.log('MongoDB: Conexión establecida con éxito');
    return mongoDb;
  } catch (err: any) {
    console.warn('MongoDB: No se pudo conectar a la base de datos:', err.message);
    mongoClient = null;
    mongoDb = null;
    return null;
  }
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  // CORS middleware
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*'); // Adjust this to specific origin for security
    res.header('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });


  // Database Connection Status Endpoint
  app.get('/api/db/status', async (_req, res) => {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      return res.json({
        provider: 'firestore',
        mongodbConfigured: false,
        connected: false,
        message: 'MONGODB_URI no configurado. Usando Firestore.',
      });
    }

    const db = await getMongoDb();
    if (!db) {
      return res.json({
        provider: 'firestore',
        mongodbConfigured: true,
        connected: false,
        message: 'MONGODB_URI configurado pero no se pudo conectar.',
      });
    }

    return res.json({
      provider: 'mongodb',
      mongodbConfigured: true,
      connected: true,
      message: 'MongoDB conectado y activo.',
    });
  });

  // MongoDB Entries CRUD Endpoints (filtered by userId or listing all for user)
  app.get('/api/entries', async (req, res) => {
    try {
      const userId = req.query.userId as string;
      const db = await getMongoDb();
      if (!db) {
        return res.json({ entries: [], usingMongo: false });
      }
      const collection = db.collection('entries');
      const query = userId ? { userId } : {};
      const docs = await collection.find(query).sort({ createdAt: -1 }).toArray();
      const entries = docs.map(({ _id, ...rest }) => rest);
      return res.json({ entries, usingMongo: true });
    } catch (err: any) {
      console.warn('MongoDB: Error al listar entradas:', err.message);
      return res.json({ entries: [], usingMongo: false, error: err.message });
    }
  });

  app.post('/api/entries', async (req, res) => {
    try {
      const entry = req.body;
      if (!entry || !entry.id || !entry.userId) {
        return res.status(400).json({ error: 'Entrada sin identificador o usuario válido' });
      }

      const db = await getMongoDb();
      if (!db) {
        return res.json({ saved: false, message: 'MongoDB no conectado' });
      }

      const collection = db.collection('entries');
      await collection.updateOne(
        { id: entry.id },
        { $set: entry },
        { upsert: true }
      );
      return res.json({ saved: true, id: entry.id, target: 'mongodb' });
    } catch (err: any) {
      console.warn('MongoDB: Error al guardar entrada:', err.message);
      return res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/entries/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const db = await getMongoDb();
      if (!db) {
        return res.json({ deleted: false, message: 'MongoDB no conectado' });
      }

      const collection = db.collection('entries');
      await collection.deleteOne({ id });
      return res.json({ deleted: true, id, target: 'mongodb' });
    } catch (err: any) {
      console.warn('MongoDB: Error al eliminar entrada:', err.message);
      return res.status(500).json({ error: err.message });
    }
  });

  // Vite integration: middleware in development, static files in production
  if (!isProduction) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Tinta server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
