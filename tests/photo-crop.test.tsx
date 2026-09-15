import { act, renderHook } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { usePhotoEditor } from "../app/hooks/usePhotoEditor";

/**
 * Crop position is the piece of improvement #3 that CLAUDE.md claimed already
 * existed. These cover the maths that keeps the preview and the PNG export
 * cropping to the same place.
 */
describe("photo crop position", () => {
  test("starts centred", () => {
    const { result } = renderHook(() => usePhotoEditor());
    expect(result.current.photoOffsetX).toBe(0);
    expect(result.current.photoOffsetY).toBe(0);
    expect(result.current.photoTransform).toBe("scale(1) translate(0%, 0%)");
  });

  test("the transform scales first, then shifts", () => {
    const { result } = renderHook(() => usePhotoEditor());
    act(() => { result.current.setPhotoZoom(1.4); });
    act(() => { result.current.setPhotoOffsetX(12); result.current.setPhotoOffsetY(-8); });
    // export multiplies the same percentages by the drawn size, so the order here
    // is part of the contract between preview and canvas
    expect(result.current.photoTransform).toBe("scale(1.4) translate(12%, -8%)");
  });

  test("clamps so the photo cannot be dragged out of its frame", () => {
    const { result } = renderHook(() => usePhotoEditor());
    act(() => { result.current.setPhotoOffsetX(500); result.current.setPhotoOffsetY(-500); });
    expect(result.current.photoOffsetX).toBe(40);
    expect(result.current.photoOffsetY).toBe(-40);
  });

  test("nudge accumulates and clamps at the same limit", () => {
    const { result } = renderHook(() => usePhotoEditor());
    act(() => { result.current.nudgePhotoOffset(15, 5); });
    act(() => { result.current.nudgePhotoOffset(15, 5); });
    expect(result.current.photoOffsetX).toBe(30);
    expect(result.current.photoOffsetY).toBe(10);
    act(() => { result.current.nudgePhotoOffset(50, 0); });
    expect(result.current.photoOffsetX).toBe(40);
  });

  test("removing the photo recentres the crop", () => {
    const { result } = renderHook(() => usePhotoEditor());
    act(() => { result.current.setPhotoOffsetX(25); });
    act(() => { result.current.removePhoto(); });
    expect(result.current.photoOffsetX).toBe(0);
    expect(result.current.photoOffsetY).toBe(0);
  });
});
