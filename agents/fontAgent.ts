// @ts-nocheck

interface Font {
  family: string;
  url: string;
  weight: number;
  style: 'normal' | 'italic';
}

export const fontAgent = async (
  page,
  interceptedFontUrls: string[] = []
): Promise<Font[]> => {
  const fontFamilies = await page.evaluate(() => {
    const getFontFamily = (selector: string): string | null => {
      const el = document.querySelector(selector);
      return el ? getComputedStyle(el).fontFamily.split(",")[0].trim() : null;
    };

    const headline = getFontFamily("h1") || getFontFamily("h2");
    const body =
      getFontFamily("body") || getFontFamily("p") || getFontFamily("h3");

    return Array.from(new Set([headline, body].filter(Boolean)));
  });

  const normalize = (str: string) =>
    str.toLowerCase().replace(/[\s"'\-_]/g, "");

  const matchedFonts: Font[] = [];

  for (const family of fontFamilies) {
    const cleanFamily = family.replace(/['"]/g, '').trim();
    const normalizedFamily = normalize(cleanFamily);

    const matchingUrls = interceptedFontUrls.filter((url) =>
      normalize(url).includes(normalizedFamily)
    );

    for (const url of matchingUrls) {
      const weight = extractWeightFromUrl(url);
      const style = extractStyleFromUrl(url);

      matchedFonts.push({
        family: styleAdjustedFamilyName(cleanFamily, url),
        url,
        weight,
        style
      });
    }
  }

  const uniqueFonts = Array.from(
    new Map(
      matchedFonts.map((font) => [font.url, font])
    ).values()
  );

  return uniqueFonts;
};

function extractWeightFromUrl(url: string): number {
  const filename = url.split("/").pop()?.toLowerCase() || "";

  const numericMatch = filename.match(/[-_](\d{3})(?:[-_.]|$)/);
  if (numericMatch) {
    return parseInt(numericMatch[1], 10);
  }

  // Fallback to keyword-based matching
  if (filename.includes("black")) return 900;
  if (filename.includes("extrabold")) return 800;
  if (filename.includes("semibold")) return 600;
  if (filename.includes("bold") && !filename.includes("semibold")) return 700;
  if (filename.includes("medium")) return 500;
  if (filename.includes("regular") || filename.includes("normal")) return 400;
  if (filename.includes("light")) return 300;
  if (filename.includes("thin")) return 200;

  return 400; 
}


function extractStyleFromUrl(url: string): 'normal' | 'italic' {
  const filename = url.split("/").pop()?.toLowerCase() || "";
  return filename.includes("italic") || filename.includes("it") ? "italic" : "normal";
}

function styleAdjustedFamilyName(family: string, url: string): string {
  const style = extractStyleFromUrl(url);
  const weight = extractWeightFromUrl(url);

  const weightLabelMap: Record<number, string> = {
    200: "Thin",
    300: "Light",
    400: "Regular",
    500: "Medium",
    600: "Semibold",
    700: "Bold",
    800: "ExtraBold",
    900: "Black",
  };

  const weightLabel = weightLabelMap[weight] || `${weight}`;
  return `${family} ${weightLabel}${style === 'italic' ? ' Italic' : ''}`;
}
