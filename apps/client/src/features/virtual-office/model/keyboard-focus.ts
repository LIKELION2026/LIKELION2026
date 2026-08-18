interface KeyboardFocusTarget {
  isContentEditable?: boolean;
  tagName: string;
}

const TEXT_ENTRY_TAG_NAMES = new Set(["INPUT", "SELECT", "TEXTAREA"]);

export function isTextEntryFocused(element: KeyboardFocusTarget | null): boolean {
  return element?.isContentEditable === true || TEXT_ENTRY_TAG_NAMES.has(element?.tagName ?? "");
}
