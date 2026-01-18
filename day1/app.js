const namesInput = document.getElementById("names");
const nameCount = document.getElementById("nameCount");
const groupSizeInput = document.getElementById("groupSize");
const iterationsInput = document.getElementById("iterations");
const balanceInput = document.getElementById("balance");
const avoidRepeatsInput = document.getElementById("avoidRepeats");
const generateButton = document.getElementById("generate");
const clearButton = document.getElementById("clear");
const statusLine = document.getElementById("status");
const results = document.getElementById("results");
const groupCount = document.getElementById("groupCount");
const copyButton = document.getElementById("copy");
const saveButton = document.getElementById("save");
const clearHistoryButton = document.getElementById("clearHistory");
const sessionCount = document.getElementById("sessionCount");
const pairCount = document.getElementById("pairCount");
const lastSaved = document.getElementById("lastSaved");

const STORAGE_KEY = "fairly-history-v1";

let latestGroups = [];
let history = loadHistory();

function loadHistory() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (stored && stored.pairs) {
      return stored;
    }
  } catch (error) {
    console.warn("History load failed", error);
  }
  return { pairs: {}, sessions: 0, updatedAt: null };
}

function saveHistory() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  renderHistory();
}

function renderHistory() {
  const pairTotal = Object.keys(history.pairs).length;
  sessionCount.textContent = history.sessions || 0;
  pairCount.textContent = pairTotal;
  lastSaved.textContent = history.updatedAt
    ? new Date(history.updatedAt).toLocaleString()
    : "Never";
}

function parseNames(value) {
  return value
    .split(/\r?\n/)
    .map((name) => name.trim())
    .filter(Boolean);
}

function findDuplicates(names) {
  const seen = new Set();
  const duplicates = new Set();
  names.forEach((name) => {
    const key = name.toLowerCase();
    if (seen.has(key)) {
      duplicates.add(name);
    }
    seen.add(key);
  });
  return Array.from(duplicates);
}

function updateNameCount() {
  const names = parseNames(namesInput.value);
  nameCount.textContent = `${names.length} name${names.length === 1 ? "" : "s"}`;
}

