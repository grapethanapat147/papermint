import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test } from "vitest";

import StoriesHome from "../app/page";
import { builtInTemplates } from "../app/data/templates";
import { encodeStory } from "../app/lib/share";
import { MAX_SAVED_TEMPLATES } from "../app/lib/storage";

const receipt = () => document.querySelector("#story-receipt") as HTMLElement;
const picker = () => document.querySelector(".template-picker") as HTMLElement;
const chips = () => [...picker().querySelectorAll<HTMLElement>(".template-chip b")].map((b) => b.textContent);

beforeEach(() => { window.localStorage.clear(); window.location.hash = ""; });
afterEach(() => { window.localStorage.clear(); window.location.hash = ""; });

describe("built-in templates", () => {
  test("every shipped template is offered", () => {
    render(<StoriesHome />);
    for (const template of builtInTemplates) {
      expect(chips()).toContain(template.name);
    }
  });

  test("applying one seeds the look and the line-up", () => {
    render(<StoriesHome />);
    const template = builtInTemplates.find((entry) => entry.name === "Road trip")!;
    fireEvent.click(within(picker()).getByRole("button", { name: /Road trip/ }));

    for (const item of template.items) {
      expect(receipt().textContent).toContain(item.label);
    }
    expect(receipt().textContent).toContain(template.total);
    expect(receipt().textContent).toContain(template.note);
  });

  test("applying one over someone else's shared story drops their subject", async () => {
    window.location.hash = `#s=${encodeStory({
      kind: "work", names: "SOMEONE ELSE'S NAMES", note: "Their note.", tone: "funny", stickers: [],
      items: [{ id: "i1", label: "Their line", quantity: "× 1" }], total: "Their total.", edition: 7,
    })}`;
    render(<StoriesHome />);
    await waitFor(() => expect(receipt().textContent).toContain("SOMEONE ELSE'S NAMES"));

    fireEvent.click(within(picker()).getByRole("button", { name: /Launch week/ }));
    expect(receipt().textContent).not.toContain("SOMEONE ELSE'S NAMES");
  });

  test("applying one keeps a subject this person typed", () => {
    render(<StoriesHome />);
    const subject = (document.querySelector(".diy-panel .diy-field input") as HTMLInputElement);
    fireEvent.change(subject, { target: { value: "MY OWN SUBJECT" } });

    fireEvent.click(within(picker()).getByRole("button", { name: /Launch week/ }));
    expect(receipt().textContent).toContain("MY OWN SUBJECT");
  });

  test("shipped templates cannot be deleted", () => {
    render(<StoriesHome />);
    expect(within(picker()).queryByRole("button", { name: /Delete template/ })).toBeNull();
  });
});

describe("saving your own template", () => {
  const saveAs = (name: string) => {
    fireEvent.click(within(picker()).getByRole("button", { name: /Save this/ }));
    fireEvent.change(screen.getByLabelText("Template name"), { target: { value: name } });
    fireEvent.click(within(picker()).getByRole("button", { name: /^Save$/ }));
  };

  test("a saved template joins the list and survives a reload", async () => {
    const { unmount } = render(<StoriesHome />);
    const subject = (document.querySelector(".diy-panel .diy-field input") as HTMLInputElement);
    fireEvent.change(subject, { target: { value: "Doesn't matter" } });
    saveAs("My layout");

    expect(chips()).toContain("My layout");
    unmount();

    render(<StoriesHome />);
    await waitFor(() => expect(chips()).toContain("My layout"));
  });

  test("a saved template carries the line-up but not the subject", async () => {
    render(<StoriesHome />);
    const label = (document.querySelector('.diy-item-row input[aria-label="Line item"]') as HTMLInputElement);
    fireEvent.change(label, { target: { value: "A line worth keeping" } });
    const subject = (document.querySelector(".diy-panel .diy-field input") as HTMLInputElement);
    fireEvent.change(subject, { target: { value: "PERSONAL SUBJECT" } });
    saveAs("Keeper");

    const stored = window.localStorage.getItem("papermint:templates") as string;
    expect(stored).toContain("A line worth keeping");
    expect(stored).not.toContain("PERSONAL SUBJECT");
  });

  test("a saved template can be deleted, and stays gone", async () => {
    render(<StoriesHome />);
    saveAs("Throwaway");
    expect(chips()).toContain("Throwaway");

    fireEvent.click(within(picker()).getByRole("button", { name: /Delete template Throwaway/ }));
    expect(chips()).not.toContain("Throwaway");
    expect(window.localStorage.getItem("papermint:templates")).not.toContain("Throwaway");
  });

  test("an empty name is refused", () => {
    render(<StoriesHome />);
    fireEvent.click(within(picker()).getByRole("button", { name: /Save this/ }));
    fireEvent.change(screen.getByLabelText("Template name"), { target: { value: "   " } });
    const save = within(picker()).getByRole("button", { name: /^Save$/ }) as HTMLButtonElement;
    expect(save.disabled).toBe(true);
  });

  test("saving stops at the cap rather than growing without bound", async () => {
    render(<StoriesHome />);
    for (let n = 0; n < MAX_SAVED_TEMPLATES; n += 1) { saveAs(`T${n}`); }

    const full = within(picker()).getByRole("button", { name: /Save this/ }) as HTMLButtonElement;
    expect(full.disabled).toBe(true);
    const stored = JSON.parse(window.localStorage.getItem("papermint:templates") as string);
    expect(stored.templates.length).toBe(MAX_SAVED_TEMPLATES);
  });

  test("a corrupt saved list is ignored, leaving the shipped ones", async () => {
    window.localStorage.setItem("papermint:templates", "not json");
    render(<StoriesHome />);
    await waitFor(() => expect(chips().length).toBe(builtInTemplates.length));
  });
});
