// Shared, in-memory backend for browser integration tests. SQL policy tests use PostgreSQL instead.
export const social = { enabled: false, rooms: {}, states: [], rematches: {}, calls: [] };
export function socialRoom(id, fixture) { return social.rooms[id] || (fixture.room?.id === id ? fixture.room : null); }
const functions = ['get_my_library','set_room_hidden','mark_room_comment_read','get_room_rematch','request_room_rematch','create_rematch_room'];
export async function handleSocial(route, userId, fixture) {
  const url = new URL(route.request().url()); const name = url.pathname.split('/').pop();
  const reply = async (value, status = 200) => { await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(value) }); return true; };
  const denied = () => reply({ code: '42501', message: 'ROOM_NOT_AVAILABLE' }, 403);
  const method = route.request().method();
  if (functions.includes(name) && !social.enabled) return reply({ code: 'PGRST202', message: 'Function not installed in fixture' }, 404);
  if (!social.enabled) return false;
  const body = method === 'POST' ? route.request().postDataJSON() : {};
  const canRead = room => room && (room.host_id === userId || room.guest_id === userId);
  const stateFor = roomId => {
    let state = social.states.find(item => item.room_id === roomId && item.user_id === userId);
    if (!state) { state = { room_id: roomId, user_id: userId, hidden: false, read_at: null }; social.states.push(state); }
    return state;
  };
  const roundFor = parent => {
    const saved = social.rematches[parent.id]; const next = saved?.next_room_id ? socialRoom(saved.next_room_id, fixture) : null;
    return { parent_room_id: parent.id, starter_id: parent.guest_id, partner_id: parent.host_id, prompt: parent.prompt,
      requested_by: saved?.requested_by ?? null, next_room_id: next?.id ?? null, next_code: next?.code ?? null,
      next_status: next ? next.status !== 'completed' && Date.parse(next.expires_at) <= Date.now() ? 'expired' : next.status : null };
  };
  if (functions.includes(name)) social.calls.push({ name, userId, body });
  if (name === 'get_my_library') {
    const all = Object.keys(social.rooms).length ? Object.values(social.rooms) : fixture.room ? [fixture.room] : [];
    const eligible = all.filter(room => canRead(room) && (body.p_scope === 'all' || (body.p_scope === 'host' ? room.host_id === userId : room.guest_id === userId)) && Boolean(social.states.find(s => s.room_id === room.id && s.user_id === userId)?.hidden) === body.p_hidden)
      .sort((a,b) => b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id));
    return reply({ total: eligible.length, rooms: eligible.slice(body.p_page * 6, body.p_page * 6 + 6).map(room => {
      const state = social.states.find(s => s.room_id === room.id && s.user_id === userId);
      const friend = fixture.comments.find(c => c.room_id === room.id && c.author_id === (room.host_id === userId ? room.guest_id : room.host_id));
      return { id: room.id, code: room.code, prompt: room.prompt, status: room.status, created_at: room.created_at, expires_at: room.expires_at, host_id: room.host_id, guest_id: room.guest_id,
        has_unread_comment: room.status === 'completed' && Boolean(friend && (!state?.read_at || Date.parse(friend.updated_at) > Date.parse(state.read_at))) };
    }) });
  }
  if (name === 'set_room_hidden') {
    if (!canRead(socialRoom(body.p_room_id, fixture))) return denied();
    stateFor(body.p_room_id).hidden = body.p_hidden; return reply(body.p_hidden);
  }
  if (name === 'mark_room_comment_read') {
    const room = socialRoom(body.p_room_id, fixture); if (!canRead(room) || room.status !== 'completed') return denied();
    const friend = fixture.comments.find(c => c.room_id === room.id && c.author_id === (room.host_id === userId ? room.guest_id : room.host_id));
    if (!friend) return reply(false);
    const state = stateFor(room.id); const seen = Math.min(Date.parse(body.p_seen_updated_at), Date.parse(friend.updated_at));
    state.read_at = new Date(Math.max(state.read_at ? Date.parse(state.read_at) : 0, seen)).toISOString(); return reply(true);
  }
  if (['get_room_rematch','request_room_rematch','create_rematch_room'].includes(name)) {
    const parent = socialRoom(body.p_parent_room_id, fixture);
    if (!canRead(parent) || parent.status !== 'completed') return denied();
    if (name === 'get_room_rematch') return reply(roundFor(parent));
    const next = social.rematches[parent.id]?.next_room_id ? socialRoom(social.rematches[parent.id].next_room_id, fixture) : null;
    if (name === 'request_room_rematch') {
      social.rematches[parent.id] ??= { requested_by: userId, next_room_id: null };
      if (next && next.status !== 'completed' && Date.parse(next.expires_at) <= Date.now()) social.rematches[parent.id] = { requested_by: userId, next_room_id: null };
      return reply(roundFor(parent));
    }
    if (parent.guest_id !== userId) return denied();
    let room = next && (next.status === 'completed' || Date.parse(next.expires_at) > Date.now()) ? next : null;
    if (!room) {
      fixture.writes++;
      const id = crypto.randomUUID(); room = { id, code: id.replaceAll('-','').slice(0,10).toUpperCase(), prompt: body.p_prompt, host_id: userId, guest_id: null, status: 'waiting', created_at: new Date().toISOString(), expires_at: new Date(Date.now()+7*86400000).toISOString(), drawings: [{ role: 'left', strokes: body.p_strokes, completed: true }] };
      social.rooms[id] = room; social.rematches[parent.id] ??= { requested_by: userId };
      social.rematches[parent.id].next_room_id = id;
    }
    return reply({ room_id: room.id, room_code: room.code, prompt: room.prompt, room_status: room.status, expires_at: room.expires_at });
  }
  if (name === 'join_room') {
    const room = Object.values(social.rooms).find(room => room.code === body.room_code);
    if (!room || room.host_id === userId) return denied();
    const source = Object.entries(social.rematches).find(([,round]) => round.next_room_id === room.id)?.[0];
    if (source && socialRoom(source, fixture)?.host_id !== userId) return denied();
    if (room.guest_id && room.guest_id !== userId) return denied();
    room.guest_id = userId; if (room.status !== 'completed') room.status = 'guest_joined';
    return reply([{ room_id: room.id, prompt: room.prompt, room_status: room.status, expires_at: room.expires_at }]);
  }
  if (name === 'get_left_preview') {
    const room = socialRoom(body.requested_room_id, fixture);
    if (!room || room.guest_id !== userId) return denied();
    return reply(room.drawings[0].strokes.map(s => ({ ...s, points: s.points.filter(p => p.x >= 376 && p.x <= 400) })).filter(s => s.points.length));
  }
  if (name === 'rooms' && url.searchParams.has('id')) {
    const room = socialRoom(url.searchParams.get('id').replace(/^eq\./,''), fixture);
    return canRead(room) ? reply(room) : denied();
  }
  if (name === 'drawings' && method === 'POST') {
    const room = socialRoom(body.room_id, fixture);
    if (!room || room.guest_id !== userId) return denied();
    if (!room.drawings.some(d => d.role === 'right')) room.drawings.push({ role: 'right', strokes: body.strokes, completed: true });
    room.status = 'completed'; fixture.writes++; return reply([], 201);
  }
  return false;
}
