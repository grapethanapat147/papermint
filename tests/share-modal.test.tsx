import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import { ShareModal } from "../app/components/ShareModal";

function renderModal(overrides: Partial<Parameters<typeof ShareModal>[0]> = {}) {
  const props: Parameters<typeof ShareModal>[0] = {
    closeModal: vi.fn(), activeKind: { icon: "♡", label: "Our Friendship" }, names: "Grape & Nam", items: [],
    nativeShare: vi.fn(), copyStoryLink: vi.fn(), copied: false, downloadStory: vi.fn(), photoData: null,
    startHandoff: vi.fn(), handoff: null, handoffPending: false, handoffError: "",
    ...overrides,
  };
  render(<ShareModal {...props} />);
  return props;
}

describe("share modal", () => {
  test("the download sizes are a labelled group, so it reads as downloading an image", () => {
    const props = renderModal();
    const group = screen.getByRole("group", { name: "Download image (PNG)" });
    const buttons = within(group).getAllByRole("button");
    expect(buttons.map((b) => b.querySelector("b")?.textContent)).toEqual(["Story", "Post", "Receipt only"]);
    fireEvent.click(buttons[1]);
    expect(props.downloadStory).toHaveBeenCalledWith("post");
  });

  test("with a photo, the note does not claim the photo never leaves the device", () => {
    renderModal({ photoData: "data:image/jpeg;base64,AAAA" });
    const note = document.querySelector(".link-note")?.textContent ?? "";
    // The same modal offers a handoff that uploads the photo; the note must agree.
    expect(note).toMatch(/handoff link/);
    expect(note).toMatch(/24 hours/);
    expect(note).not.toMatch(/included only in the downloaded PNG/);
  });

  test("without a photo, the note no longer claims there is no server storage at all", () => {
    renderModal();
    const note = document.querySelector(".link-note")?.textContent ?? "";
    expect(note).not.toMatch(/no public feed or permanent database/);
    expect(note).toMatch(/handoff link/);
  });
});
