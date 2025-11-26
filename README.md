# Creative Studio - AI Image Generation

A minimal, elegant web app for comparing AI image generation across multiple models through a webhook API.

## Features

- 🎨 Side-by-side comparison of 3 AI models (Nano Banana Pro, Gemini 2.5, Ideogram)
- 🔄 Hybrid generation flow with optional follow-up questions
- 📊 Per-model progress indicators and metadata display
- 💾 Copy prompt and download image functionality
- 🛠️ Developer debug drawer for webhook inspection
- 📱 Fully responsive design
- ♿ Accessible UI with proper ARIA labels

## Configuration

Provide the webhook URL via an environment variable (`VITE_WEBHOOK_URL`) or update `src/pages/Index.tsx`:

Set an environment variable in a `.env` file at the project root:

```bash
# .env
VITE_WEBHOOK_URL="https://your-webhook-endpoint.com/generate"
```

Or update the file directly (fallback placeholder remains):

```typescript
const WEBHOOK_URL = import.meta.env.VITE_WEBHOOK_URL || "https://your-webhook-endpoint.com/generate";
```

## Webhook API Contract

### Initial Generation Request

```json
{
  "prompt": "A futuristic cityscape at sunset",
  "models": ["nano_banana_pro", "gemini_25", "ideogram"]
}
```

### Response: Follow-up Questions

```json
{
  "status": "followup",
  "session_id": "abc123",
  "questions": [
    {
      "id": "q1",
      "text": "What style do you prefer?",
      "options": [
        { "label": "Photorealistic", "value": "photo" },
        { "label": "Artistic", "value": "art" }
      ]
    }
  ]
}
```

### Answer Questions Request

```json
{
  "session_id": "abc123",
  "answers": {
    "q1": "photo"
  }
}
```

### Response: Final Images

```json
{
  "status": "done",
  "results": [
    {
      "model": "nano_banana_pro",
      "image_url": "https://...",
      "seed": 12345,
      "prompt_used": "Enhanced prompt text"
    }
  ]
}
```

## Development

```bash
npm install
npm run dev
```

## Technologies

- React + TypeScript
- Tailwind CSS
- shadcn/ui components
- Vite

## Project URL

https://lovable.dev/projects/163377c4-27a4-45d4-87c5-61a44aeae190
