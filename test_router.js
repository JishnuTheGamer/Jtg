import express from 'express';
const router = express.Router();
export default router;
router.post('/test', (req, res) => res.send('ok'));
