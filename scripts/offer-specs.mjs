// Keep the source wording (including "hasta", alternatives and capacities).
// Splitting on decimal commas would silently change specifications.
export function offerSpecs(title = '') {
  const spec = /\d\s*(?:GB|TB|mAh|Wh|kWh|W|kW|Hz|kHz|DPI|Pa|MP|ml|litros?|pulgadas|cm|mm|kg|horas|latas|unidades)\b|\b(?:OLED|QLED|HDMI|Bluetooth|USB-C|CIAB|IPX?\d{1,2}|4K)\b/iu;
  const parts = String(title).split(/\s*[|·;]\s*|,\s+(?!\d\b)|\s+[—–]\s+/u)
    .map(part => part.trim()).filter(part => part.length <= 112 && spec.test(part) && !/€|https?:/iu.test(part));
  return [...new Set(parts)].slice(0,4);
}
