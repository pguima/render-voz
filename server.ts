import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import JSZip from 'jszip';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

function getPort(): number {
  const portArgIndex = process.argv.indexOf('--port');
  if (portArgIndex !== -1 && process.argv[portArgIndex + 1]) {
    return Number(process.argv[portArgIndex + 1]);
  }
  if (process.env.NODE_ENV === 'production') {
    return Number(process.env.PORT) || 3000;
  }
  return 3000;
}

const PORT = getPort();
const isProduction = process.env.NODE_ENV === 'production';

app.use(express.json({ limit: '10mb' }));

// Initialize GoogleGenAI client
const apiKey = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({
  apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Accent descriptions in Portuguese for high-fidelity speech synthesis
const ACCENT_DESCRIPTIONS: Record<string, string> = {
  carioca: 'Sotaque carioca autêntico do Rio de Janeiro: chiado clássico nas consoantes "s" e "x" (som /ʃ/), vogais abertas, entonação descontraída, melódica e expressiva.',
  paranaense: 'Sotaque paranaense típico de Curitiba e Paraná: pronúncia clara e marcada da vogal "e" fechada no final das palavras, cadência limpa e ritmo equilibrado.',
  paulistano: 'Sotaque paulistano da cidade de São Paulo: dicção urbana, entonação marcante característica da capital com ritmo ágil e "r" forte e articulado.',
  nordestino: 'Sotaque nordestino geral: entonação calorosa, ritmo melódico e musical, vogais bem abertas e expressividade acolhedora.',
  baiano: 'Sotaque baiano de Salvador e Bahia: ritmo cadenciado, sossegado, cantado e relaxado, extremamente acolhedor e com modulações suaves.',
  pernambucano: 'Sotaque pernambucano do Recife e região: ritmo sincopado, consoantes oclusivas "t" e "d" abertas e marcadas, entonação vibrante e autêntica.',
  cearense: 'Sotaque cearense de Fortaleza e Ceará: cadência rápida, ritmo falado ágil e expressivo, entonação bem característica e animada.',
  gaucho: 'Sotaque gaúcho do Rio Grande do Sul: ritmo pampeano tradicional, entonação sulista marcante, firmeza na pronúncia e cadência típica.',
  mineiro: 'Sotaque mineiro acolhedor de Minas Gerais: ritmo sossegado, entonação cantadinha suave, aconchegante e afetuoso.',
  manauara: 'Sotaque manauara e amazônico do Norte: ritmo suave, tranquilo e cadenciado, com musicalidade regional da Amazônia.',
  neutro: 'Português brasileiro padrão culto e neutro: dicção límpida, sem regionalismos predominantes, clareza profissional.'
};

// Emotional tone descriptions
const TAG_DESCRIPTIONS: Record<string, string> = {
  brava: 'Tom bravo, irritado, enérgico, impaciente, tom ríspido e incisivo com autoridade nervosa.',
  alegre: 'Tom alegre, vibrante, sorridente, entusiasmado, luminoso e contagiante.',
  calma: 'Tom calmo, sereno, paciente, aveludado, suave e profundamente reconfortante.',
  confiante: 'Tom confiante, seguro, firme, determinado, profissional e com forte liderança.',
  pausada: 'Cadência pausada, lenta e meditativa, com respirações e pausas deliberadas entre ideias.',
  animada: 'Tom super animado, enérgico, eufórico, dinâmico e empolgante.',
  sussurrada: 'Tom sussurrado, íntimo, próximo ao microfone, em tom de segredo e tranquilidade.',
  formal: 'Tom formal, corporativo, sério, respeitoso e sóbrio, estilo locutor institucional.',
  dramatica: 'Interpretação dramática, teatral, emotiva, cheia de suspense e profundidade.',
  curiosa: 'Tom curioso, questionador, intrigado e estimulante, despertando interesse.',
  epico: 'Tom épico cinematográfico, voz imponente, profunda, majestosa e inspiradora.',
  amigavel: 'Tom amigável, acolhedor, coloquial e natural, como uma conversa sincera de café.'
};

// API Status & Configuration Check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    hasApiKey: !!process.env.GEMINI_API_KEY,
    model: 'gemini-3.8-flash-tts',
  });
});

// Endpoint to download all project source code as a ZIP
app.get('/api/project/download-zip', async (_req, res) => {
  try {
    const zip = new JSZip();
    const rootDir = __dirname;
    const ignoreDirs = new Set(['node_modules', '.git', 'dist', '.cache']);

    function addDirectoryToZip(dirPath: string, zipFolder: JSZip) {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      for (const entry of entries) {
        if (ignoreDirs.has(entry.name)) continue;
        const fullPath = path.join(dirPath, entry.name);
        if (entry.isDirectory()) {
          const subFolder = zipFolder.folder(entry.name);
          if (subFolder) {
            addDirectoryToZip(fullPath, subFolder);
          }
        } else if (entry.isFile()) {
          // Exclude real secrets like .env
          if (entry.name === '.env') continue;
          const content = fs.readFileSync(fullPath);
          zipFolder.file(entry.name, content);
        }
      }
    }

    addDirectoryToZip(rootDir, zip);

    const buffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="gemini-tts-studio-project.zip"'
    );
    res.setHeader('Content-Length', buffer.length.toString());
    res.send(buffer);
  } catch (err: any) {
    console.error('Erro ao gerar ZIP do projeto:', err);
    res.status(500).json({ error: 'Falha ao empacotar arquivos do projeto em ZIP.' });
  }
});

