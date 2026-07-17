import { describe, expect, it } from "vitest";
import {
  base64ToUint8Array,
  createFilename,
  deduplicateTags,
  formatFileSize,
  scaleDimensions,
  uint8ArrayToBase64,
  withRetry,
  MAX_PIXELS,
  NovelAIApiError,
} from "../src/utils";

describe("deduplicateTags", () => {
  it("removes duplicate tags case-insensitively", () => {
    expect(deduplicateTags("1girl, cute, Cute, 1GIRL")).toBe("1girl, cute");
  });

  it("trims whitespace and drops empty segments", () => {
    expect(deduplicateTags("a, , b ,a")).toBe("a, b");
  });

  it("preserves weighted groups untouched", () => {
    const prompt = "cute, 1.2::cute, smile::, -0.8::feet::";
    expect(deduplicateTags(prompt)).toBe(prompt);
  });

  it("returns empty input unchanged", () => {
    expect(deduplicateTags("")).toBe("");
  });
});

describe("base64 round-trip", () => {
  it("converts back and forth", () => {
    const data = new Uint8Array([0, 1, 127, 128, 255]);
    expect(base64ToUint8Array(uint8ArrayToBase64(data))).toEqual(data);
  });

  it("handles large arrays (chunked btoa)", () => {
    const data = new Uint8Array(200_000).map((_, i) => i % 256);
    expect(base64ToUint8Array(uint8ArrayToBase64(data))).toEqual(data);
  });
});

describe("createFilename", () => {
  it("uses prefix and extension", () => {
    expect(createFilename("lineart")).toMatch(
      /^lineart_\d{8}_\d{6}\.png$/,
    );
  });
});

describe("formatFileSize", () => {
  it("formats sizes", () => {
    expect(formatFileSize(512)).toBe("512 B");
    expect(formatFileSize(2048)).toBe("2.0 KB");
    expect(formatFileSize(5 * 1024 * 1024)).toBe("5.0 MB");
  });
});

describe("scaleDimensions", () => {
  it("scales by the factor, floored to multiples of 64", () => {
    expect(scaleDimensions(512, 768, 1.5)).toEqual([768, 1152]);
  });

  it("clamps to the pixel budget", () => {
    const [w, h] = scaleDimensions(1024, 1536, 4);
    expect(w * h).toBeLessThanOrEqual(MAX_PIXELS);
    expect(w % 64).toBe(0);
    expect(h % 64).toBe(0);
  });

  it("keeps the aspect ratio approximately", () => {
    const [w, h] = scaleDimensions(512, 1024, 2);
    expect(h / w).toBeCloseTo(2, 0);
  });

  it("never goes below 64", () => {
    expect(scaleDimensions(64, 64, 0.1)).toEqual([64, 64]);
  });
});

describe("withRetry", () => {
  it("retries on retryable status codes", async () => {
    let attempts = 0;
    const result = await withRetry(
      async () => {
        attempts++;
        if (attempts < 3) {
          throw new NovelAIApiError(429, "Too Many Requests");
        }
        return "ok";
      },
      { baseDelay: 1, maxDelay: 5 },
    );
    expect(result).toBe("ok");
    expect(attempts).toBe(3);
  });

  it("does not retry non-retryable errors", async () => {
    let attempts = 0;
    await expect(
      withRetry(
        async () => {
          attempts++;
          throw new NovelAIApiError(401, "Unauthorized");
        },
        { baseDelay: 1 },
      ),
    ).rejects.toThrow(/401/);
    expect(attempts).toBe(1);
  });

  it("does not retry when disabled", async () => {
    let attempts = 0;
    await expect(
      withRetry(
        async () => {
          attempts++;
          throw new NovelAIApiError(429, "Too Many Requests");
        },
        { enabled: false },
      ),
    ).rejects.toThrow();
    expect(attempts).toBe(1);
  });
});
