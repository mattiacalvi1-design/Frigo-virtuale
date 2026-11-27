import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'Chiave GEMINI_API_KEY non configurata. Verifica il pannello Secrets.',
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '15mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.post('/api/scan-receipt', async (req, res) => {
    try {
      const { imageBase64, mimeType, barcode, receiptText } = req.body ?? {};
      if (!imageBase64 && !barcode && !receiptText) {
        res.status(400).json({
          error:
            'Invia un’immagine dello scontrino/codice a barre, un codice EAN oppure del testo dello scontrino.',
        });
        return;
      }

      const ai = getGeminiClient();

      const parts: Array<
        | { text: string }
        | { inlineData: { mimeType: string; data: string } }
      > = [];

      if (imageBase64 && mimeType) {
        const cleanedBase64 = String(imageBase64).replace(
          /^data:[^;]+;base64,/,
          '',
        );
        parts.push({
          inlineData: {
            mimeType: String(mimeType),
            data: cleanedBase64,
          },
        });
      }

      const contextPrompt = [
        'Sei un assistente esperto per la gestione del frigorifero domestico in Italia.',
        'Analizza ciò che vedi (foto di uno scontrino del supermercato, foto di un codice a barre/prodotto, codice EAN o testo dello scontrino).',
        barcode ? `Codice a barre rilevato: ${barcode}.` : '',
        receiptText ? `Testo scontrino:\n${receiptText}` : '',
        'Estrai tutti i prodotti alimentari adatti al frigorifero (escludi buste, scontrino, totali, detersivi o prodotti non alimentari).',
        'Per ciascun prodotto restituisci:',
        '- name: nome chiaro e leggibile in italiano (es. "Mozzarella di Bufala", "Zucchine Verdi", "Latte Fresco Intero").',
        '- quantity: numero intero di confezioni/pezzi (minimo 1).',
        '- unit: unità breve in italiano (es. "conf.", "pz", "L", "vaschetta", "g").',
        '- shelf: uno tra "latticini", "verdura", "carne_pesce", "pasta_sughi", "bevande_altro".',
        '- estimatedDays: giorni realistici di conservazione in frigorifero da oggi (es. pesce/carne fresca 2, verdura delicata 3, latticini freschi 5, uova/formaggi stagionati 14, bevande/sughi 7).',
        '- barcode: eventuale codice numerico se leggibile, altrimenti stringa vuota.',
      ]
        .filter(Boolean)
        .join('\n');

      parts.push({ text: contextPrompt });

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: { parts },
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              items: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    quantity: { type: Type.INTEGER },
                    unit: { type: Type.STRING },
                    shelf: { type: Type.STRING },
                    estimatedDays: { type: Type.INTEGER },
                    barcode: { type: Type.STRING },
                  },
                  required: [
                    'name',
                    'quantity',
                    'unit',
                    'shelf',
                    'estimatedDays',
                  ],
                },
              },
              note: { type: Type.STRING },
            },
            required: ['items'],
          },
        },
      });

      const parsed = JSON.parse(response.text ?? '{"items":[]}');
      res.json(parsed);
    } catch (err) {
      console.error('Errore /api/scan-receipt:', err);
      const message =
        err instanceof Error
          ? err.message
          : 'Errore durante l’analisi dello scontrino.';
      res.status(500).json({ error: message });
    }
  });

  app.post('/api/recipes', async (req, res) => {
    try {
      const { items, preference } = req.body ?? {};
      if (!Array.isArray(items) || items.length === 0) {
        res.status(400).json({
          error: 'Aggiungi almeno un prodotto al frigorifero per generare ricette.',
        });
        return;
      }

      const ai = getGeminiClient();

      const inventorySummary = items
        .map(
          (i: { name: string; daysLeft: number; quantity: number; unit: string }) =>
            `- ${i.name} (${i.quantity} ${i.unit}, ${
              i.daysLeft < 0
                ? 'scaduto'
                : i.daysLeft === 0
                  ? 'scade oggi'
                  : `scade tra ${i.daysLeft} giorni`
            })`,
        )
        .join('\n');

      const prompt = [
        'Sei uno chef redattore italiano di cucina casalinga in stile GialloZafferano.',
        'Crea esattamente 3 ricette italiane autentiche, gustose e facili da replicare per consumare PRIMA di tutto gli ingredienti che scadono prima nel frigorifero dell’utente.',
        preference ? `Preferenza richiesta: ${preference}.` : '',
        `Inventario attuale del frigorifero:\n${inventorySummary}`,
        'Per ogni ingrediente indicato nella ricetta, includi un campo fridgeMatchTerm (una singola parola chiave semplice in italiano che corrisponde al nome dell’alimento in frigo, es. "burrata", "zucchin", "pomodor", "salmone").',
        'Scegli category tra: "Primi Piatti", "Secondi", "Contorni", "Dolci & Colazione".',
        'Scegli difficulty tra: "Facile", "Media", "Elaborata".',
      ]
        .filter(Boolean)
        .join('\n\n');

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              recipes: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    subtitle: { type: Type.STRING },
                    category: { type: Type.STRING },
                    prepMinutes: { type: Type.INTEGER },
                    cookMinutes: { type: Type.INTEGER },
                    difficulty: { type: Type.STRING },
                    servings: { type: Type.INTEGER },
                    chefTip: { type: Type.STRING },
                    ingredients: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          name: { type: Type.STRING },
                          amount: { type: Type.STRING },
                          fridgeMatchTerm: { type: Type.STRING },
                        },
                        required: ['name', 'amount', 'fridgeMatchTerm'],
                      },
                    },
                    steps: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                  },
                  required: [
                    'title',
                    'subtitle',
                    'category',
                    'prepMinutes',
                    'cookMinutes',
                    'difficulty',
                    'servings',
                    'chefTip',
                    'ingredients',
                    'steps',
                  ],
                },
              },
            },
            required: ['recipes'],
          },
        },
      });

      const parsed = JSON.parse(response.text ?? '{"recipes":[]}');
      res.json(parsed);
    } catch (err) {
      console.error('Errore /api/recipes:', err);
      const message =
        err instanceof Error
          ? err.message
          : 'Errore nella generazione delle ricette consigliate.';
      res.status(500).json({ error: message });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`FrigoVivo server attivo su http://localhost:${PORT}`);
  });
}

startServer();
