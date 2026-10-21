# Gemini TTS Studio 🎙️

Aplicativo de alta fidelidade para conversão de texto em fala (TTS) utilizando a tecnologia **Gemini 3.8 Flash TTS** do Google.

## ✨ Recursos

- **Vozes de Estúdio Gemini**: Incluindo a voz **Neno**, além de Kore, Puck, Charon, Fenrir, Zephyr e Aoede.
- **Sotaques Regionais Brasileiros**: Carioca, Paranaense, Paulistano, Nordestino, Baiano, Pernambucano, Cearense, Gaúcho, Mineiro, Manauara e Neutro.
- **Tags de Estilo & Emoção**: `[alegre]`, `[confiante]`, `[calma]`, `[brava]`, `[pausada]`, `[animada]`, `[sussurrada]`, `[formal]`, `[dramática]`, `[curiosa]`, `[épico]`, `[amigável]`.
- **Barra de Progresso Visual**: Acompanhamento do processamento de áudio em tempo real com 4 etapas.
- **Controle de Velocidade**: Ajustes rápidos (0.5x até 2.0x) e controle contínuo.
- **Reprodutor Integrado**: Visualizador de frequências (waveform), repetição em loop e download em formato `.wav` (24kHz).
- **Histórico**: Armazenamento local das falas geradas.

---

## 🚀 Como Executar Localmente

### 1. Pré-requisitos
- **Node.js** (versão 18 ou superior)
- **NPM** instalado
- Chave de API do Gemini (**GEMINI_API_KEY**) obtida no [Google AI Studio](https://aistudio.google.com/)

### 2. Instalação
Clone ou extraia os arquivos do projeto e instale as dependências:

```bash
npm install
```

### 3. Configurar a Chave de API
Crie um arquivo `.env` na raiz do projeto com sua chave:

```env
GEMINI_API_KEY="SUA_CHAVE_AQUI"
PORT=3000
```

### 4. Iniciar o Servidor de Desenvolvimento
Execute:

```bash
npm run dev
```

Abra o navegador em: [http://localhost:3000](http://localhost:3000)

---

## 🛠️ Tecnologias
- **Frontend**: React 19, Tailwind CSS v4, Lucide Icons
- **Backend**: Node.js, Express, Vite (Middleware Mode)
- **SDK**: `@google/genai` (Gemini 3.8 Flash TTS)
