export default function handler(req: any, res: any) {
  const geminiKeys = Object.keys(process.env).filter(k => k.startsWith('GEMINI_'));
  return res.status(200).json({
    ok: true,
    runtime: 'Vercel Serverless Function',
    nodeVersion: process.version,
    env: {
      isVercel: Boolean(process.env.VERCEL),
      vercelEnv: process.env.VERCEL_ENV || 'unknown',
      hasKey1: Boolean(process.env.GEMINI_API_KEY_1),
      hasKey2: Boolean(process.env.GEMINI_API_KEY_2),
      totalGeminiKeysFound: geminiKeys.length
    }
  });
}
