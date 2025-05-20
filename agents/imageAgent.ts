// @ts-nocheck
interface BrandImage {
  url: string;
  size: {
    width: number;
    height: number;
  };
}

export const imageAgent = async (page): Promise<BrandImage[]> => {
  const images = await page.$$eval("img", (imgs) => {
    const IGNORE_KEYWORDS = ["logo", "brand", "predictions"];
    return imgs
      .map((img) => {
        const srcset = img.getAttribute("srcset");
        let actualSrc = img.src;

        if (srcset) {
          const srcCandidates = srcset
            .split(",")
            .map((s) => s.trim().split(" ")[0]);
          actualSrc = srcCandidates[srcCandidates.length - 1];
        }

        // Skip data URLs
        if (!actualSrc || actualSrc.startsWith("data:")) return null;

        // Normalize protocol-relative or relative URLs
        if (actualSrc.startsWith("//")) {
          actualSrc = "https:" + actualSrc;
        } else if (actualSrc.startsWith("/")) {
          actualSrc = location.origin + actualSrc;
        }

        // Decode and check for inline SVG content
        try {
          const decoded = decodeURIComponent(actualSrc);
          if (decoded.trim().startsWith("<svg")) return null;
        } catch (e) {
          // Ignore if decodeURIComponent fails
        }
        const lowerSrc = actualSrc.toLowerCase();
        if (IGNORE_KEYWORDS.some((keyword) => lowerSrc.includes(keyword)))
          return null;
        return {
          src: actualSrc,
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight,
        };
      })
      .filter((img) => img !== null);
  });

  const largeImages: BrandImage[] = images
    .filter((img) => img.naturalWidth > 100 && img.naturalHeight > 100)
    .map((img) => ({
      url: img.src,
      size: {
        width: img.naturalWidth,
        height: img.naturalHeight,
      },
    }));

  const uniqueImages = Array.from(
    new Map(largeImages.map((item) => [item.url, item])).values()
  );

  uniqueImages.sort((a, b) => {
    const areaA = a.size.width * a.size.height;
    const areaB = b.size.width * b.size.height;
    return areaB - areaA;
  });

  return uniqueImages;
};
