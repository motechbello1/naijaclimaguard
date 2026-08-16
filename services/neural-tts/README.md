# NaijaClimaGuard Neural TTS service

The web application calls a dedicated GPU-backed speech service through `NCG_NEURAL_TTS_URL`. This keeps neural speech generation out of Vercel's web runtime and lets us swap models without changing the product UI.

## HTTP contract

`POST /synthesize`

```json
{
  "text": "translated text to speak",
  "language_id": "pcm",
  "voice": "Ngozi",
  "format": "wav"
}
```

Supported language IDs in NaijaClimaGuard are `en`, `pcm`, `ha`, `yo`, and `ig`.

The response must be raw `audio/wav` (or another `audio/*` content type).

## Model policy

The UI is model-neutral. A research preview may be connected to a Nigerian-language Hugging Face TTS endpoint, but production must use weights whose commercial terms are explicitly compatible with NaijaClimaGuard's SaaS/B2G/B2B use.

Do not silently ship Meta MMS-TTS or SoroTTS into production: their public checkpoints carry non-commercial terms. WazobiaVoice also requires a separate commercial license for SaaS use. The endpoint abstraction exists so a licensed WazobiaVoice deployment, a commercially licensed hosted Nigerian TTS provider, or our own future fine-tuned model can be substituted without rewriting the application.

## Vercel environment variables

- `NCG_NEURAL_TTS_URL=https://<gpu-service>/synthesize`
- `NCG_NEURAL_TTS_TOKEN=<optional bearer token>`

No device `speechSynthesis` fallback is used by the new section-reader. If the neural service is unavailable, the user sees a clear localised error instead of hearing an English-accent fallback.