// Voice synthesis endpoint
app.post('/api/tts/generate', async (req, res) => {
  try {
    const {
      text,
      language = 'pt-BR',
      voiceName = 'Kore',
      tags = [],
      accent = 'neutro',
      customPrompt = '',
      speed = 1.0,
    } = req.body;

    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'Texto para conversão é obrigatório.' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: 'Chave de API do Gemini não configurada no servidor (GEMINI_API_KEY).',
      });
    }

    // Build style directives
    const styleParts: string[] = [];

    // Language directive
    if (language === 'pt-BR') {
      styleParts.push('Fale em Português do Brasil com pronúncia impecável.');
      if (accent && ACCENT_DESCRIPTIONS[accent]) {
        styleParts.push(ACCENT_DESCRIPTIONS[accent]);
      }
    } else if (language === 'en-US') {
      styleParts.push('Speak in American English with clear natural pronunciation.');
    } else if (language === 'es-ES') {
      styleParts.push('Habla en español neutro con pronunciación clara y natural.');
    } else if (language === 'fr-FR') {
      styleParts.push('Parlez en français avec une prononciation claire et naturelle.');
    } else if (language === 'de-DE') {
      styleParts.push('Sprechen Sie auf Deutsch mit klarer Aussprache.');
    } else if (language === 'it-IT') {
      styleParts.push('Parla in italiano con pronuncia naturale ed espressiva.');
    } else if (language === 'ja-JP') {
      styleParts.push('自然で明瞭な発音の日本語で話してください。');
    }

    // Emotion & Tone tags
    if (Array.isArray(tags) && tags.length > 0) {
      const tagDirectives = tags
        .map((tag: string) => TAG_DESCRIPTIONS[tag] || tag)
        .join(' ');
      styleParts.push(`Expressão e tom emocional: ${tagDirectives}`);
    }

    // Speed cadence hint if significantly non-standard
    if (speed < 0.85) {
      styleParts.push('Ritmo de fala mais lento e compassado.');
    } else if (speed > 1.25) {
      styleParts.push('Ritmo de fala dinâmico e acelerado.');
    }

    if (customPrompt && typeof customPrompt === 'string' && customPrompt.trim()) {
      styleParts.push(customPrompt.trim());
    }

    const compiledStyle = styleParts.join(' ');

    const validVoice = ['Neno', 'Kore', 'Puck', 'Charon', 'Fenrir', 'Zephyr', 'Aoede'].includes(voiceName)
      ? voiceName
      : 'Neno';

    // Call Gemini 3.8 Flash TTS
    let response;
    let usedModel = 'gemini-3.8-flash-tts';

    try {
      response = await ai.models.generateContent({
        model: 'gemini-3.8-flash-tts',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: text.trim(),
                speechMetadata: {
                  style: compiledStyle,
                },
              },
            ],
          },
        ],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: validVoice },
            },
          },
        },
      });
    } catch (primaryError: any) {
      console.warn('Erro ao chamar gemini-3.8-flash-tts, tentando gemini-3.8-flash-lite-tts:', primaryError?.message);
      // Fallback to flash-lite-tts if primary model is unavailable or rate limited
      usedModel = 'gemini-3.8-flash-lite-tts';
      response = await ai.models.generateContent({
        model: 'gemini-3.8-flash-lite-tts',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: text.trim(),
                speechMetadata: {
                  style: compiledStyle,
                },
              },
            ],
          },
        ],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: validVoice },
            },
          },
        },
      });
    }

    // Extract audio inline data
    let base64Audio: string | null = null;
    let mimeType = 'audio/wav';

    const parts = response.candidates?.[0]?.content?.parts || [];
    for (const part of parts) {
      if (part.inlineData?.data) {
        base64Audio = part.inlineData.data;
        if (part.inlineData.mimeType) {
          mimeType = part.inlineData.mimeType;
        }
        break;
      }
    }

    if (!base64Audio) {
      return res.status(502).json({
        error: 'Nenhum dado de áudio foi retornado pela API Gemini.',
        details: response.candidates?.[0]?.finishReason,
      });
    }

    return res.json({
      success: true,
      audioBase64: base64Audio,
      mimeType,
      modelUsed: usedModel,
      styleApplied: compiledStyle,
      voiceName: validVoice,
      charactersCount: text.length,
      wordsCount: text.trim().split(/\s+/).length,
    });
  } catch (error: any) {
    console.error('Erro na síntese TTS Gemini:', error);
    return res.status(500).json({
      error: error?.message || 'Falha ao processar conversão de texto em fala.',
    });
  }
});

// Vite middleware or static serving
async function setupServer() {
  if (!isProduction) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
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

  app.listen(PORT, () => {
    console.log(`\n  VITE v8.3.4  ready in 120 ms\n\n  ➜  Local:   http://localhost:${PORT}/\n  ➜  Network: http://localhost:${PORT}/\n`);
  });
}

setupServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
