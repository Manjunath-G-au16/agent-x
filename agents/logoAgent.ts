// @ts-nocheck
interface BrandLogo {
  url: string;
  width: number;
  height: number;
}

export const logoAgent = async (page): Promise<BrandLogo[]> => {
  const logos: BrandLogo[] = [];

  // 1. Try from <header> first
  const header = await page.$("header");

  if (header) {
    const img = await header.$("img");
    if (img) {
      const imgSrc = await img.getProperty("src");
      const srcValue = await imgSrc.jsonValue();
      if (srcValue) {
        const naturalWidth = await img.evaluate((el) => el.naturalWidth);
        const naturalHeight = await img.evaluate((el) => el.naturalHeight);
        logos.push({
          url: srcValue,
          width: naturalWidth,
          height: naturalHeight,
        });
      }
    }

    const backgroundImage = await page.evaluate((el) => {
      return getComputedStyle(el).backgroundImage;
    }, header);

    if (backgroundImage && backgroundImage !== "none") {
      const bgUrl = backgroundImage
        .replace(/^url\(["']?/, "")
        .replace(/["']?\)$/, "");
      logos.push({
        url: bgUrl,
        width: 200,
        height: 200,
      });
    }

    const svg = await header.$("svg");
    if (svg) {
      const svgHtml = await svg.evaluate((el) => el.outerHTML);
      logos.push({
        url:
          "data:image/svg+xml;base64," +
          Buffer.from(svgHtml).toString("base64"),
        width: 200,
        height: 200,
      });
    }
  }

  // 2. Try ALL images on page with "logo" in src, alt, or class
  const images = await page.$$eval("img", (imgs) => {
    return imgs.map((img) => ({
      src: img.src,
      alt: img.alt.toLowerCase(),
      className: img.className.toLowerCase(),
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight,
    }));
  });
  // 3. Check elements with "logo" in the class name for background-image
  const logoElementsWithBg = await page.$$eval(
    "[class*='logo' i]",
    (elements) =>
      elements
        .map((el) => {
          const style = getComputedStyle(el);
          const bg = style.backgroundImage;
          if (!bg || bg === "none") return null;
          const url = bg.replace(/^url\(["']?/, "").replace(/["']?\)$/, "");
          const { width, height } = el.getBoundingClientRect();
          return {
            url,
            width: Math.round(width),
            height: Math.round(height),
          };
        })
        .filter(Boolean)
  );
  logos.push(...logoElementsWithBg);
  images.forEach((img) => {
    const { alt, src, className, naturalWidth, naturalHeight } = img;
    if (
      alt.includes("logo") ||
      src.toLowerCase().includes("logo") ||
      className.includes("logo")
    ) {
      logos.push({
        url: src,
        width: naturalWidth,
        height: naturalHeight,
      });
    }
  });

  // Remove duplicates (by URL)
  const uniqueLogos = Array.from(
    new Map(logos.map((item) => [item.url, item])).values()
  );

  // Filter out known unwanted logos (e.g. OneTrust, 1x1 pixels)
  const filteredLogos = uniqueLogos.filter((logo) => {
    const url = logo.url.toLowerCase();
    const isOneTrust =
      url.includes("onetrust") ||
      url.includes("cookielaw.org") ||
      url.includes("cookieconsent") ||
      url.includes("powered_by_logo");
    const isTiny = logo.width <= 1 && logo.height <= 1;

    return !isOneTrust && !isTiny;
  });

  // Check each URL (skip data: URLs)
  const validLogos: BrandLogo[] = [];
  for (const logo of filteredLogos) {
    if (logo.url.startsWith("data:")) {
      validLogos.push(logo);
      continue;
    }

    try {
      const res = await fetch(logo.url, { method: "HEAD" });
      if (res.ok) {
        validLogos.push(logo);
      }
    } catch (e) {
      // Skip URLs that fail
    }
  }

  // If no logos were found retrn img-not-found img
  if (validLogos.length === 0) {
    return [
      {
        url: "https://cdn.euw1.jivox.com/files/71803/Img-Not-found.jpg",
        width: 200,
        height: 200,
      },
    ];
  }
  return validLogos;
};