function shuffleArray(items) {
  const array = [...items];
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function groupSizes(total, targetSize, balance) {
  if (!balance) {
    const sizes = [];
    const fullGroups = Math.floor(total / targetSize);
    for (let i = 0; i < fullGroups; i += 1) {
      sizes.push(targetSize);
    }
    const remainder = total % targetSize;
    if (remainder) {
      sizes.push(remainder);
    }
    return sizes;
  }

  const groupCount = Math.ceil(total / targetSize);
  const base = Math.floor(total / groupCount);
  const remainder = total % groupCount;
  const sizes = new Array(groupCount).fill(base);
  for (let i = 0; i < remainder; i += 1) {
    sizes[i] += 1;
  }
  return sizes;
}

function buildGroups(names, sizes) {
  const groups = [];
  let index = 0;
  sizes.forEach((size) => {
    groups.push(names.slice(index, index + size));
    index += size;
  });
  return groups;
}

function pairKey(nameA, nameB) {
  return nameA < nameB ? `${nameA}||${nameB}` : `${nameB}||${nameA}`;
}

function scoreGroups(groups) {
  let score = 0;
  groups.forEach((group) => {
    for (let i = 0; i < group.length; i += 1) {
      for (let j = i + 1; j < group.length; j += 1) {
        const key = pairKey(group[i], group[j]);
        score += history.pairs[key] || 0;
      }
    }
  });
  return score;
}

function generateGroups(names, size, balance, avoidRepeats, iterations) {
  const sizes = groupSizes(names.length, size, balance);
  if (!avoidRepeats) {
    const shuffled = shuffleArray(names);
    return buildGroups(shuffled, sizes);
  }

  let bestGroups = null;
  let bestScore = Infinity;

  // Search many shuffles to minimize repeated pairings.
  for (let i = 0; i < iterations; i += 1) {
    const shuffled = shuffleArray(names);
    const candidate = buildGroups(shuffled, sizes);
    const candidateScore = scoreGroups(candidate);
    if (candidateScore < bestScore) {
      bestScore = candidateScore;
      bestGroups = candidate;
      if (bestScore === 0) {
        break;
      }
    }
  }

  return bestGroups || buildGroups(shuffleArray(names), sizes);
}

function renderGroups(groups) {
  results.innerHTML = "";
  results.classList.remove("empty");

  groups.forEach((group, index) => {
    const card = document.createElement("div");
    card.className = "group";
    card.style.animationDelay = `${index * 0.05}s`;

    const title = document.createElement("h3");
    title.textContent = `Group ${index + 1}`;

    const list = document.createElement("ul");
    group.forEach((name) => {
      const item = document.createElement("li");
      item.textContent = name;
      list.appendChild(item);
    });

    card.appendChild(title);
    card.appendChild(list);
    results.appendChild(card);
  });

  groupCount.textContent = `${groups.length} group${groups.length === 1 ? "" : "s"}`;
}

function setStatus(message, isError = false) {
  statusLine.textContent = message;
  statusLine.classList.toggle("error", isError);
}

function resetResults() {
  results.innerHTML = "<p>Groups will appear here.</p>";
  results.classList.add("empty");
  groupCount.textContent = "0 groups";
  copyButton.disabled = true;
  saveButton.disabled = true;
  latestGroups = [];
}

function handleGenerate() {
  const names = parseNames(namesInput.value);
  const duplicates = findDuplicates(names);
  const avoidRepeats = avoidRepeatsInput.checked;
  if (!names.length) {
    setStatus("Add at least two names to generate groups.", true);
    resetResults();
    return;
  }

  if (duplicates.length && avoidRepeats) {
    setStatus(
      `Duplicate names found: ${duplicates.join(", ")}. Add initials or nicknames to keep history accurate.`,
      true
    );
    resetResults();
    return;
  }

  const size = Number(groupSizeInput.value);
  const iterations = Number(iterationsInput.value);

  if (!Number.isInteger(size) || size < 2) {
    setStatus("Group size must be 2 or more.", true);
    resetResults();
    return;
  }

  if (names.length < 2) {
    setStatus("Add at least two names to generate groups.", true);
    resetResults();
    return;
  }

  if (!Number.isInteger(iterations) || iterations < 50) {
    setStatus("Search depth must be 50 or more.", true);
    resetResults();
    return;
  }

  if (size > names.length) {
    setStatus("Group size cannot exceed total names.", true);
    resetResults();
    return;
  }

  const groups = generateGroups(
    names,
    size,
    balanceInput.checked,
    avoidRepeats,
    iterations
  );

  latestGroups = groups;
  renderGroups(groups);
  copyButton.disabled = false;
  saveButton.disabled = !avoidRepeats;
  setStatus(
    avoidRepeats
      ? "Groups generated with repeat-aware search. Save if they look good."
      : duplicates.length
        ? "Groups generated. Duplicate names may limit future history."
        : "Groups generated."
  );
}

function handleSave() {
  if (!latestGroups.length) {
    return;
  }

  latestGroups.forEach((group) => {
    for (let i = 0; i < group.length; i += 1) {
      for (let j = i + 1; j < group.length; j += 1) {
        const key = pairKey(group[i], group[j]);
        history.pairs[key] = (history.pairs[key] || 0) + 1;
      }
    }
  });

  history.sessions = (history.sessions || 0) + 1;
  history.updatedAt = new Date().toISOString();
  saveHistory();
  setStatus("Saved this round to history.");
}

function handleCopy() {
  if (!latestGroups.length) {
    return;
  }

  const text = latestGroups
    .map((group, index) => `Group ${index + 1}: ${group.join(", ")}`)
    .join("\n");

  navigator.clipboard
    .writeText(text)
    .then(() => {
      setStatus("Groups copied to clipboard.");
    })
    .catch(() => {
      setStatus("Clipboard blocked. Select and copy from the results.", true);
    });
}

function handleClear() {
  namesInput.value = "";
  updateNameCount();
  setStatus("");
  resetResults();
}

function handleClearHistory() {
  history = { pairs: {}, sessions: 0, updatedAt: null };
  saveHistory();
  setStatus("History cleared.");
}

namesInput.addEventListener("input", updateNameCount);
generateButton.addEventListener("click", handleGenerate);
clearButton.addEventListener("click", handleClear);
copyButton.addEventListener("click", handleCopy);
saveButton.addEventListener("click", handleSave);
clearHistoryButton.addEventListener("click", handleClearHistory);

updateNameCount();
renderHistory();
resetResults();
