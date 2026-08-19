-- A single newly selectable avatar belongs to one member per workspace.
-- Legacy `office-avatar` sessions are excluded so this migration remains safe
-- for prior test data. The server validates every new assignment as well.
create unique index members_workspace_avatar_id_unique_idx
  on public.members (workspace_id, avatar_id)
  where avatar_id in (
    'red_panda', 'cat', 'dog', 'sheep', 'monkey',
    'capybara', 'hippo', 'parrot', 'zebra', 'wolf', 'cow', 'eagle'
  );
