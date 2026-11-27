import { getPlayers } from '@/lib/sleeper';
import { getAdminAuth } from '@/lib/admin/auth';

export const ADMIN_PLAYER_POSITIONS = [
  'QB',
  'RB',
  'WR',
  'TE',
  'K',
  'FB',
  'DL',
  'DE',
  'DT',
  'LB',
  'DB',
  'CB',
  'S',
  'SS',
  'FS',
  'OL',
  'OT',
  'OG',
  'C',
  'P',
  'LS'
] as const;

export type AdminPlayerPosition =
  typeof ADMIN_PLAYER_POSITIONS[number];

export type AdminPlayerOption = {
  playerId: string;
  playerName: string;
  position: string;
  nflTeam: string | null;
  status: string | null;
};

export type AdminPlayerSearchResult = {
  query: string;
  position: string;
  totalMatches: number;
  returnedResults: number;
  players: AdminPlayerOption[];
};

const allowedPositions = new Set<string>(
  ADMIN_PLAYER_POSITIONS
);

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function getSearchScore(
  player: AdminPlayerOption,
  query: string
): number {
  const name = normalizeText(player.playerName);
  const search = normalizeText(query);

  if (player.playerId === query.trim()) {
    return 1000;
  }

  if (!search) {
    return 0;
  }

  if (name === search) {
    return 900;
  }

  if (name.startsWith(search)) {
    return 800;
  }

  if (
    name.split(' ').some(
      word => word.startsWith(search)
    )
  ) {
    return 700;
  }

  if (name.includes(search)) {
    return 600;
  }

  const searchWords = search.split(' ');

  if (
    searchWords.every(
      word => name.includes(word)
    )
  ) {
    return 500;
  }

  return 0;
}

export async function searchAdminPlayers(
  query: string,
  position: string = 'ALL',
  limit: number = 25
): Promise<AdminPlayerSearchResult> {
  const auth = await getAdminAuth();

  if (!auth.authorized) {
    throw new Error(
      'Administrator access required.'
    );
  }

  const cleanQuery = query.trim().slice(0, 100);

  const cleanPosition =
    position.trim().toUpperCase();

  if (
    cleanPosition !== 'ALL' &&
    !allowedPositions.has(cleanPosition)
  ) {
    throw new Error('Invalid player position.');
  }

  const safeLimit = Number.isFinite(limit)
    ? Math.min(50, Math.max(1, Math.floor(limit)))
    : 25;

  if (normalizeText(cleanQuery).length < 2) {
    return {
      query: cleanQuery,
      position: cleanPosition,
      totalMatches: 0,
      returnedResults: 0,
      players: []
    };
  }

  const sleeperPlayers = await getPlayers();

  if (
    !sleeperPlayers ||
    typeof sleeperPlayers !== 'object' ||
    Array.isArray(sleeperPlayers) ||
    Object.keys(sleeperPlayers).length === 0
  ) {
    throw new Error(
      'Sleeper player database is unavailable.'
    );
  }

  const matches: {
    player: AdminPlayerOption;
    score: number;
  }[] = [];

  for (
    const [id, player] of
    Object.entries(sleeperPlayers)
  ) {
    if (!player) {
      continue;
    }

    const playerId = player.player_id ?? id;

    const playerName =
      player.full_name?.trim() ||
      [
        player.first_name,
        player.last_name
      ]
        .filter(Boolean)
        .join(' ')
        .trim();

    const playerPosition =
      player.position?.trim().toUpperCase();

    if (
      !playerId ||
      !playerName ||
      !playerPosition ||
      !allowedPositions.has(playerPosition)
    ) {
      continue;
    }

    if (
      cleanPosition !== 'ALL' &&
      playerPosition !== cleanPosition
    ) {
      continue;
    }

    const option: AdminPlayerOption = {
      playerId,
      playerName,
      position: playerPosition,
      nflTeam: player.team ?? null,
      status: player.status ?? null
    };

    const score = getSearchScore(
      option,
      cleanQuery
    );

    if (score > 0) {
      matches.push({
        player: option,
        score
      });
    }
  }

  matches.sort((a, b) =>
    b.score - a.score ||
    a.player.playerName.localeCompare(
      b.player.playerName,
      'en'
    ) ||
    a.player.playerId.localeCompare(
      b.player.playerId
    )
  );

  const players = matches
    .slice(0, safeLimit)
    .map(match => match.player);

  return {
    query: cleanQuery,
    position: cleanPosition,
    totalMatches: matches.length,
    returnedResults: players.length,
    players
  };
}
