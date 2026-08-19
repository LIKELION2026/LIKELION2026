const MIN_VISIBLE_ALPHA = 16;

export function removeNearTransparentPixels(
  pixelData: Uint8ClampedArray,
): Uint8ClampedArray<ArrayBuffer> {
  const normalizedData = Uint8ClampedArray.from(pixelData);

  for (let offset = 3; offset < normalizedData.length; offset += 4) {
    if (normalizedData[offset]! >= MIN_VISIBLE_ALPHA) {
      continue;
    }

    normalizedData[offset - 3] = 0;
    normalizedData[offset - 2] = 0;
    normalizedData[offset - 1] = 0;
    normalizedData[offset] = 0;
  }

  return normalizedData;
}
