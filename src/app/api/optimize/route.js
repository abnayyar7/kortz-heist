const PLAYER_CAPACITY = 100;

function getStateKey(loads) {
  // Bags are interchangeable during optimization, so equivalent load sets share a state.
  return [...loads].sort((first, second) => first - second).join(",");
}

function retainBestState(states, candidate) {
  const key = getStateKey(candidate.loads);
  const existing = states.get(key);

  if (!existing || candidate.profit > existing.profit) {
    states.set(key, candidate);
  }
}

function addItemToStates(states, item, itemIndex, itemProfit) {
  const nextStates = new Map();

  for (const state of states.values()) {
    for (let playerIndex = 0; playerIndex < state.loads.length; playerIndex += 1) {
      const nextLoad = state.loads[playerIndex] + item["Weight"];

      if (nextLoad > PLAYER_CAPACITY) {
        continue;
      }

      // Identical current bag loads need only one placement to avoid duplicate states.
      if (state.loads.indexOf(state.loads[playerIndex]) !== playerIndex) {
        continue;
      }

      const loads = [...state.loads];
      loads[playerIndex] = nextLoad;
      const assignments = state.assignments.map((assignedItems, index) =>
        index === playerIndex ? [...assignedItems, itemIndex] : assignedItems,
      );

      retainBestState(nextStates, {
        loads,
        assignments,
        profit: state.profit + itemProfit,
      });
    }
  }

  return nextStates;
}

function isValidItem(item) {
  return (
    item !== null &&
    typeof item === "object" &&
    typeof item.isSecondary === "boolean" &&
    Number.isFinite(item["Min value"]) &&
    Number.isFinite(item["Max value"]) &&
    item["Min value"] <= item["Max value"] &&
    Number.isInteger(item["Weight"]) &&
    item["Weight"] > 0
  );
}

function distributeByFloor(assignments, selectedItems, players) {
  // Collect all selected items
  const selectedIndices = [];
  for (let pIdx = 0; pIdx < assignments.length; pIdx++) {
    for (const itemIdx of assignments[pIdx]) {
      selectedIndices.push(itemIdx);
    }
  }

  // Group items by floor; items without Floor property go to leftover pool
  const floorGroups = {}; // floor -> itemIndices
  const noFloorItems = [];

  for (const itemIdx of selectedIndices) {
    const floor = selectedItems[itemIdx].Floor;
    if (floor === undefined || floor === null) {
      noFloorItems.push(itemIdx);
    } else {
      if (!floorGroups[floor]) {
        floorGroups[floor] = [];
      }
      floorGroups[floor].push(itemIdx);
    }
  }

  // Initialize new assignments
  const newAssignments = Array.from({ length: players }, () => []);
  const loads = Array(players).fill(0);

  // Distribute items by floor group: fill one player with same-floor items first
  const sortedFloors = Object.keys(floorGroups).sort();
  let playerIndex = 0;

  for (const floor of sortedFloors) {
    const itemsForFloor = floorGroups[floor];

    for (const itemIdx of itemsForFloor) {
      const weight = selectedItems[itemIdx].Weight;

      // Try to fit starting from current player, then overflow to next players
      let placed = false;
      for (let p = playerIndex; p < players; p++) {
        if (loads[p] + weight <= PLAYER_CAPACITY) {
          newAssignments[p].push(itemIdx);
          loads[p] += weight;
          placed = true;
          if (p > playerIndex) playerIndex = p;
          break;
        }
      }

      if (!placed) {
        // Fallback: return original assignments if redistribution fails
        return assignments;
      }
    }
  }

  // Fill remaining capacity with no-floor items
  for (const itemIdx of noFloorItems) {
    const weight = selectedItems[itemIdx].Weight;
    let placed = false;

    for (let p = 0; p < players; p++) {
      if (loads[p] + weight <= PLAYER_CAPACITY) {
        newAssignments[p].push(itemIdx);
        loads[p] += weight;
        placed = true;
        break;
      }
    }

    if (!placed) {
      return assignments; // Fallback: return original if can't redistribute
    }
  }

  return newAssignments;
}

export async function POST(request) {
  let payload;

  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  if (
    !payload ||
    !Number.isInteger(payload.players) ||
    payload.players < 1 ||
    payload.players > 4 ||
    !Array.isArray(payload.selectedItems) ||
    !payload.selectedItems.every(isValidItem)
  ) {
    return Response.json(
      {
        error:
          "Provide players as an integer from 1 to 4 and selectedItems with valid values, positive integer weights, and boolean isSecondary fields.",
      },
      { status: 400 },
    );
  }

  const { players, selectedItems } = payload;
  const profits = selectedItems.map(
    (item) => (item["Min value"] + item["Max value"]) / 2,
  );
  const mandatoryIndices = [];
  const optionalIndices = [];

  selectedItems.forEach((item, index) => {
    (item.isSecondary ? mandatoryIndices : optionalIndices).push(index);
  });

  // Mandatory items cannot be skipped; reject the request if they cannot be packed.
  let states = new Map([
    [
      getStateKey(Array(players).fill(0)),
      {
        loads: Array(players).fill(0),
        assignments: Array.from({ length: players }, () => []),
        profit: 0,
      },
    ],
  ]);

  for (const itemIndex of mandatoryIndices) {
    states = addItemToStates(
      states,
      selectedItems[itemIndex],
      itemIndex,
      profits[itemIndex],
    );

    if (states.size === 0) {
      return Response.json(
        { error: "Mandatory items cannot be distributed within the players' bag capacities." },
        { status: 422 },
      );
    }
  }

  // For each optional item, retain both the skip choice and every feasible bag placement.
  for (const itemIndex of optionalIndices) {
    const nextStates = new Map(states);
    const placedStates = addItemToStates(
      states,
      selectedItems[itemIndex],
      itemIndex,
      profits[itemIndex],
    );

    for (const candidate of placedStates.values()) {
      retainBestState(nextStates, candidate);
    }

    states = nextStates;
  }

  const bestState = [...states.values()].reduce((best, state) =>
    state.profit > best.profit ? state : best,
  );

  // Redistribute items by floor to group same-floor items in same player's bag
  const floorOptimizedAssignments = distributeByFloor(
    bestState.assignments,
    selectedItems,
    players,
  );

  return Response.json(
    floorOptimizedAssignments.map((assignedItems, index) => ({
      player: index + 1,
      items: assignedItems.map((itemIndex) => ({ ...selectedItems[itemIndex] })),
      totalProfit: assignedItems.reduce(
        (total, itemIndex) => total + profits[itemIndex],
        0,
      ),
    })),
  );
}