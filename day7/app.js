const COMMON_TIMEZONES = [
  { value: "UTC", label: "UTC" },
  { value: "America/Los_Angeles", label: "Los Angeles (PT)" },
  { value: "America/Denver", label: "Denver (MT)" },
  { value: "America/Chicago", label: "Chicago (CT)" },
  { value: "America/New_York", label: "New York (ET)" },
  { value: "America/Sao_Paulo", label: "Sao Paulo (BRT)" },
  { value: "Europe/London", label: "London (UK)" },
  { value: "Europe/Paris", label: "Paris (CET)" },
  { value: "Europe/Berlin", label: "Berlin (CET)" },
  { value: "Europe/Athens", label: "Athens (EET)" },
  { value: "Africa/Johannesburg", label: "Johannesburg (SAST)" },
  { value: "Asia/Dubai", label: "Dubai (GST)" },
  { value: "Asia/Kolkata", label: "Kolkata (IST)" },
  { value: "Asia/Bangkok", label: "Bangkok (ICT)" },
  { value: "Asia/Singapore", label: "Singapore (SGT)" },
  { value: "Asia/Tokyo", label: "Tokyo (JST)" },
  { value: "Australia/Sydney", label: "Sydney (AET)" },
  { value: "Pacific/Auckland", label: "Auckland (NZT)" }
];

const MAX_ZONES = 4;
const STORAGE_KEY = "timebridge.settings";

const dateInput = document.getElementById("meeting-date");
const timeInput = document.getElementById("meeting-time");
const sourceZoneSelect = document.getElementById("source-zone");
const zoneList = document.getElementById("zone-list");
const addZoneButton = document.getElementById("add-zone");
const nowButton = document.getElementById("now-btn");
const resultsGrid = document.getElementById("results-grid");
const summaryText = document.getElementById("summary");
const copyButton = document.getElementById("copy-summary");

const timeZoneMap = new Map(COMMON_TIMEZONES.map((zone) => [zone.value, zone.label]));
const localZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

const state = {
  sourceZone: localZone,
  targets: []
};

function formatTimeZoneLabel(timeZone) {
  if (timeZone === "UTC") {
    return "UTC";
  }
  const pieces = timeZone.split("/");
  const region = pieces[0];
  const city = pieces[pieces.length - 1].replace(/_/g, " ");
  return `${city} (${region})`;
}

function ensureTimeZone(timeZone) {
  if (!timeZoneMap.has(timeZone)) {
    const label = formatTimeZoneLabel(timeZone);
    timeZoneMap.set(timeZone, label);
    COMMON_TIMEZONES.push({ value: timeZone, label });
  }
}

function getTimeZoneLabel(timeZone) {
  return timeZoneMap.get(timeZone) || timeZone;
}

function getDefaultTargets() {
  const defaults = ["UTC", "America/New_York", "Europe/London", "Asia/Tokyo"];
  const unique = defaults.filter((zone) => zone !== state.sourceZone);
  if (unique.length < 2) {
    const fallback = COMMON_TIMEZONES.map((zone) => zone.value).filter(
      (zone) => zone !== state.sourceZone
    );
    unique.push(...fallback);
  }
  return [...new Set(unique)].slice(0, 2);
}

function loadSettings() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return;
  }
  try {
    const data = JSON.parse(raw);
    if (data.sourceZone) {
      state.sourceZone = data.sourceZone;
    }
    if (Array.isArray(data.targets)) {
      state.targets = data.targets;
    }
  } catch (error) {
    console.warn("Timebridge settings reset", error);
  }
}

function saveSettings() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      sourceZone: state.sourceZone,
      targets: state.targets
    })
  );
}

function populateSelect(select, selectedValue) {
  select.innerHTML = "";
  COMMON_TIMEZONES.forEach((zone) => {
    const option = document.createElement("option");
    option.value = zone.value;
    option.textContent = zone.label;
    if (zone.value === selectedValue) {
      option.selected = true;
    }
    select.appendChild(option);
  });
}

function addTargetZone(timeZone) {
  if (state.targets.length >= MAX_ZONES) {
    return;
  }
  state.targets.push(timeZone);
  saveSettings();
  renderZoneList();
  renderResults();
}

