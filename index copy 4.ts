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

app.post("/generate-text", async (req, res) => {
  const { prompt } = req.body;

  try {
    const response = await axios.post(
      "https://mindshare-session.api.euw1.jivox.com/v2/accounts/32857/textGen",
      {
        prompt,
        height: 150,
        width: 100,
      },
      {
        headers: {
          accept: "application/json, text/plain, */*",
          "accept-language": "en-US,en;q=0.9",
          "cache-control": "no-cache",
          "content-type": "application/json",
          origin: "https://jvx.app.euw1.jivox.com",
          pragma: "no-cache",
          referer: "https://jvx.app.euw1.jivox.com/",
          "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
          "x-forwarded-for": "102.165.55.25",
          "x-originating-ip": "102.165.55.25",
          "x-remote-addr": "102.165.55.25",
          "x-remote-ip": "102.165.55.25",
          cookie:
            "userid=3562; token=ovUOCqssDyayAHUpyWDOt5lZ21qtOljCLTJ0jUy82FtGinIWz2TJCtKIe0GQsr2ccR1Mkz8kAIUM984hf009D9SSo47L4wONEyvjWUjumQjXH1am9YRQ1qHlnRBnSpLq82R3VBY8mqs3mVLbR674lHcDpCZEZw6hCvysuCzr0duLbIFMLgkywJJ51V3PCuozWpvWf3MfWYGe3dgSFEeZ2DX1n43sIpFbVFq7jXxpoZKtYyqLCcAIaa0JJbHUygDeUKuI5PQB29HEk88EIrza6uMC8vhSYRHjXq4vOkBiqHr1XZBWsShkRcQDNonEOUcYf7uXvsFT6i6zdjgXlPVjlEv1O03icvlFIoUteJMB0rbieFMUG4JwibZ2fri4GwClTjHEeMo1CL2WWJbskOb1XxOYULauuoe8GPxHwzmI6SlavuRrrjyEY1USxCB1zfklevBer40DQ5rz0PO5qcifUFVz48YuNiN81Y8d5ZFrwNcrvNjtTLW5GBLWoRDM7bwJwsSTtcn50EYd9U7oDsNj8kiIrmpFOAtRX00qOgFR14K5iLjxke3NculTtbR90W5f3sjLNR0aBFZUNjhvd9nfWtIIG35nczLiJj1KeudjS9exF9NDX3HFQz08BI8Z7NqVyXxPW25Gio6nzccExnIGpKxt0J1P4tOIi7CxYPqEXWF0WGttDntIktYzvjuborCnCTTdB0hJkE80S1o5o9R4WEfLMzXzHaXUEhh4YdpfxKPjLXzJddmHeXm799SlCW0q5m0Sr4q0iDEBA5ABHpulqJWoz2bfx6g6zJuU39AiXdDfSshNwWN87B9aMdEujy5yro4XkSbVFkJSEmqllBtJZi1oVbpAPpVl4AixMJDSdWAE7dlHWUfM86BZZHJkGEopzlGZMu9He82wtFApDfqkFWe4briR8M6jVBWyfXNPHBPaCWvCz96bFhgh7sUEvyUkH3nx9y7p3ai0aIK6HByw5ZQ0gU2oQlt8ErM9jUZSLA0Ya6kfeeLYhToUde84PcIo4JZeqJLT1DyaNQKAQTIv7hFgdsNv8c6hplSy3QJ6Ftny65upqSAycmevDGKlOXBVQppWBaa7FYeLcfGuMhkjY88tshCEH0ULj5V4B17HAsAalTYfG723BusYIaVKm6whs7CdmgcwUeyZdsGfM5U49aNr76TjK1XGAy2KQo4tcUjd44mlbZUPUDU1QPSiotFYUYFawRD9zgmvBGiCgrEhIkURFKwmmbgYBYVD0k83nQpnlVYsFH5uXRczMPPM5avN2JnM4uwUIlcWvcvVjMkqIsMwIP8cRtr9OSbBl11fUHzbYdxSl43g6rXUg3uA5X086yoGa5EM4VyxvXqHluoOrCivbLACuXjfzMooq3h0WZhcu015I3rIW3eKlHU9MOcuwaOOjkFqHsfNAkeIJgCFsy8mbwjQNfivOAGKsX0xwy5WxAEDhjHW77ek2zyukXVuuIMDsO1yKlHrBMmKpfpz87e9msG6nxP0hv909j1NsFP7LqcPr3juAAXwkhjsM8iGD297MrStRbpO3YcPvDTci9QdBVKAi4x2svTh3OTqS5KBBSCM7nMd65pLGGQgTAFcwSSPFLFmDkPFQp03QVrCjdhRE10qMb02EFFh4euer5AL9k2unfsIzGvaMUH2nOemBUMR391QPQ0kvQmFvXqrg6hLE66l8aKQozPdzWUKZPvghCYfQvhYoVkpaAfkt3QTrYApap1PkKzK22U5W9udczpS9mWUxPuu0OavTo79XEbsjM0SZVnt2mQw"
        },
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error("TextGen API error:", error.message);
    res.status(500).json({ error: "Failed to generate text" });
  }
});
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
