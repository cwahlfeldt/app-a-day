const elements = {
  names: document.getElementById("names"),
  groupSize: document.getElementById("groupSize"),
  rounds: document.getElementById("rounds"),
  attempts: document.getElementById("attempts"),
  balance: document.getElementById("balance"),
  generateBtn: document.getElementById("generateBtn"),
  sampleBtn: document.getElementById("sampleBtn"),
  clearBtn: document.getElementById("clearBtn"),
  copyBtn: document.getElementById("copyBtn"),
  results: document.getElementById("results"),
  nameCount: document.getElementById("nameCount"),
  repeatCount: document.getElementById("repeatCount"),
  groupCount: document.getElementById("groupCount"),
  minGroupSize: document.getElementById("minGroupSize"),
  error: document.getElementById("error"),
};

const STORAGE_KEY = "round-robin-mixer-v1";
const sampleRoster = [
  "Avery",
  "Jordan",
  "Sam",
  "Kai",
  "Riley",
  "Morgan",
  "Quinn",
  "Parker",
  "Rowan",
  "Sage",
  "Taylor",
  "Blake",
  "Emerson",
  "Hayden",
  "Remy",
].join("\n");

let lastRounds = [];

const parseNames = (text) =>
  text
    .split(/[\n,;]+/)
    .map((entry) => entry.trim())
    .filter(Boolean);

const buildRoster = (text) => {
  const labels = parseNames(text);
  return labels.map((label, index) => ({
    id: `${label}__${index}`,
    label,
  }));
};

