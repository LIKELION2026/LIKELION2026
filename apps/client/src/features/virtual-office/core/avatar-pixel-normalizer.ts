const MIN_VISIBLE_ALPHA = 16;
const MIN_SPRITE_COMPONENT_SIZE = 24;

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

export function removeDetachedPixelArtifacts(
  pixelData: Uint8ClampedArray,
  width: number,
  height: number,
): Uint8ClampedArray<ArrayBuffer> {
  const normalizedData = Uint8ClampedArray.from(pixelData);
  const visited = new Uint8Array(width * height);

  for (let start = 0; start < width * height; start += 1) {
    if (visited[start] || normalizedData[start * 4 + 3] === 0) {
      continue;
    }

    const component: number[] = [];
    const pending = [start];
    visited[start] = 1;

    while (pending.length > 0) {
      const pixel = pending.pop()!;
      component.push(pixel);
      const x = pixel % width;
      const y = Math.floor(pixel / width);

      const neighbors = [
        x > 0 ? pixel - 1 : -1,
        x + 1 < width ? pixel + 1 : -1,
        y > 0 ? pixel - width : -1,
        y + 1 < height ? pixel + width : -1,
      ];

      neighbors.forEach((neighbor) => {
        if (
          neighbor < 0 ||
          visited[neighbor] ||
          normalizedData[neighbor * 4 + 3] === 0
        ) {
          return;
        }

        visited[neighbor] = 1;
        pending.push(neighbor);
      });
    }

    if (component.length >= MIN_SPRITE_COMPONENT_SIZE) {
      continue;
    }

    component.forEach((pixel) => {
      const offset = pixel * 4;
      normalizedData[offset] = 0;
      normalizedData[offset + 1] = 0;
      normalizedData[offset + 2] = 0;
      normalizedData[offset + 3] = 0;
    });
  }

  return normalizedData;
}

export function constrainOpaqueFrameOffset(
  preferredOffset: number,
  leadingEdge: number,
  trailingEdge: number,
  frameSize: number,
): number {
  return Math.min(
    Math.max(preferredOffset, -leadingEdge),
    frameSize - trailingEdge - 1,
  );
}
