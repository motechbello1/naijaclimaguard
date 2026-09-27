// Reproducible display assets from the approved raster, never a redrawn symbol.
const fs = require('node:fs/promises');
const path = require('node:path');
const sharp = require('sharp');
const root = path.resolve(__dirname, '..');
const brand = path.join(root, 'public/brand');

async function main() {
  const source = await fs.readFile(path.join(brand, 'approved-symbol-source.jpeg'));
  const { width, height } = await sharp(source).metadata();
  const uri = `data:image/jpeg;base64,${source.toString('base64')}`;
  // Map white paper to alpha with a small JPEG tolerance. Both inks use the
  // identical source mask so switching the theme cannot change the silhouette.
  const mark = (color) => `<svg xmlns="http://www.w3.org/2000/svg" width="850" height="850" viewBox="202 202 850 850"><defs><filter id="alpha" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 -1.04 0 0 0 1.02"/></filter><mask id="silhouette" mask-type="alpha"><image href="${uri}" width="${width}" height="${height}" filter="url(#alpha)"/></mask></defs><rect x="202" y="202" width="850" height="850" fill="${color}" mask="url(#silhouette)"/></svg>`;
  const light = await sharp(Buffer.from(mark('#00552E'))).resize(512).png().toBuffer();
  const dark = await sharp(Buffer.from(mark('#ECFFF5'))).resize(512).png().toBuffer();
  await fs.writeFile(path.join(brand, 'symbol-light-v3.png'), light);
  await fs.writeFile(path.join(brand, 'symbol-dark-v3.png'), dark);
  const svg = (buffer, adaptive = false) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="NaijaClimaGuard">${adaptive ? '<style>.dark{display:none}@media(prefers-color-scheme:dark){.light{display:none}.dark{display:block}}</style>' : ''}<image ${adaptive ? 'class="light" ' : ''}width="512" height="512" href="data:image/png;base64,${buffer.toString('base64')}"/>${adaptive ? `<image class="dark" width="512" height="512" href="data:image/png;base64,${dark.toString('base64')}"/>` : ''}</svg>\n`;
  await fs.writeFile(path.join(brand, 'favicon-light.svg'), svg(light));
  await fs.writeFile(path.join(brand, 'favicon-dark.svg'), svg(dark));
  await fs.writeFile(path.join(brand, 'naijaclimaguard-mark.svg'), svg(light));
  await fs.writeFile(path.join(root, 'app/icon.svg'), svg(light, true));
  for (const size of [192, 512]) {
    const inner = Math.round(size * 0.7);
    const icon = await sharp({ create: { width: size, height: size, channels: 4, background: '#071713' } })
      .composite([{ input: await sharp(dark).resize(inner).toBuffer(), gravity: 'center' }]).png().toBuffer();
    await fs.writeFile(path.join(brand, `app-icon-${size}-v3.png`), icon);
  }
  await sharp(dark).resize(126).extend({ top: 27, bottom: 27, left: 27, right: 27, background: '#071713' }).png().toFile(path.join(brand, 'apple-touch-icon-v3.png'));
  await sharp(light).resize(660).flatten({ background: '#ffffff' }).png().toFile(path.join(root, 'public/floodpass/logo-660.png'));
  await sharp(light).resize(192).flatten({ background: '#ffffff' }).png().toFile(path.join(root, 'public/floodpass/icon-192.png'));
  const icoPng = await sharp(light).resize(32).png().toBuffer();
  const icoHeader = Buffer.alloc(22);
  icoHeader.writeUInt16LE(1, 2); icoHeader.writeUInt16LE(1, 4);
  icoHeader[6] = 32; icoHeader[7] = 32;
  icoHeader.writeUInt16LE(1, 10); icoHeader.writeUInt16LE(32, 12);
  icoHeader.writeUInt32LE(icoPng.length, 14); icoHeader.writeUInt32LE(22, 18);
  await fs.writeFile(path.join(root, 'app/favicon.ico'), Buffer.concat([icoHeader, icoPng]));
  const wallet = {};
  for (const [name, size] of [['icon.png',29],['icon@2x.png',58],['icon@3x.png',87],['logo.png',50],['logo@2x.png',100],['logo@3x.png',150]]) {
    wallet[name] = (await sharp(dark).resize(size).png().toBuffer()).toString('base64');
  }
  await fs.writeFile(path.join(root, 'lib/floodpass/wallet-assets.ts'), `// Generated from the approved NaijaClimaGuard logo.\nexport const WALLET_IMAGES: Record<string, string> = ${JSON.stringify(wallet,null,2)};\n`);
  console.log('Built matching theme, favicon, install and wallet assets.');
}
main().catch((error) => { console.error(error); process.exit(1); });