function removeTargetZone(index) {
  state.targets.splice(index, 1);
  saveSettings();
  renderZoneList();
  renderResults();
}

function renderZoneList() {
  zoneList.innerHTML = "";
  state.targets.forEach((zone, index) => {
    const row = document.createElement("div");
    row.className = "zone-row";

    const select = document.createElement("select");
    populateSelect(select, zone);
    select.addEventListener("change", (event) => {
      state.targets[index] = event.target.value;
      saveSettings();
      renderResults();
    });

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.textContent = "Remove";
    removeButton.addEventListener("click", () => removeTargetZone(index));

    row.appendChild(select);
    row.appendChild(removeButton);
    zoneList.appendChild(row);
  });

  addZoneButton.disabled = state.targets.length >= MAX_ZONES;
}

function pad(value) {
  return String(value).padStart(2, "0");
}

function getParts(date, timeZone) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  });
  const parts = formatter.formatToParts(date);
  const map = {};
  parts.forEach((part) => {
    map[part.type] = part.value;
  });
  return map;
}

function getDateKey(date, timeZone) {
  const parts = getParts(date, timeZone);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function getTimeZoneOffset(date, timeZone) {
  const parts = getParts(date, timeZone);
  const localTime = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second)
  );
  return localTime - date.getTime();
}

function zonedTimeToUtc({ year, month, day, hour, minute }, timeZone) {
  const utcDate = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
  const offset = getTimeZoneOffset(utcDate, timeZone);
  return new Date(utcDate.getTime() - offset);
}

