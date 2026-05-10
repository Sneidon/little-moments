/**
 * Writes assets/splash-icon.png: centered logo on a large transparent canvas so
 * native splash resizeMode contain keeps the brand mark visibly small.
 */
const path = require('path');
const sharp = require('sharp');

const ROOT = path.join(__dirname, '..');
const LOGO = path.join(ROOT, 'assets/logo.png');
const OUT = path.join(ROOT, 'assets/splash-icon.png');

const CANVAS = 2048;
const MARK = 264;

(async () => {
  const resized = await sharp(LOGO).resize(MARK, MARK, { fit: 'contain' }).toBuffer();

  await sharp({
    create: {
      width: CANVAS,
      height: CANVAS,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: resized, gravity: 'center' }])
    .png()
    .toFile(OUT);

  console.log('Wrote splash-icon.png');
})();
