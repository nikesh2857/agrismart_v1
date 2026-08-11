import "dotenv/config";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import { WebSocketServer } from "ws";
import http from "http";
import multer from "multer";
import fs from "fs";
import helmet from "helmet";
import morgan from "morgan";
import cors from "cors";
import authRoutes from "./src/backend/routes/auth.routes";
import jobRoutes from "./src/backend/routes/job.routes";
import notificationRoutes from "./src/backend/routes/notification.routes";
import marketplaceRoutes from "./src/backend/routes/marketplace.routes";
import equipmentRoutes from "./src/backend/routes/equipment.routes";
import { errorHandler } from "./src/backend/middlewares/error.middleware";
import { initSocket } from "./src/backend/config/socket";
import { fetchWeather } from "./src/backend/services/weather.service";
import { requireAuth } from "./src/backend/middlewares/auth.middleware";
import { aiVisionRateLimiter, aiChatRateLimiter } from "./src/backend/middlewares/rateLimiter.middleware";
import adminRoutes from "./src/backend/routes/admin.routes";
import taskRoutes from './src/backend/routes/task.routes';
import marketRoutes from './src/backend/routes/market.routes';
import erpRoutes from './src/backend/routes/erp.routes';
import diseaseRoutes from './src/backend/routes/disease.routes';
import aiRoutes from "./src/backend/routes/ai.routes";
import recommendationRoutes from "./src/backend/routes/recommendation.routes";
import recommendationAdminRoutes from "./src/backend/routes/recommendation.admin.routes";
import { swaggerSpec } from "./src/backend/config/swagger";
import swaggerUi from "swagger-ui-express";
import { recordAiInteraction } from "./src/backend/services/aiHistory.service";

const upload = multer({ dest: "uploads/" });

