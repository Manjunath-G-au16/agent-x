//@ts-nocheck
import express from "express";
import cors from "cors";
import puppeteer from "puppeteer-extra";
import { logoAgent } from "./agents/logoAgent";
import { colorAgent } from "./agents/colorAgent";
import { imageAgent } from "./agents/imageAgent";
import { textAgent } from "./agents/textAgent";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { fontAgent } from "./agents/fontAgent";
const axios = require("axios");

const app = express();
app.use(cors());
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: false,
  })
);
app.use(express.json());
puppeteer.use(StealthPlugin());
async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let totalHeight = 0;
      const distance = 100;
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;

        if (totalHeight >= scrollHeight - window.innerHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });
  });
}

app.get("/agent-x", async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).json({ error: "Missing URL" });

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const browser = await puppeteer.launch({ headless: "false" });
  const page = await browser.newPage();
  await page.setRequestInterception(true);
  const interceptedFontUrls: string[] = [];

  page.on("request", (request) => {
    const url = request.url();
    if (/\.(woff2?|ttf|otf|eot)(\?|$)/i.test(url)) {
      interceptedFontUrls.push(url);
    }
    request.continue();
  });
  await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });
  await autoScroll(page);
  await new Promise((r) => setTimeout(r, 1000));

  const send = (event: string, data: any) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const colorData = await colorAgent(page);
    send("colors", colorData);

    const fontData = await fontAgent(page, interceptedFontUrls);
    send("fonts", fontData);

    const logoData = await logoAgent(page);
    send("logos", logoData);

    const imageData = await imageAgent(page);
    send("images", imageData);

    const textData = await textAgent(page);
    send("texts", textData);
  } catch (err) {
    send("error", { error: err.toString() });
  } finally {
    res.write("event: end\ndata: done\n\n");
    res.end();
    await browser.close();
  }
});
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
