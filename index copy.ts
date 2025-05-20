// @ts-nocheck
import express from "express";
import cors from "cors";
import puppeteer from "puppeteer";

const app = express();
app.use(cors());
app.use(express.json());

app.post("/agent-x", async (req, res) => {
  const { url } = req.body;

  if (!url) return res.status(400).json({ error: "Missing URL" });

  try {
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 });

    const logoData = await page.evaluate(() => {
      const header = document.querySelector("header");
      if (!header) return null;

      const img = header.querySelector("img");
      if (img && img.src) {
        return {
          logoUrl: img.src,
          width: img.naturalWidth,
          height: img.naturalHeight,
        };
      }

      const backgroundImage = getComputedStyle(header).backgroundImage;
      if (backgroundImage && backgroundImage !== "none") {
        return {
          logoUrl: backgroundImage
            .replace(/^url\(["']?/, "")
            .replace(/["']?\)$/, ""),
          width: 200,
          height: 200,
        };
      }

      const svg = header.querySelector("svg");
      if (svg) {
        return {
          logoUrl: "data:image/svg+xml;base64," + btoa(svg.outerHTML),
          width: 200,
          height: 200,
        };
      }

      return null;
    });

const fontData = await page.evaluate(() => {
  const getFontInfo = (selector) => {
    const el = document.querySelector(selector);
    if (!el) return null;

    const style = getComputedStyle(el);
    return {
      fontFamily: style.fontFamily,
      fontWeight: style.fontWeight,
    };
  };

  const headlineFont = getFontInfo("h1") || getFontInfo("h2");
  const bodyFont = getFontInfo("p") || getFontInfo("body");

  const fontUrls = [];
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      for (const rule of Array.from(sheet.cssRules)) {
        if (rule instanceof CSSFontFaceRule) {
          const fontFamily = rule.style.getPropertyValue("font-family");
          const src = rule.style.getPropertyValue("src");
          fontUrls.push({
            fontFamily: fontFamily.replace(/['"]/g, ""),
            fontUrl: src.match(/url\(["']?([^"')]+)["']?\)/)?.[1] || null,
          });
        } else if (rule instanceof CSSImportRule) {
          fontUrls.push({
            fontFamily: "Imported stylesheet",
            fontUrl: rule.href,
          });
        }
      }
    } catch (e) {
      // Skip cross-origin stylesheets
    }
  }

  return {
    headline: {
      font: headlineFont?.fontFamily || null,
      weight: headlineFont?.fontWeight || null,
      source:
        fontUrls.find((f) =>
          headlineFont?.fontFamily?.includes(f.fontFamily)
        ) || null,
    },
    body: {
      font: bodyFont?.fontFamily || null,
      weight: bodyFont?.fontWeight || null,
      source:
        fontUrls.find((f) => bodyFont?.fontFamily?.includes(f.fontFamily)) ||
        null,
    },
  };
});


    await browser.close();
    res.json({
      logo: logoData || { message: "Logo not found" },
      fonts: fontData || { message: "Font info not found" },
    });
  } catch (err) {
    res.status(500).json({ error: err.toString() });
  }
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