const shuffle = (list) => {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const pairKey = (left, right) =>
  left.id < right.id ? `${left.id}|${right.id}` : `${right.id}|${left.id}`;

const splitIntoGroups = (list, size, balance) => {
  if (list.length === 0) return [];
  const safeSize = Math.max(2, Number(size) || 2);
  if (!balance) {
    const groups = [];
    for (let i = 0; i < list.length; i += safeSize) {
      groups.push(list.slice(i, i + safeSize));
    }
    return groups;
  }

  if (list.length <= safeSize) {
    return [list];
  }

  const groupCount = Math.floor(list.length / safeSize);
  if (groupCount === 0) {
    return [list];
  }

  const remainder = list.length % safeSize;
  const sizes = new Array(groupCount).fill(safeSize);
  for (let i = 0; i < remainder; i += 1) {
    sizes[i % groupCount] += 1;
  }

  const groups = [];
  let index = 0;
  sizes.forEach((groupSize) => {
    groups.push(list.slice(index, index + groupSize));
    index += groupSize;
  });
  return groups;
};

const scoreGroups = (groups, pairCounts) => {
  let score = 0;
  groups.forEach((group) => {
    for (let i = 0; i < group.length; i += 1) {
      for (let j = i + 1; j < group.length; j += 1) {
        const key = pairKey(group[i], group[j]);
        score += pairCounts.get(key) || 0;
      }
    }
  });
  return score;
};

const updatePairCounts = (groups, pairCounts) => {
  groups.forEach((group) => {
    for (let i = 0; i < group.length; i += 1) {
      for (let j = i + 1; j < group.length; j += 1) {
        const key = pairKey(group[i], group[j]);
        pairCounts.set(key, (pairCounts.get(key) || 0) + 1);
      }
    }
  });
};

const generateRounds = (roster, settings) => {
  const pairCounts = new Map();
  const rounds = [];

  for (let roundIndex = 0; roundIndex < settings.rounds; roundIndex += 1) {
    let bestGroups = null;
    let bestScore = Number.POSITIVE_INFINITY;

    for (let attempt = 0; attempt < settings.attempts; attempt += 1) {
      const candidate = splitIntoGroups(
        shuffle(roster),
        settings.groupSize,
        settings.balance,
      );
      const score = scoreGroups(candidate, pairCounts);
      if (score < bestScore) {
        bestScore = score;
        bestGroups = candidate;
      }
      if (score === 0) {
        break;
      }
    }

    if (!bestGroups) {
      bestGroups = splitIntoGroups(roster, settings.groupSize, settings.balance);
      bestScore = scoreGroups(bestGroups, pairCounts);
    }

    rounds.push({ groups: bestGroups, score: bestScore });
    updatePairCounts(bestGroups, pairCounts);
  }

  return { rounds, pairCounts };
};

const computeRepeatStats = (pairCounts) => {
  let repeats = 0;
  pairCounts.forEach((count) => {
    if (count > 1) {
      repeats += count - 1;
    }
  });
  return repeats;
};

const renderEmptyState = () => {
  elements.results.innerHTML = `
    <div class="empty">
      <p>Ready when you are.</p>
      <span>Generate rounds to see groups here.</span>
    </div>
  `;
  elements.copyBtn.disabled = true;
  elements.repeatCount.textContent = "0";
  elements.groupCount.textContent = "0";
  elements.minGroupSize.textContent = "-";
};

const renderResults = (rounds, settings) => {
  if (!rounds.length) {
    renderEmptyState();
    return;
  }

  elements.results.innerHTML = "";
  rounds.forEach((round, index) => {
    const card = document.createElement("article");
    card.className = "round-card";
    card.style.animationDelay = `${index * 0.08}s`;

    const header = document.createElement("div");
    header.className = "round-header";

    const title = document.createElement("div");
    title.textContent = `Round ${index + 1}`;

    const meta = document.createElement("span");
    meta.textContent = `repeat score ${round.score}`;

    header.appendChild(title);
    header.appendChild(meta);

    const groupGrid = document.createElement("div");
    groupGrid.className = "group-grid";

    round.groups.forEach((group, groupIndex) => {
      const groupCard = document.createElement("div");
      groupCard.className = "group";
      if (group.length < settings.groupSize) {
        groupCard.classList.add("small");
      }

      const groupTitle = document.createElement("h4");
      groupTitle.textContent = `Group ${groupIndex + 1}`;

      const list = document.createElement("ul");
      group.forEach((member) => {
        const item = document.createElement("li");
        item.textContent = member.label;
        list.appendChild(item);
      });

      groupCard.appendChild(groupTitle);
      groupCard.appendChild(list);
      groupGrid.appendChild(groupCard);
    });

    card.appendChild(header);
    card.appendChild(groupGrid);
    elements.results.appendChild(card);
  });

  elements.copyBtn.disabled = false;
};

const updateSummary = (rounds, pairCounts) => {
  if (!rounds.length) {
    elements.repeatCount.textContent = "0";
    elements.groupCount.textContent = "0";
    elements.minGroupSize.textContent = "-";
    return;
  }

  const groupCount = rounds[0].groups.length;
  let minGroupSize = Infinity;
  rounds.forEach((round) => {
    round.groups.forEach((group) => {
      minGroupSize = Math.min(minGroupSize, group.length);
    });
  });

  elements.repeatCount.textContent = String(computeRepeatStats(pairCounts));
  elements.groupCount.textContent = String(groupCount);
  elements.minGroupSize.textContent = String(minGroupSize);
};

const buildCopyText = (rounds) =>
  rounds
    .map((round, index) => {
      const lines = [`Round ${index + 1}`];
      round.groups.forEach((group, groupIndex) => {
        const names = group.map((member) => member.label).join(", ");
        lines.push(`Group ${groupIndex + 1}: ${names}`);
      });
      return lines.join("\n");
    })
    .join("\n\n");

const updateNameCount = () => {
  const count = parseNames(elements.names.value).length;
  elements.nameCount.textContent = `${count} ${count === 1 ? "person" : "people"}`;
};

const showError = (message) => {
  elements.error.textContent = message;
};

const clearError = () => {
  elements.error.textContent = "";
};

const saveState = () => {
  const payload = {
    names: elements.names.value,
    groupSize: elements.groupSize.value,
    rounds: elements.rounds.value,
    attempts: elements.attempts.value,
    balance: elements.balance.checked,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
};

const loadState = () => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return;
  try {
    const payload = JSON.parse(stored);
    if (typeof payload.names === "string") {
      elements.names.value = payload.names;
    }
    if (payload.groupSize) {
      elements.groupSize.value = payload.groupSize;
    }
    if (payload.rounds) {
      elements.rounds.value = payload.rounds;
    }
    if (payload.attempts) {
      elements.attempts.value = payload.attempts;
    }
    if (typeof payload.balance === "boolean") {
      elements.balance.checked = payload.balance;
    }
  } catch (error) {
    console.warn("Failed to parse stored state", error);
  }
};

const getSettings = () => ({
  groupSize: Math.max(2, Number(elements.groupSize.value) || 2),
  rounds: Math.max(1, Number(elements.rounds.value) || 1),
  attempts: Math.max(50, Number(elements.attempts.value) || 50),
  balance: elements.balance.checked,
});

const handleGenerate = () => {
  clearError();
  const roster = buildRoster(elements.names.value);
  if (roster.length < 2) {
    showError("Add at least two names to generate groups.");
    renderEmptyState();
    return;
  }

  const settings = getSettings();
  const result = generateRounds(roster, settings);
  lastRounds = result.rounds;

  renderResults(result.rounds, settings);
  updateSummary(result.rounds, result.pairCounts);
  saveState();
};

const handleSample = () => {
  elements.names.value = sampleRoster;
  updateNameCount();
  saveState();
};

const handleClear = () => {
  elements.names.value = "";
  lastRounds = [];
  updateNameCount();
  renderEmptyState();
  clearError();
  saveState();
};

const handleCopy = async () => {
  if (!lastRounds.length) return;
  try {
    await navigator.clipboard.writeText(buildCopyText(lastRounds));
    elements.copyBtn.textContent = "Copied";
    setTimeout(() => {
      elements.copyBtn.textContent = "Copy";
    }, 1600);
  } catch (error) {
    showError("Unable to copy. Try selecting the text manually.");
  }
};

const bindEvents = () => {
  elements.names.addEventListener("input", () => {
    updateNameCount();
    saveState();
  });
  [elements.groupSize, elements.rounds, elements.attempts, elements.balance].forEach(
    (input) => {
      input.addEventListener("change", saveState);
    },
  );

  elements.generateBtn.addEventListener("click", handleGenerate);
  elements.sampleBtn.addEventListener("click", handleSample);
  elements.clearBtn.addEventListener("click", handleClear);
  elements.copyBtn.addEventListener("click", handleCopy);
};

const init = () => {
  loadState();
  updateNameCount();
  renderEmptyState();
  bindEvents();
};

init();
