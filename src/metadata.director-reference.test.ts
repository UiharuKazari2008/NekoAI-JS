import { describe, expect, it } from "vitest";
import { Action, Model } from "./constants";
import { metadataProcessor } from "./metadata";
import { MAX_DIRECTOR_REFERENCES, Metadata } from "./types";
import { prepareMetadataForApi } from "./utils/metadata-utils";

function baseMetadata(overrides: Partial<Metadata> = {}): Metadata {
  return {
    prompt: "1girl",
    model: Model.V4_5,
    action: Action.GENERATE,
    ...overrides,
  };
}

describe("Precise Reference v2 — applyDirectorReferenceDefaults", () => {
  it("keeps img2img image and action with three director references", () => {
    const input = baseMetadata({
      action: Action.IMG2IMG,
      image: "base64-img2img-source",
      strength: 0.45,
      director_reference_images: ["ref-a", "ref-b", "ref-c"],
      director_reference_descriptions: [
        {
          caption: { base_caption: "character", char_captions: [] },
          legacy_uc: false,
        },
        {
          caption: { base_caption: "style", char_captions: [] },
          legacy_uc: true,
        },
      ],
      director_reference_strength_values: [0.8, 1.5],
      director_reference_secondary_strength_values: [-0.2],
      reference_image_multiple: ["vibe-should-strip"],
      reference_strength_multiple: [0.5],
    });

    const processed = metadataProcessor.processMetadata(input);

    expect(processed.action).toBe(Action.IMG2IMG);
    expect(processed.image).toBe("base64-img2img-source");
    expect(processed.strength).toBe(0.45);
    expect(processed.director_reference_images).toEqual([
      "ref-a",
      "ref-b",
      "ref-c",
    ]);
    expect(processed.director_reference_descriptions).toHaveLength(3);
    expect(
      processed.director_reference_descriptions![0].caption.base_caption,
    ).toBe("character");
    expect(
      processed.director_reference_descriptions![1].caption.base_caption,
    ).toBe("style");
    expect(
      processed.director_reference_descriptions![2].caption.base_caption,
    ).toBe("character&style");
    expect(processed.director_reference_strength_values).toEqual([
      0.8,
      1,
      1,
    ]);
    expect(processed.director_reference_secondary_strength_values).toEqual([
      0,
      1,
      1,
    ]);
    expect(processed.director_reference_information_extracted).toEqual([
      1,
      1,
      1,
    ]);
    expect(processed.reference_image_multiple).toBeUndefined();
    expect(processed.reference_strength_multiple).toBeUndefined();

    const payload = prepareMetadataForApi(processed);
    expect(payload.action).toBe(Action.IMG2IMG);
    expect(payload.parameters.image).toBe("base64-img2img-source");
    expect(payload.parameters.director_reference_images).toHaveLength(3);
  });

  it("normalizes invalid base_caption without overwriting valid slots", () => {
    const processed = metadataProcessor.processMetadata(
      baseMetadata({
        director_reference_images: ["ref-1", "ref-2"],
        director_reference_descriptions: [
          {
            caption: {
              base_caption: "invalid" as "character&style",
              char_captions: [],
            },
            legacy_uc: false,
          },
          {
            caption: { base_caption: "character", char_captions: [] },
            legacy_uc: false,
          },
        ],
      }),
    );

    expect(
      processed.director_reference_descriptions![0].caption.base_caption,
    ).toBe("character&style");
    expect(
      processed.director_reference_descriptions![1].caption.base_caption,
    ).toBe("character");
  });

  it(`caps director reference arrays at ${MAX_DIRECTOR_REFERENCES}`, () => {
    const refs = Array.from({ length: 8 }, (_, i) => `ref-${i}`);
    const processed = metadataProcessor.processMetadata(
      baseMetadata({
        director_reference_images: refs,
        director_reference_strength_values: refs.map(() => 0.5),
      }),
    );

    expect(processed.director_reference_images).toHaveLength(
      MAX_DIRECTOR_REFERENCES,
    );
    expect(processed.director_reference_strength_values).toHaveLength(
      MAX_DIRECTOR_REFERENCES,
    );
  });
});
