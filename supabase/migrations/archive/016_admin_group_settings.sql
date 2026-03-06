-- Migration 016: Admin Group Management RPCs

-- List all groups with member counts and owner info
CREATE OR REPLACE FUNCTION admin_get_groups()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    SELECT COALESCE(json_agg(json_build_object(
      'id',           g.id,
      'name',         g.name,
      'owner_id',     g.owner_id,
      'owner_email',  pr.email,
      'join_code',    g.join_code,
      'max_members',  g.max_members,
      'member_count', COALESCE(mc.cnt, 0),
      'created_at',   g.created_at
    ) ORDER BY g.created_at DESC), '[]'::json)
    FROM groups g
    JOIN profiles pr ON pr.id = g.owner_id
    LEFT JOIN (
      SELECT group_id, count(*)::integer AS cnt
      FROM group_members
      GROUP BY group_id
    ) mc ON mc.group_id = g.id
  );
END;
$$;

-- Update a group's max_members (admin only)
CREATE OR REPLACE FUNCTION admin_update_group(
  p_group_id    TEXT,
  p_max_members INT
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE groups SET max_members = p_max_members WHERE id = p_group_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Group not found');
  END IF;

  RETURN json_build_object('success', true);
END;
$$;
