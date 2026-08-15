import express from 'express';

const app = express();

app.get('/api/test-express', (req, res) => {
  res.json({
    ok: true,
    expressWorking: true,
    timestamp: new Date().toISOString()
  });
});

export default app;
