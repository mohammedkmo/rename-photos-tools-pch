const JPEG_QUALITY = 0.92;

/**
 * The badging system only accepts JPEG, and every image in the exported ZIP is
 * named `.jpg`. Anything that is not already a JPEG is re-encoded so the bytes
 * match the name instead of being a PNG wearing a `.jpg` extension.
 *
 * Best effort: if the browser cannot decode the file we fall back to the
 * original so a single odd image never fails the whole export.
 */
export const toJpeg = async (file: File): Promise<Blob> => {
  if (file.type === "image/jpeg") return file;

  try {
    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;

    const context = canvas.getContext("2d");
    if (!context) return file;

    // JPEG has no alpha channel, so fill first or transparency turns black.
    context.fillStyle = "#FFFFFF";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY)
    );
    return blob ?? file;
  } catch (error) {
    console.warn("Could not re-encode image as JPEG, using it as is", error);
    return file;
  }
};
