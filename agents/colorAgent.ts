// @ts-nocheck
interface BrandColor {
  color: string;
  count: number;
}

export const colorAgent = async (page): Promise<BrandColor[]> => {
  const colorMap: Map<string, number> = new Map();

  // A helper function to check and count colors
  const countColor = (color: string) => {
    if (!color) return;

    // Skip if the color contains more than one color function (e.g., multiple 'rgb(', 'rgba(', etc.)
    const multipleColorFuncPattern = /(rgb|rgba|hsl|hsla)\([^)]+\)/g;
    const matches = color.match(multipleColorFuncPattern);

    if (matches && matches.length > 1) return;

    const normalizedColor = color.toLowerCase().trim();
    colorMap.set(normalizedColor, (colorMap.get(normalizedColor) || 0) + 1);
  };

  // Extract all the elements from the page and check their colors
  const elements = await page.$$eval("*", (elements) => {
    return elements.map((el) => {
      const styles = getComputedStyle(el);
      const backgroundColor = styles.backgroundColor;
      const color = styles.color;
      const borderColor = styles.borderColor;

      // Collect relevant colors
      return [backgroundColor, color];
    });
  });

  // Count all colors
  elements.forEach((colorList) => {
    colorList.forEach((color) => countColor(color));
  });

  // Convert the color map to an array and filter out those with a count <= 5
  const brandColors: BrandColor[] = Array.from(colorMap, ([color, count]) => ({
    color,
    count,
  }))
    .filter((item) => item.count > 5) // Threshold count
    .sort((a, b) => b.count - a.count); // Sort by count, descending

  return brandColors;
};
