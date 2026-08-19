-- Existing desks keep their identities and assignments while their map positions
-- move to the corresponding seats in the furnished Figma office map.
update public.desks
set
  position_x = case label
    when 'Korea desk 1' then 400
    when 'Korea desk 2' then 400
    when 'Korea desk 3' then 400
    when 'Vietnam desk 1' then 970
    when 'Vietnam desk 2' then 970
    when 'Vietnam desk 3' then 970
    else position_x
  end,
  position_y = case label
    when 'Korea desk 1' then 1160
    when 'Korea desk 2' then 1410
    when 'Korea desk 3' then 1660
    when 'Vietnam desk 1' then 1160
    when 'Vietnam desk 2' then 1410
    when 'Vietnam desk 3' then 1660
    else position_y
  end
where label in (
  'Korea desk 1', 'Korea desk 2', 'Korea desk 3',
  'Vietnam desk 1', 'Vietnam desk 2', 'Vietnam desk 3'
);
