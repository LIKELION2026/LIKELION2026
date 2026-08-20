interface KeyboardFocusTarget {
  closest?: (selector: string) => Element | null;
  isContentEditable?: boolean;
  tagName: string;
}

const TEXT_ENTRY_TAG_NAMES = new Set(["INPUT", "TEXTAREA"]);

export function isTextEntryFocused(element: KeyboardFocusTarget | null): boolean {
  return (
    element?.isContentEditable === true ||
    TEXT_ENTRY_TAG_NAMES.has(element?.tagName ?? "")
  );
}
