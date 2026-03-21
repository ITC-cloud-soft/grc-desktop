/**
 * Generate GRC icon files from SVG
 * Produces: grc-icon.png (256x256) and grc-icon.ico (multi-size)
 */

import sharp from "sharp";
import pngToIco from "png-to-ico";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const assetsDir = path.join(__dirname, "..", "apps", "electron", "assets");
const svgPath = path.join(assetsDir, "grc-icon.svg");

// ICO needs multiple sizes for best display at different DPIs
const ICO_SIZES = [16, 24, 32, 48, 64, 128, 256];

async function main() {
  console.log("=== Generating GRC Icons ===");

  const svgBuffer = fs.readFileSync(svgPath);

  // Generate individual PNGs for ICO
  const pngBuffers = [];
  for (const size of ICO_SIZES) {
    const png = await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toBuffer();
    pngBuffers.push(png);
    console.log(`  Generated ${size}x${size} PNG`);
  }

  // Save 256x256 PNG (for tray icon etc.)
  const png256 = pngBuffers[ICO_SIZES.indexOf(256)];
  const pngPath = path.join(assetsDir, "grc-icon.png");
  fs.writeFileSync(pngPath, png256);
  console.log(`  Saved: ${pngPath}`);

  // Save 32x32 PNG (for small tray icon)
  const png32 = pngBuffers[ICO_SIZES.indexOf(32)];
  const png32Path = path.join(assetsDir, "grc-icon-32.png");
  fs.writeFileSync(png32Path, png32);
  console.log(`  Saved: ${png32Path}`);

  // Generate ICO with all sizes
  const icoBuffer = await pngToIco(pngBuffers);
  const icoPath = path.join(assetsDir, "grc-icon.ico");
  fs.writeFileSync(icoPath, icoBuffer);
  console.log(`  Saved: ${icoPath}`);

  console.log("\n=== Icon generation complete! ===");
}

main().catch((err) => {
  console.error("Icon generation failed:", err);
  process.exit(1);
});
