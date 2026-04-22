export default function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let reason = 'manual';
  try {
    if (req.body) {
      const bodyData = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      reason = bodyData.reason || 'manual';
    }
  } catch (e) {
    // Silent fail
  }

  res.setHeader("Set-Cookie", "token=; Max-Age=0; Path=/; HttpOnly; SameSite=Strict");
  
  return res.status(200).json({ message: "Logged out" });
}