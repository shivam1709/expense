import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

import authRoutes from './routes/auth.js';
import expenseRoutes from './routes/expenses.js';
import categoryRoutes from './routes/categories.js';
import budgetRoutes from './routes/budgets.js';
import recurringRoutes, { generateDueRecurringExpenses } from './routes/recurring.js';
import settlementRoutes from './routes/settlements.js';
import userRoutes from './routes/users.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/recurring', recurringRoutes);
app.use('/api/settlements', settlementRoutes);
app.use('/api/users', userRoutes);

app.get('/api/health', (req, res) => res.json({ ok: true }));

// Serve the built client in production, if present.
const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on the server.' });
});

const PORT = process.env.PORT || 4000;

// Generate any due recurring expenses (subscriptions, rent, etc.) on boot and once a day after.
generateDueRecurringExpenses();
setInterval(generateDueRecurringExpenses, 24 * 60 * 60 * 1000);

app.listen(PORT, () => {
  console.log(`Expense tracker API listening on port ${PORT}`);
});
