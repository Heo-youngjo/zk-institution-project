import "dotenv/config";
import express from "express";
import cors from "cors";
import authRouter      from "./routes/auth";
import ordersRouter    from "./routes/orders";
import portfolioRouter from "./routes/portfolio";

const app  = express();
const PORT = process.env.PORT ?? 4000;

app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json());

app.use("/api/auth",      authRouter);
app.use("/api/orders",    ordersRouter);
app.use("/api/portfolio", portfolioRouter);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`✅ ZK Institution Backend  →  http://localhost:${PORT}`);
  console.log(`   POST /api/auth/login`);
  console.log(`   GET  /api/auth/me`);
  console.log(`   GET  /api/orders`);
  console.log(`   GET  /api/orders/:id`);
  console.log(`   GET  /api/portfolio`);
});
