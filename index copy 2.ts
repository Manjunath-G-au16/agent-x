// @ts-nocheck
import express from "express";
import cors from "cors";
import puppeteer from "puppeteer-extra";
import { logoAgent } from "./agents/logoAgent";
import { colorAgent } from "./agents/colorAgent";
import { imageAgent } from "./agents/imageAgent";
import { textAgent } from "./agents/textAgent";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { fontAgent } from "./agents/fontAgent";

const app = express();
app.use(cors());
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

app.post("/agent-x", async (req, res) => {
  const { url } = req.body;

  if (!url) return res.status(400).json({ error: "Missing URL" });

  try {
    const browser = await puppeteer.launch({ headless: "false" });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });
    // Scroll to the bottom of the page to load lazy content
    await autoScroll(page);
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const logoData = await logoAgent(page);
    const colorData = await colorAgent(page);
    const imageData = await imageAgent(page);
    const textData = await textAgent(page);
    const fontData = await fontAgent(page);

    await browser.close();
    res.json({
      logos: logoData.length > 0 ? logoData : [{ message: "No logos found" }],
      colors:
        colorData.length > 0 ? colorData : [{ message: "No colors found" }],
      images:
        imageData.length > 0 ? imageData : [{ message: "No images found" }],
      texts: textData ? textData : [{ message: "No texts found" }],
      fonts: fontData.length > 0 ? fontData : [{ message: "No fonts found" }],
    });
  } catch (err) {
    res.status(500).json({ error: err.toString() });
  }
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