// Initialize GenAI
let ai: GoogleGenAI;
try {
  ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
} catch (e) {
  console.warn("GEMINI_API_KEY not set or invalid.");
}

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const wss = new WebSocketServer({ noServer: true });
  const PORT = process.env.PORT || 3000;

  server.on('upgrade', (request, socket, head) => {
    const pathname = request.url ? request.url.split('?')[0] : '';
    if (pathname === '/live') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
  });

  // Initialize Socket.IO for real-time notifications
  initSocket(server);

  // Security & Logging Middleware
  app.use(helmet({
    contentSecurityPolicy: false, // Vite needs inline scripts in dev
  }));
  app.use(cors({
    origin: true,
    credentials: true,
  }));
  app.use(morgan('dev'));
  
  app.use(express.json({ limit: '50mb' }));

  // Health check
  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });


  // Mount Backend API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/jobs', jobRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api', marketplaceRoutes);  // /api/products and /api/orders
  app.use('/api/equipment', equipmentRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/market-rates', marketRoutes);
  app.use('/api/erp', erpRoutes);
  app.use('/api/disease', diseaseRoutes);
  app.use('/api/ai', aiRoutes);
  app.use('/api/tasks', taskRoutes);
  app.use('/api/recommendations', recommendationRoutes);
  app.use('/api/admin/recommendations', recommendationAdminRoutes);

  // Swagger UI — interactive API docs
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { background-color: #1a7a4a; }',
    customSiteTitle: 'AgriSmart API Docs',
  }));
  // Raw OpenAPI spec endpoint
  app.get('/api-spec.json', (_req, res) => res.json(swaggerSpec));

  // Helper to extract text from interaction
  const getOutputText = (interaction: any) => {
    let fullOutput = "";
    for (const step of interaction.steps) {
      if (step.type === 'model_output') {
        const textContent = step.content?.find((c: any) => c.type === 'text');
        if (textContent && textContent.text) {
          fullOutput += textContent.text;
        }
      }
    }
    return fullOutput;
  };


  // Weather – Redis cached
  app.get('/api/weather', async (req, res) => {
    try {
      const { query, lat, lon } = req.query as { query?: string; lat?: string; lon?: string };
      const { data } = await fetchWeather({ query, lat, lon });
      res.json(data);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });


  // 1. Chatbot (Multi-turn) — rate limited
  app.post("/api/chat", requireAuth, aiChatRateLimiter, async (req, res) => {
    try {
      const { input, previousInteractionId, usePro } = req.body;
      let text = "";
      let interactionId = previousInteractionId || "session-" + Date.now();

      if (process.env.OPENROUTER_API_KEY) {
        const { default: OpenAI } = await import("openai");
        const openai = new OpenAI({ 
          apiKey: process.env.OPENROUTER_API_KEY,
          baseURL: "https://openrouter.ai/api/v1"
        });
        
        const response = await openai.chat.completions.create({
          model: usePro ? "anthropic/claude-3-haiku" : "meta-llama/llama-3-8b-instruct:free",
          messages: [{ role: "user", content: input }],
          max_tokens: 150, 
        });
        
        text = response.choices[0]?.message?.content || "";
      } else if (process.env.GROQ_API_KEY) {
        const { default: OpenAI } = await import("openai");
        const openai = new OpenAI({ 
          apiKey: process.env.GROQ_API_KEY,
          baseURL: "https://api.groq.com/openai/v1"
        });
        
        const response = await openai.chat.completions.create({
          model: usePro ? "llama-3.3-70b-versatile" : "llama-3.1-8b-instant",
          messages: [{ role: "user", content: input }],
          max_tokens: 150, 
        });
        
        text = response.choices[0]?.message?.content || "";
      } else if (process.env.OPENAI_API_KEY) {
        const { default: OpenAI } = await import("openai");
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        
        const response = await openai.chat.completions.create({
          model: usePro ? "gpt-4o" : "gpt-4o-mini",
          messages: [{ role: "user", content: input }],
          max_tokens: 150, // limit response to save credits as requested
        });
        
        text = response.choices[0]?.message?.content || "";
      } else {
        const model = usePro ? "gemini-3.1-pro-preview" : "gemini-3.5-flash";
        const interaction = await ai.interactions.create({
          model,
          input,
          previous_interaction_id: previousInteractionId,
          store: true,
        });
        text = getOutputText(interaction);
        interactionId = interaction.id;
      }
      
      // Persist to AI history (non-blocking)
      recordAiInteraction({ userId: req.user!.id, type: 'CHAT', prompt: input, responseSummary: text });
      res.json({ text, interactionId });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 2. Low latency
  app.post("/api/quick-tips", async (req, res) => {
    try {
      const { input } = req.body;
      const interaction = await ai.interactions.create({
        model: "gemini-3.1-flash-lite",
        input,
      });
      res.json({ text: getOutputText(interaction) });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 3. Search Grounding — rate limited
  app.post("/api/search", requireAuth, aiChatRateLimiter, async (req, res) => {
    try {
      const { input } = req.body;
      const interaction = await ai.interactions.create({
        model: "gemini-3.5-flash",
        input,
        tools: [{ type: 'google_search' }],
      });
      const text = getOutputText(interaction);
      recordAiInteraction({ userId: req.user!.id, type: 'SEARCH', prompt: input, responseSummary: text });
      res.json({ text });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 4. Maps Grounding
  app.post("/api/maps", async (req, res) => {
    try {
      const { input } = req.body;
      const interaction = await ai.interactions.create({
        model: "gemini-3.5-flash",
        input,
        tools: [{ type: 'google_maps' }],
      });
      res.json({ text: getOutputText(interaction) });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 5. Generate high-quality images — rate limited
  app.post("/api/generate-image", requireAuth, aiVisionRateLimiter, async (req, res) => {
    try {
      const { prompt, size } = req.body; // size: "1K" | "2K" | "4K"
      const interaction = await ai.interactions.create({
        model: "gemini-3-pro-image-preview",
        input: prompt,
        response_modalities: ['image', 'text'],
        generation_config: {
          image_config: {
            aspect_ratio: "1:1",
            image_size: size || "1K"
          },
        },
      });
      
      let imageUrl = null;
      for (const step of interaction.steps) {
        if (step.type === 'model_output') {
          const imageContent: any = step.content?.find((c: any) => c.type === 'image');
          if (imageContent && imageContent.data) {
            const base64EncodeString = imageContent.data;
            const mimeType = imageContent.mime_type || 'image/png';
            imageUrl = `data:${mimeType};base64,${base64EncodeString}`;
          }
        }
      }
      res.json({ imageUrl, text: getOutputText(interaction) });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 6. Analyze Image — rate limited (5/day)
  app.post("/api/analyze-image", requireAuth, aiVisionRateLimiter, upload.single("image"), async (req, res) => {
    try {
      if (!req.file) throw new Error("No image uploaded");
      const fileBuffer = fs.readFileSync(req.file.path);
      const base64Image = fileBuffer.toString("base64");
      const prompt = req.body.prompt || "Analyze this image in detail.";
      const interaction = await ai.interactions.create({
        model: "gemini-3.1-pro-preview",
        input: [
          { type: "image", mime_type: req.file.mimetype, data: base64Image },
          { type: "text", text: prompt }
        ]
      });
      fs.unlinkSync(req.file.path);
      const text = getOutputText(interaction);
      recordAiInteraction({ userId: req.user!.id, type: 'VISION', prompt, responseSummary: text });
      res.json({ text });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 7. Analyze Video — rate limited (5/day)
  app.post("/api/analyze-video", requireAuth, aiVisionRateLimiter, upload.single("video"), async (req, res) => {
    try {
      if (!req.file) throw new Error("No video uploaded");
      // Note: In real production, use GCS URIs for large videos, but for demo we try base64.
      // If it's too large, it might fail, but let's send it as base64 or upload to file API if supported.
      const fileBuffer = fs.readFileSync(req.file.path);
      const base64Video = fileBuffer.toString("base64");

      const interaction = await ai.interactions.create({
        model: "gemini-3.1-pro-preview",
        input: [
          {
            type: "video",
            mime_type: req.file.mimetype,
            data: base64Video,
          },
          {
            type: "text",
            text: req.body.prompt || "Analyze this video in detail.",
          }
        ]
      });

      fs.unlinkSync(req.file.path);
      res.json({ text: getOutputText(interaction) });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 8. Animate Image (Video Gen) — rate limited (5/day)
  app.post("/api/animate-image", requireAuth, aiVisionRateLimiter, upload.single("image"), async (req, res) => {
    try {
      if (!req.file) throw new Error("No image uploaded");
      const fileBuffer = fs.readFileSync(req.file.path);
      const base64Image = fileBuffer.toString("base64");
      
      const { prompt, aspectRatio } = req.body;

      const interaction = await ai.interactions.create({
        model: "veo-3.1-fast-generate-preview",
        input: [
          {
            type: "image",
            mime_type: req.file.mimetype,
            data: base64Image,
          },
          {
            type: "text",
            text: prompt || "Animate this image.",
          }
        ],
        background: false,
        store: false,
        stream: false,
        response_format: {
          type: "video",
          aspect_ratio: aspectRatio || "16:9",
        }
      }, { timeout: 300000 });

      let videoUrl = null;
      const videoPart = interaction.output_video as any;
      if (videoPart && videoPart.data) {
        videoUrl = `data:${videoPart.mime_type || 'video/mp4'};base64,${videoPart.data}`;
      }

      fs.unlinkSync(req.file.path);
      res.json({ videoUrl, text: getOutputText(interaction) });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // WebSocket Live API
  wss.on("connection", async (clientWs) => {
    try {
      const session = await ai.live.connect({
        model: "gemini-3.1-flash-live-preview",
        callbacks: {
          onmessage: (message: LiveServerMessage) => {
            const audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (audio) clientWs.send(JSON.stringify({ audio }));
            if (message.serverContent?.interrupted) {
              clientWs.send(JSON.stringify({ interrupted: true }));
            }
          },
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
          },
          systemInstruction: "You are a helpful agricultural assistant.",
        },
      });

      clientWs.on("message", (data) => {
        try {
          const { audio } = JSON.parse(data.toString());
          if (audio) {
            session.sendRealtimeInput({
              audio: { data: audio, mimeType: "audio/pcm;rate=16000" },
            });
          }
        } catch (e) {
          console.error("Live API WS parse error:", e);
        }
      });
      
      clientWs.on("close", () => {
        // cleanup if possible
      });
    } catch (e) {
      console.error("Live API Setup failed", e);
      clientWs.close();
    }
  });

  // Serve uploads folder statically
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  // Vite Integration (Development Mode)
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const clientPath = fs.existsSync(path.join(process.cwd(), "dist/client/index.html"))
      ? path.join(process.cwd(), "dist/client")
      : path.join(process.cwd(), "dist");

    app.use(express.static(clientPath));
    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api")) return next();
      res.sendFile(path.join(clientPath, "index.html"));
    });
  }

  // Global Error Handler
  app.use(errorHandler);

  server.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });

  // Graceful shutdown
  const shutdown = () => {
    console.log('\nGracefully shutting down...');
    server.close(() => {
      console.log('HTTP server closed.');
      // Prisma and Redis are gracefully closed in their respective singletons or via process events
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

startServer();
