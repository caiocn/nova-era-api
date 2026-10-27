import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';

import { extractImageThumb } from 'baileys';
import sharp from 'sharp';

import {
  convertImageToJpeg,
  convertImageToWebp,
  createThumbnail,
  isAnimatedImage,
} from '../../src/utils/image-processing';

async function createPng(width: number, height: number, background: string) {
  return sharp({
    create: {
      background,
      channels: 4,
      height,
      width,
    },
  })
    .png()
    .toBuffer();
}

async function createAnimatedGif() {
  const red = await createPng(16, 16, '#ff0000');
  const green = await createPng(16, 16, '#00ff00');

  return sharp([red, green], { join: { animated: true } })
    .gif({ delay: [100, 100], loop: 0 })
    .toBuffer();
}

function getSharpVersion() {
  const sharpEntry = require.resolve('sharp');
  const packageJson = JSON.parse(readFileSync(join(dirname(sharpEntry), '..', 'package.json'), 'utf8'));

  return packageJson.version;
}

test('converts a PNG upload to a JPEG without retaining metadata', async () => {
  const png = await createPng(64, 32, '#ff3366');
  const jpeg = await convertImageToJpeg(png);
  const metadata = await sharp(jpeg).metadata();

  assert.equal(getSharpVersion(), '0.35.5');
  assert.equal(metadata.format, 'jpeg');
  assert.equal(metadata.width, 64);
  assert.equal(metadata.height, 32);
  assert.equal(metadata.exif, undefined);
  assert.equal(metadata.xmp, undefined);
});

test('converts a still image to a valid WebP sticker', async () => {
  const png = await createPng(48, 48, '#33cc66');
  const webp = await convertImageToWebp(png, false);
  const metadata = await sharp(webp).metadata();

  assert.equal(metadata.format, 'webp');
  assert.equal(metadata.width, 48);
  assert.equal(metadata.height, 48);
});

test('preserves animation frames when converting a GIF sticker to WebP', async () => {
  const gif = await createAnimatedGif();
  const webp = await convertImageToWebp(gif, true);
  const metadata = await sharp(webp, { animated: true }).metadata();

  assert.equal(metadata.format, 'webp');
  assert.equal(metadata.pages, 2);
  assert.equal(metadata.pageHeight, 16);
  assert.deepEqual(metadata.delay, [100, 100]);
  assert.equal(await isAnimatedImage(webp), true);
});

test('identifies an animated GIF from bytes independent of its source representation', async () => {
  const gif = await createAnimatedGif();

  assert.equal(await isAnimatedImage(gif), true);
});

test('creates a 320x180 PNG thumbnail from a landscape image', async () => {
  const source = await createPng(640, 240, '#3366ff');
  const thumbnail = await createThumbnail(source);
  const metadata = await sharp(thumbnail).metadata();

  assert.equal(metadata.format, 'png');
  assert.equal(metadata.width, 320);
  assert.equal(metadata.height, 180);
});

test('uses Sharp for Baileys thumbnails when the application does not declare Jimp', async () => {
  const packageJson = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8'));
  const source = await createPng(160, 80, '#ffcc33');
  const thumbnail = await extractImageThumb(source, 32);
  const metadata = await sharp(thumbnail.buffer).metadata();

  assert.equal(packageJson.dependencies.jimp, undefined);
  assert.deepEqual(thumbnail.original, { height: 80, width: 160 });
  assert.equal(metadata.format, 'jpeg');
  assert.equal(metadata.width, 32);
});

test('rejects malformed image content before conversion', async () => {
  await assert.rejects(() => convertImageToJpeg(Buffer.from('not an image')), /unsupported image format/i);
});

test('rejects an image that exceeds the processing pixel limit', async () => {
  const oversized = await createPng(6401, 6250, '#663399');

  await assert.rejects(() => convertImageToJpeg(oversized), /input image exceeds pixel limit/i);
});
