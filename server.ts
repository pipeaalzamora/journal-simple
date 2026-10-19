import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
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

  const apiKey = process.env.GEMINI_API_KEY;
  const ai = new GoogleGenAI({
    apiKey: apiKey || '',
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  // Database Connection Status Endpoint
  app.get('/api/db/status', async (_req, res) => {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      return res.json({
        provider: 'firestore',
        mongodbConfigured: false,
        connected: false,
        message: 'MONGODB_URI no configurado en variables de entorno. Usando Firestore y almacenamiento local.',
      });
    }

    const db = await getMongoDb();
    if (!db) {
      return res.json({
        provider: 'firestore',
        mongodbConfigured: true,
        connected: false,
        message: 'MONGODB_URI configurado pero no se pudo conectar. Verifica credenciales y red.',
      });
    }

    return res.json({
      provider: 'mongodb',
      mongodbConfigured: true,
      connected: true,
      message: 'Base de datos MongoDB conectada y activa.',
    });
  });

  // MongoDB Entries CRUD Endpoints
  app.get('/api/entries', async (_req, res) => {
    try {
      const db = await getMongoDb();
      if (!db) {
        return res.json({ entries: [], usingMongo: false });
      }
      const collection = db.collection('entries');
      const docs = await collection.find({}).sort({ createdAt: -1 }).toArray();
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
      if (!entry || !entry.id) {
        return res.status(400).json({ error: 'Entrada sin identificador válido' });
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

  // API Route for Daily Writing Inspiration (Gemini)
  app.post('/api/inspiration', async (req, res) => {
    try {
      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({
          error: 'GEMINI_API_KEY no está configurada.',
        });
      }

      const { category, mood } = req.body || {};

      let contextPrompt =
        'Genera un disparador de escritura íntimo, filosófico y evocador para una persona frente a la hoja en blanco de su diario personal.';

      if (category && category !== 'Aleatorio') {
        contextPrompt += ` Enfoque temático solicitado: ${category}.`;
      }
      if (mood) {
        contextPrompt += ` Estado de ánimo actual del autor: ${mood}.`;
      }

      const schemaConfig = {
        systemInstruction:
          "Eres un acompañante literario reflexivo y poético para un diario personal íntimo en blanco y negro llamado 'Tinta'. Tu tono es introspectivo, honesto, sereno y estimulante, que invite a la observación y a la calma. Evita clichés motivacionales baratos. Escribe siempre en español.",
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            prompt: {
              type: Type.STRING,
              description:
                'Pregunta o disparador de pensamiento breve para invitar a la escritura (1 o 2 oraciones evocadoras).',
            },
            theme: {
              type: Type.STRING,
              description:
                'Concepto central o tema en mayúsculas breves (ej: EL PASO DEL TIEMPO, LA CALMA DE LA MAÑANA, UN RECUERDO SENSORIAL).',
            },
            suggestedTitle: {
              type: Type.STRING,
              description: 'Sugerencia de título breve para la entrada (máximo 4 palabras).',
            },
            quote: {
              type: Type.STRING,
              description:
                'Un aforismo o pensamiento poético breve que acompañe la reflexión (1 frase).',
            },
            suggestedTag: {
              type: Type.STRING,
              description: 'Una etiqueta temática corta sin numeral (ej: introspección, memoria, gratitud).',
            },
          },
          required: ['prompt', 'theme', 'suggestedTitle', 'quote', 'suggestedTag'],
        },
      };

      let responseText = '';
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: contextPrompt,
          config: schemaConfig,
        });
        responseText = response.text?.trim() || '';
      } catch (firstErr: any) {
        console.warn('Primary model error, trying gemini-flash-latest:', firstErr?.message);
        const fallbackResponse = await ai.models.generateContent({
          model: 'gemini-flash-latest',
          contents: contextPrompt,
          config: schemaConfig,
        });
        responseText = fallbackResponse.text?.trim() || '';
      }

      const parsedData = JSON.parse(responseText);
      return res.json(parsedData);
    } catch (error: any) {
      console.warn('Gemini inspiration fallback used:', error?.message);
      return res.json({
        theme: 'EL DETALLE INADVERTIDO',
        suggestedTitle: 'La mirada atenta',
        prompt:
          '¿Qué pequeño suceso o sensación de tu día pasó desapercibido para los demás, pero dejó una huella en tus pensamientos?',
        quote: '«Escribir no es más que el intento de recordar lo que aún no hemos vivido.»',
        suggestedTag: 'introspección',
      });
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