function formatTime(date, timeZone) {
  return new Intl.DateTimeFormat(undefined, {
    timeZone,
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

function formatDate(date, timeZone) {
  return new Intl.DateTimeFormat(undefined, {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric"
  }).format(date);
}

function getTimeZoneAbbr(date, timeZone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "short"
  }).formatToParts(date);
  const tz = parts.find((part) => part.type === "timeZoneName");
  return tz ? tz.value : "";
}

function getDayShiftLabel(sourceKey, targetKey) {
  if (targetKey === sourceKey) {
    return { label: "Same day", className: "same" };
  }
  if (targetKey > sourceKey) {
    return { label: "Next day", className: "next" };
  }
  return { label: "Previous day", className: "prev" };
}

function buildSummary(meetingUtc, sourceZone, targets) {
  const date = formatDate(meetingUtc, sourceZone);
  const time = formatTime(meetingUtc, sourceZone);
  const abbr = getTimeZoneAbbr(meetingUtc, sourceZone);
  const sourceLabel = getTimeZoneLabel(sourceZone);

  const targetItems = targets.map((zone) => {
    const label = getTimeZoneLabel(zone);
    const timeValue = formatTime(meetingUtc, zone);
    const zoneAbbr = getTimeZoneAbbr(meetingUtc, zone);
    return `${label} ${timeValue} ${zoneAbbr}`.trim();
  });

  const suffix = targetItems.length ? ` → ${targetItems.join(" / ")}` : "";
  return `${date} · ${time} ${abbr} (${sourceLabel})${suffix}`.trim();
}

function renderResults() {
  const dateValue = dateInput.value;
  const timeValue = timeInput.value;
  const sourceZone = sourceZoneSelect.value;

  if (!dateValue || !timeValue) {
    summaryText.textContent = "Select a date and time to see conversions.";
    resultsGrid.innerHTML = "";
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = "Pick a meeting date and time, then add time zones to compare.";
    resultsGrid.appendChild(empty);
    copyButton.disabled = true;
    return;
  }

  const [year, month, day] = dateValue.split("-").map(Number);
  const [hour, minute] = timeValue.split(":").map(Number);
  const meetingUtc = zonedTimeToUtc({ year, month, day, hour, minute }, sourceZone);
  const sourceKey = getDateKey(meetingUtc, sourceZone);

  const uniqueTargets = [...new Set(state.targets)].filter(
    (zone) => zone !== sourceZone
  );

  summaryText.textContent = buildSummary(meetingUtc, sourceZone, uniqueTargets);
  copyButton.disabled = false;
  resultsGrid.innerHTML = "";

  const sourceCard = buildCard({
    label: "Source time",
    zoneLabel: getTimeZoneLabel(sourceZone),
    abbr: getTimeZoneAbbr(meetingUtc, sourceZone),
    time: formatTime(meetingUtc, sourceZone),
    date: formatDate(meetingUtc, sourceZone),
    shift: { label: "Anchor", className: "same" },
    isSource: true
  });
  resultsGrid.appendChild(sourceCard);

  if (uniqueTargets.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = "Add at least one time zone to compare.";
    resultsGrid.appendChild(empty);
    return;
  }

  uniqueTargets.forEach((zone) => {
    const targetKey = getDateKey(meetingUtc, zone);
    const shift = getDayShiftLabel(sourceKey, targetKey);
    const card = buildCard({
      label: getTimeZoneLabel(zone),
      zoneLabel: getTimeZoneLabel(zone),
      abbr: getTimeZoneAbbr(meetingUtc, zone),
      time: formatTime(meetingUtc, zone),
      date: formatDate(meetingUtc, zone),
      shift,
      isSource: false
    });
    resultsGrid.appendChild(card);
  });
}

function buildCard({ label, zoneLabel, abbr, time, date, shift, isSource }) {
  const card = document.createElement("div");
  card.className = "result-card";
  if (isSource) {
    card.classList.add("source");
  }

  const title = document.createElement("div");
  title.className = "result-title";
  const titleText = document.createElement("h3");
  titleText.textContent = label;
  const abbrText = document.createElement("span");
  abbrText.textContent = abbr;
  title.appendChild(titleText);
  title.appendChild(abbrText);

  const timeText = document.createElement("div");
  timeText.className = "result-time";
  timeText.textContent = time;

  const dateText = document.createElement("div");
  dateText.className = "result-date";
  dateText.textContent = `${date} · ${zoneLabel}`;

  const shiftText = document.createElement("div");
  shiftText.className = `shift ${shift.className}`;
  shiftText.textContent = shift.label;

  card.appendChild(title);
  card.appendChild(timeText);
  card.appendChild(dateText);
  card.appendChild(shiftText);
  return card;
}

function setNowForZone() {
  const now = new Date();
  const parts = getParts(now, sourceZoneSelect.value);
  dateInput.value = `${parts.year}-${parts.month}-${parts.day}`;
  timeInput.value = `${parts.hour}:${parts.minute}`;
  renderResults();
}

function initInputs() {
  ensureTimeZone(localZone);
  loadSettings();
  ensureTimeZone(state.sourceZone);
  state.targets.forEach((zone) => ensureTimeZone(zone));

  if (!state.targets.length) {
    state.targets = getDefaultTargets();
  }

  populateSelect(sourceZoneSelect, state.sourceZone);
  renderZoneList();

  const now = new Date();
  const parts = getParts(now, state.sourceZone);
  dateInput.value = `${parts.year}-${parts.month}-${parts.day}`;
  timeInput.value = `${parts.hour}:${parts.minute}`;
}

sourceZoneSelect.addEventListener("change", (event) => {
  state.sourceZone = event.target.value;
  saveSettings();
  renderResults();
});

[dateInput, timeInput].forEach((input) =>
  input.addEventListener("input", renderResults)
);

addZoneButton.addEventListener("click", () => {
  const available = COMMON_TIMEZONES.map((zone) => zone.value).filter(
    (zone) => !state.targets.includes(zone)
  );
  const next = available.find((zone) => zone !== state.sourceZone) || available[0];
  if (next) {
    addTargetZone(next);
  }
});

nowButton.addEventListener("click", setNowForZone);

copyButton.addEventListener("click", async () => {
  if (copyButton.disabled) {
    return;
  }
  const text = summaryText.textContent;
  try {
    await navigator.clipboard.writeText(text);
    copyButton.textContent = "Copied";
    setTimeout(() => {
      copyButton.textContent = "Copy summary";
    }, 1600);
  } catch (error) {
    console.warn("Clipboard failed", error);
  }
});

initInputs();
renderResults();
