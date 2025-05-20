// @ts-nocheck

interface BrandText {
  h1: string[];
  h2: string[];
  h3: string[];
  allH: string[]; 
  p: string;
  cta: string[];
  ctaStyle: {
    color: string;
    backgroundColor: string;
    borderRadius: string;
    padding: string;
    fontSize: string;
  };
}

export const textAgent = async (page): Promise<BrandText> => {
  const textContent = await page.evaluate(() => {
    const unwantedPatterns = [
      /privacy/i,
      /cookie/i,
      /terms/i,
      /legal/i,
      /policy/i,
      /settings/i,
      /consent/i,
      /copyright/i,
      /disclaimer/i,
      /since/i,
      /google/i,
      /maps/i,
      /members/i,
      /apps/i,
      /login/i,
      /signup/i,
      /welcome/i,
      /powered/i,
      /signing/i,
      /loging/i,
      /help/i,
    ];
    const MAX_LENGTH = 35;

    const normalizeText = (text: string) =>
      text.replace(/\n/g, " ").replace(/\s+/g, " ").trim();

    const isWantedText = (text: string) => {
      const normalized = normalizeText(text);
      return (
        normalized &&
        !unwantedPatterns.some((pattern) => pattern.test(normalized)) &&
        normalized.split(" ").length >= 2
      );
    };

    const getTextArray = (selector: string, limitLength = false) => {
      const elements = Array.from(document.querySelectorAll(selector))
        .map((el) => el.textContent)
        .filter((text) => text && isWantedText(text))
        .map((text) => normalizeText(text))
        .filter((text) => (limitLength ? text.length <= MAX_LENGTH : true));
      return Array.from(new Set(elements)).sort((a, b) => b.length - a.length);
    };

    const getParagraphArray = (selector: string) => {
      const elements = Array.from(document.querySelectorAll(selector))
        .map((el) => el.textContent)
        .filter(
          (text) =>
            text &&
            !unwantedPatterns.some((pattern) =>
              pattern.test(normalizeText(text))
            )
        )
        .map((text) => normalizeText(text));
      return Array.from(new Set(elements));
    };

    const h1Texts = getTextArray("h1", true);
    const h2Texts = getTextArray("h2", true);
    const h3Texts = getTextArray("h3", true);
    const allHTexts = Array.from(
      new Set([...h1Texts, ...h2Texts, ...h3Texts])
    ).sort((a, b) => b.length - a.length);
    const pTexts = getParagraphArray("p");
    const combinedText = [...allHTexts, ...pTexts].join(" | ");

    const getCtaTextAndStyle = () => {
      const ctaKeywords = [
        "click",
        "buy",
        "subscribe",
        "get",
        "started",
        "learn",
        "download",
        "try",
        "order",
        "now",
        "join",
        "book",
        "shop",
        "explore",
        "register",
      ];
      const isCTA = (text: string) =>
        ctaKeywords.some((keyword) => text.toLowerCase().includes(keyword));
      const isValidCTA = (text: string) => {
        const wordCount = normalizeText(text).split(" ").length;
        return wordCount <= 3 && wordCount > 1;
      };

      const ctaElements = Array.from(
        document.querySelectorAll(
          'a, button, [role="button"], [class*="btn"], [class*="cta"]'
        )
      );
      const ctaMap = new Map<
        string,
        { text: string; style: CSSStyleDeclaration; rect: DOMRect }
      >();

      ctaElements.forEach((el) => {
        const rawText = el.innerText;
        const text = normalizeText(rawText);
        const lowerText = text.toLowerCase();
        const style = getComputedStyle(el);
        const rect = el.getBoundingClientRect();

        if (
          text &&
          isCTA(text) &&
          isValidCTA(text) &&
          isWantedText(text) &&
          !ctaMap.has(lowerText)
        ) {
          ctaMap.set(lowerText, { text, style, rect });
        }
      });

      const ctaTexts = Array.from(ctaMap.values())
        .map((entry) => entry.text)
        .sort((a, b) => b.length - a.length);

      // Style aggregation
      const styles = Array.from(ctaMap.values());

      const mostCommon = (arr: string[]) =>
        arr
          .sort(
            (a, b) =>
              arr.filter((v) => v === a).length -
              arr.filter((v) => v === b).length
          )
          .pop() || "";

      const colors = styles.map(({ style }) => style.color);
      const padding = styles.map(({ style }) => style.padding);
      const fontSize = styles.map(({ style }) => style.fontSize);
      const bgColors = styles.map(({ style }) => style.backgroundColor);
      const borderPercentages = styles.map(({ style }) => style.borderRadius);

      const ctaStyle = {
        color: mostCommon(colors),
        backgroundColor: mostCommon(bgColors),
        borderRadius: mostCommon(borderPercentages),
        padding: mostCommon(padding),
        fontSize: mostCommon(fontSize),
      };

      return { ctaTexts, ctaStyle };
    };

    const { ctaTexts, ctaStyle } = getCtaTextAndStyle();

    return {
      h1: h1Texts,
      h2: h2Texts,
      h3: h3Texts,
      allH: allHTexts,
      p: normalizeText(combinedText),
      cta: ctaTexts,
      ctaStyle,
    };
  });

  return textContent;
};
