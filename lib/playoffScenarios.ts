export type ScenarioStatus =
  | 'clinchedTopSeed'
  | 'clinchedBye'
  | 'clinchedPlayoffs'
  | 'inTheHunt'
  | 'eliminated'
  | 'unknown';

export type ScenarioTeam = {
  rosterId: number;
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  gamesPlayed: number;
  remainingSchedule: {
    week: number;
    opponentRosterId: number;
  }[];
};

export type ScenarioResult = {
  rosterId: number;
  status: ScenarioStatus;
  bestPossibleSeed: number | null;
  worstPossibleSeed: number | null;
  clinchedTopSeed: boolean;
  clinchedBye: boolean;
  clinchedPlayoffs: boolean;
  eliminated: boolean;
};

type ScenarioGame = {
  home: number;
  away: number;
};

function unknownResult(
  rosterId: number
): ScenarioResult {
  return {
    rosterId,
    status: 'unknown',
    bestPossibleSeed: null,
    worstPossibleSeed: null,
    clinchedTopSeed: false,
    clinchedBye: false,
    clinchedPlayoffs: false,
    eliminated: false
  };
}

export function calculatePlayoffScenarios(
  teams: ScenarioTeam[],
  playoffSpots: number,
  byeSpots: number,
  regularSeasonEnd: number,
  scheduleComplete: boolean
): ScenarioResult[] {
  const unknown = () =>
    teams.map(team =>
      unknownResult(team.rosterId)
    );

  const teamCount = teams.length;

  if (
    !scheduleComplete ||
    teamCount === 0 ||
    playoffSpots < 1 ||
    playoffSpots > teamCount ||
    byeSpots < 1 ||
    byeSpots > playoffSpots
  ) {
    return unknown();
  }

  const indexByRoster = new Map(
    teams.map((team, index) => [
      team.rosterId,
      index
    ])
  );

  if (indexByRoster.size !== teamCount) {
    return unknown();
  }

  const games: ScenarioGame[] = [];

  for (let i = 0; i < teamCount; i++) {
    const team = teams[i];

    if (
      team.gamesPlayed !==
        team.wins + team.losses + team.ties ||
      team.gamesPlayed < 0 ||
      team.gamesPlayed > regularSeasonEnd
    ) {
      return unknown();
    }

    const remaining =
      regularSeasonEnd - team.gamesPlayed;

    if (
      team.remainingSchedule.length !== remaining
    ) {
      return unknown();
    }

    const seenWeeks = new Set<number>();

    for (const game of team.remainingSchedule) {
      const opponent = indexByRoster.get(
        game.opponentRosterId
      );

      if (
        opponent === undefined ||
        opponent === i ||
        seenWeeks.has(game.week) ||
        game.week <= team.gamesPlayed ||
        game.week > regularSeasonEnd
      ) {
        return unknown();
      }

      seenWeeks.add(game.week);

      const reverse = teams[
        opponent
      ].remainingSchedule.filter(
        other =>
          other.week === game.week &&
          other.opponentRosterId === team.rosterId
      );

      if (reverse.length !== 1) {
        return unknown();
      }

      if (i < opponent) {
        games.push({
          home: i,
          away: opponent
        });
      }
    }
  }

  // Two units for a win, one for a tie.
  // This avoids floating-point record comparisons.
  const initialRecords = teams.map(
    team => team.wins * 2 + team.ties
  );

  const remainingGames = teams.map(
    team => team.remainingSchedule.length
  );

  function makeResult(
    index: number,
    best: number,
    worst: number
  ): ScenarioResult {
    const clinchedTopSeed = worst === 1;
    const clinchedBye = worst <= byeSpots;
    const clinchedPlayoffs =
      worst <= playoffSpots;

    const eliminated = best > playoffSpots;

    let status: ScenarioStatus = 'inTheHunt';

    if (clinchedTopSeed) {
      status = 'clinchedTopSeed';
    } else if (clinchedBye) {
      status = 'clinchedBye';
    } else if (clinchedPlayoffs) {
      status = 'clinchedPlayoffs';
    } else if (eliminated) {
      status = 'eliminated';
    }

    return {
      rosterId: teams[index].rosterId,
      status,
      bestPossibleSeed: best,
      worstPossibleSeed: worst,
      clinchedTopSeed,
      clinchedBye,
      clinchedPlayoffs,
      eliminated
    };
  }

  // Final regular-season standings.
  // Points For is now known.
  if (games.length === 0) {
    return teams.map((team, index) => {
      let best = 1;
      let worst = 1;

      teams.forEach((opponent, other) => {
        if (other === index) return;

        const recordDifference =
          initialRecords[other] -
          initialRecords[index];

        const pointsDifference =
          Math.round(opponent.pointsFor * 100) -
          Math.round(team.pointsFor * 100);

        if (
          recordDifference > 0 ||
          (
            recordDifference === 0 &&
            pointsDifference > 0
          )
        ) {
          best++;
          worst++;
        } else if (
          recordDifference === 0 &&
          pointsDifference === 0
        ) {
          worst++;
        }
      });

      return makeResult(index, best, worst);
    });
  }

  // Conservative seed bounds for early-season use.
  function calculateBounds(
    target: number
  ): [number, number] {
    const minimum = initialRecords[target];

    const maximum =
      minimum + remainingGames[target] * 2;

    let best = 1;
    let worst = 1;

    for (let i = 0; i < teamCount; i++) {
      if (i === target) continue;

      const opponentMinimum =
        initialRecords[i];

      const opponentMaximum =
        opponentMinimum + remainingGames[i] * 2;

      if (opponentMinimum > maximum) {
        best++;
      }

      if (opponentMaximum >= minimum) {
        worst++;
      }
    }

    return [best, worst];
  }

  function calculateExtreme(
    target: number,
    bestCase: boolean,
    fallback: number
  ): number {
    const records = [...initialRecords];

    const otherGames: ScenarioGame[] = [];

    // For the best seed, the target wins every
    // remaining game. For the worst, it loses.
    for (const game of games) {
      if (
        game.home === target ||
        game.away === target
      ) {
        const opponent =
          game.home === target
            ? game.away
            : game.home;

        if (bestCase) {
          records[target] += 2;
        } else {
          records[opponent] += 2;
        }
      } else {
        otherGames.push(game);
      }
    }

    // Limit computation time on the server.
    if (otherGames.length > 12) {
      return fallback;
    }

    let extreme = bestCase ? teamCount : 1;
    const targetRecord = records[target];

    function search(position: number) {
      if (extreme === fallback) return;

      if (position === otherGames.length) {
        let seed = 1;

        for (let i = 0; i < teamCount; i++) {
          if (i === target) continue;

          const ahead = bestCase
            ? records[i] > targetRecord
            : records[i] >= targetRecord;

          if (ahead) seed++;
        }

        extreme = bestCase
          ? Math.min(extreme, seed)
          : Math.max(extreme, seed);

        return;
      }

      const game = otherGames[position];

      // Home win
      records[game.home] += 2;
      search(position + 1);
      records[game.home] -= 2;

      // Away win
      records[game.away] += 2;
      search(position + 1);
      records[game.away] -= 2;

      // Tie
      records[game.home]++;
      records[game.away]++;
      search(position + 1);
      records[game.home]--;
      records[game.away]--;
    }

    search(0);

    return extreme;
  }

  return teams.map((team, index) => {
    const [bestBound, worstBound] =
      calculateBounds(index);

    const best = calculateExtreme(
      index,
      true,
      bestBound
    );

    const worst = calculateExtreme(
      index,
      false,
      worstBound
    );

    return makeResult(index, best, worst);
  });
}
