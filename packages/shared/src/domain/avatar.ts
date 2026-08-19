export const OFFICE_AVATAR_IDS = [
  "red_panda",
  "cat",
  "dog",
  "sheep",
  "monkey",
  "capybara",
  "hippo",
  "parrot",
  "zebra",
  "wolf",
  "cow",
  "eagle"
] as const;

export type OfficeAvatarId = (typeof OFFICE_AVATAR_IDS)[number];
