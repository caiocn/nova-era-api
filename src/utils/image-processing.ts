import sharp from 'sharp';

const MAX_INPUT_PIXELS = 40_000_000;

export async function convertImageToJpeg(image: Buffer) {
  return sharp(image, { failOn: 'warning', limitInputPixels: MAX_INPUT_PIXELS }).jpeg().toBuffer();
}

export async function convertImageToWebp(image: Buffer, animated: boolean) {
  return sharp(image, {
    animated,
    failOn: 'warning',
    limitInputPixels: MAX_INPUT_PIXELS,
  })
    .webp({ quality: 80 })
    .toBuffer();
}

export async function createThumbnail(image: Buffer) {
  return sharp(image, { failOn: 'warning', limitInputPixels: MAX_INPUT_PIXELS })
    .resize({ fit: 'cover', height: 180, width: 320 })
    .png()
    .toBuffer();
}

export async function isAnimatedImage(image: Buffer) {
  const metadata = await sharp(image, {
    animated: true,
    failOn: 'warning',
    limitInputPixels: MAX_INPUT_PIXELS,
  }).metadata();

  return (metadata.pages ?? 1) > 1;
}
