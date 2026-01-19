const elements = {
  entryForm: document.getElementById("entryForm"),
  item: document.getElementById("item"),
  store: document.getElementById("store"),
  purchaseDate: document.getElementById("purchaseDate"),
  windowDays: document.getElementById("windowDays"),
  sampleBtn: document.getElementById("sampleBtn"),
  clearBtn: document.getElementById("clearBtn"),
  copyBtn: document.getElementById("copyBtn"),
  icsBtn: document.getElementById("icsBtn"),
  list: document.getElementById("list"),
  entryCount: document.getElementById("entryCount"),
  totalCount: document.getElementById("totalCount"),
  soonCount: document.getElementById("soonCount"),
  overdueCount: document.getElementById("overdueCount"),
  error: document.getElementById("error"),
};

const STORAGE_KEY = "return-window-tracker-v1";
const DAY_MS = 24 * 60 * 60 * 1000;

const state = {
  entries: [],
};

const generateId = () => {
  if (window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID();
  }
  return `entry-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const toInputDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseDateValue = (value) => {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 12);
};

const formatDate = (date) =>
  date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

const getTodayNoon = () => {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12);
};

const addDays = (date, days) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const getDeadline = (entry) => {
  const purchaseDate = parseDateValue(entry.purchaseDate);
  if (!purchaseDate) return null;
  const windowDays = Number(entry.windowDays) || 0;
  return addDays(purchaseDate, windowDays);
};

const getDaysLeft = (deadline) => {
  const today = getTodayNoon();
  return Math.round((deadline - today) / DAY_MS);
};

const getStatus = (daysLeft) => {
  if (daysLeft < 0) {
    const daysOver = Math.abs(daysLeft);
    return {
      label: `Overdue by ${daysOver} ${daysOver === 1 ? "day" : "days"}`,
      className: "overdue",
    };
  }
  if (daysLeft === 0) {
    return { label: "Due today", className: "today" };
  }
  if (daysLeft <= 3) {
    return {
      label: `${daysLeft} ${daysLeft === 1 ? "day" : "days"} left`,
      className: "urgent",
    };
  }
  if (daysLeft <= 7) {
    return {
      label: `${daysLeft} days left`,
      className: "soon",
    };
  }
  return {
    label: `${daysLeft} days left`,
    className: "ok",
  };
};

const buildSampleEntries = () => {
  const today = getTodayNoon();
  const offset = (days) => toInputDate(addDays(today, days));
  return [
    {
      id: generateId(),
      item: "Canvas jacket",
      store: "Northwind Outfitters",
      purchaseDate: offset(-12),
      windowDays: 30,
    },
    {
      id: generateId(),
      item: "Smart bulbs",
      store: "BrightHouse",
      purchaseDate: offset(-22),
      windowDays: 30,
    },
    {
      id: generateId(),
      item: "Coffee grinder",
      store: "Orion Home",
      purchaseDate: offset(-34),
      windowDays: 45,
    },
  ];
};

const updateEntryCount = () => {
  const count = state.entries.length;
  elements.entryCount.textContent = `${count} tracked`;
};

const showError = (message) => {
  elements.error.textContent = message;
};

const clearError = () => {
  elements.error.textContent = "";
};

const saveState = () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.entries));
};

const loadState = () => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return;
  try {
    const parsed = JSON.parse(stored);
    if (Array.isArray(parsed)) {
      state.entries = parsed;
    }
  } catch (error) {
    console.warn("Failed to parse stored entries", error);
  }
};

const updateSummary = (derivedEntries) => {
  const total = derivedEntries.length;
  const overdue = derivedEntries.filter((entry) => entry.daysLeft < 0).length;
  const soon = derivedEntries.filter(
    (entry) => entry.daysLeft >= 0 && entry.daysLeft <= 7,
  ).length;

  elements.totalCount.textContent = String(total);
  elements.soonCount.textContent = String(soon);
  elements.overdueCount.textContent = String(overdue);
};

const renderEmptyState = () => {
  elements.list.innerHTML = `
    <div class="empty">
      <p>No returns yet.</p>
      <span>Add your first purchase to start tracking.</span>
    </div>
  `;
};

const renderList = () => {
  if (!state.entries.length) {
    renderEmptyState();
    elements.copyBtn.disabled = true;
    elements.icsBtn.disabled = true;
    updateSummary([]);
    updateEntryCount();
    return;
  }

  const derived = state.entries
    .map((entry) => {
      const purchaseDate = parseDateValue(entry.purchaseDate);
      const deadline = getDeadline(entry);
      const daysLeft = getDaysLeft(deadline);
      return {
        ...entry,
        purchaseDate,
        deadline,
        daysLeft,
        status: getStatus(daysLeft),
      };
    })
    .sort((a, b) => a.deadline - b.deadline);

  elements.list.innerHTML = "";

  derived.forEach((entry, index) => {
    const card = document.createElement("article");
    card.className = "entry";
    card.style.animationDelay = `${index * 0.05}s`;

    const header = document.createElement("div");
    header.className = "entry-top";

    const title = document.createElement("h3");
    title.textContent = entry.item || entry.store || "Untitled purchase";

    const status = document.createElement("span");
    status.className = `status ${entry.status.className}`;
    status.textContent = entry.status.label;

    header.appendChild(title);
    header.appendChild(status);

    const meta = document.createElement("div");
    meta.className = "entry-meta";
    const metaParts = [];
    if (entry.store && entry.item) {
      metaParts.push(entry.store);
    }
    metaParts.push(`Purchased ${formatDate(entry.purchaseDate)}`);
    metaParts.push(`Window ${entry.windowDays} days`);
    meta.textContent = metaParts.join(" | ");

    const details = document.createElement("div");
    details.className = "entry-details";

    const returnInfo = document.createElement("div");
    const returnLabel = document.createElement("span");
    returnLabel.textContent = "Return by";
    const returnDate = document.createElement("strong");
    returnDate.textContent = formatDate(entry.deadline);
    returnInfo.appendChild(returnLabel);
    returnInfo.appendChild(returnDate);

    const actions = document.createElement("div");
    actions.className = "entry-actions";

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "entry-remove";
    removeButton.textContent = "Remove";
    removeButton.dataset.id = entry.id;

    actions.appendChild(removeButton);
    details.appendChild(returnInfo);
    details.appendChild(actions);

    card.appendChild(header);
    card.appendChild(meta);
    card.appendChild(details);

    elements.list.appendChild(card);
  });

  elements.copyBtn.disabled = false;
  elements.icsBtn.disabled = false;
  updateSummary(derived);
  updateEntryCount();
};

const addEntry = (entry) => {
  state.entries.unshift(entry);
  saveState();
  renderList();
};

const removeEntry = (id) => {
  state.entries = state.entries.filter((entry) => entry.id !== id);
  saveState();
  renderList();
};

const clearEntries = () => {
  state.entries = [];
  saveState();
  renderList();
};

const buildSummaryText = () => {
  const derived = state.entries
    .map((entry) => {
      const purchaseDate = parseDateValue(entry.purchaseDate);
      const deadline = getDeadline(entry);
      const daysLeft = getDaysLeft(deadline);
      const status = getStatus(daysLeft).label;
      const title = entry.item || entry.store || "Untitled purchase";
      const store = entry.store && entry.item ? ` (${entry.store})` : "";
      return {
        title: `${title}${store}`,
        purchaseDate,
        deadline,
        status,
        windowDays: entry.windowDays,
      };
    })
    .sort((a, b) => a.deadline - b.deadline);

  return derived
    .map(
      (entry) =>
        `${entry.title} - Return by ${formatDate(entry.deadline)} (${entry.status})`,
    )
    .join("\n");
};

const fallbackCopy = (text) => {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "absolute";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  let succeeded = false;
  try {
    succeeded = document.execCommand("copy");
  } catch (error) {
    succeeded = false;
  }
  document.body.removeChild(textarea);
  return succeeded;
};

const handleCopy = async () => {
  if (!state.entries.length) return;
  const text = buildSummaryText();
  try {
    await navigator.clipboard.writeText(text);
    elements.copyBtn.textContent = "Copied";
    setTimeout(() => {
      elements.copyBtn.textContent = "Copy summary";
    }, 1600);
  } catch (error) {
    const ok = fallbackCopy(text);
    if (ok) {
      elements.copyBtn.textContent = "Copied";
      setTimeout(() => {
        elements.copyBtn.textContent = "Copy summary";
      }, 1600);
    } else {
      showError("Unable to copy. Try selecting the list manually.");
    }
  }
};

const padNumber = (value) => String(value).padStart(2, "0");

const toICSDate = (date) => {
  const year = date.getFullYear();
  const month = padNumber(date.getMonth() + 1);
  const day = padNumber(date.getDate());
  return `${year}${month}${day}`;
};

const toICSDateTime = (date) =>
  date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");

const escapeICS = (value) =>
  value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");

const buildICS = () => {
  const nowStamp = toICSDateTime(new Date());
  const events = state.entries.map((entry) => {
    const purchaseDate = parseDateValue(entry.purchaseDate);
    const deadline = getDeadline(entry);
    const endDate = addDays(deadline, 1);

    const titleBase = entry.item || entry.store || "Return deadline";
    const summary = escapeICS(`Return deadline: ${titleBase}`);

    const descriptionLines = [
      `Purchase date: ${formatDate(purchaseDate)}`,
      `Return window: ${entry.windowDays} days`,
    ];

    if (entry.store && entry.item) {
      descriptionLines.push(`Store: ${entry.store}`);
    }

    const description = escapeICS(descriptionLines.join("\n"));

    return [
      "BEGIN:VEVENT",
      `UID:${entry.id}@return-window-tracker`,
      `DTSTAMP:${nowStamp}`,
      `SUMMARY:${summary}`,
      `DTSTART;VALUE=DATE:${toICSDate(deadline)}`,
      `DTEND;VALUE=DATE:${toICSDate(endDate)}`,
      `DESCRIPTION:${description}`,
      "END:VEVENT",
    ].join("\r\n");
  });

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Return Window Tracker//EN",
    "CALSCALE:GREGORIAN",
    ...events,
    "END:VCALENDAR",
  ].join("\r\n");
};

const downloadICS = () => {
  const content = buildICS();
  const blob = new Blob([content], { type: "text/calendar" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `return-deadlines-${toInputDate(new Date())}.ics`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const handleSubmit = (event) => {
  event.preventDefault();
  clearError();

  const item = elements.item.value.trim();
  const store = elements.store.value.trim();
  const purchaseDate = elements.purchaseDate.value;
  const windowDays = Number(elements.windowDays.value) || 0;

  if (!item && !store) {
    showError("Add an item or store so you can recognize the return.");
    return;
  }
  if (!purchaseDate) {
    showError("Pick a purchase date to calculate the deadline.");
    return;
  }
  if (!windowDays || windowDays < 1) {
    showError("Return window must be at least 1 day.");
    return;
  }

  addEntry({
    id: generateId(),
    item,
    store,
    purchaseDate,
    windowDays,
  });

  elements.item.value = "";
  elements.purchaseDate.value = toInputDate(new Date());
  elements.item.focus();
};

const handleSample = () => {
  state.entries = buildSampleEntries();
  saveState();
  renderList();
};

const handleClear = () => {
  if (!state.entries.length) return;
  const confirmed = window.confirm("Clear all tracked returns?");
  if (!confirmed) return;
  clearEntries();
};

const bindEvents = () => {
  elements.entryForm.addEventListener("submit", handleSubmit);
  elements.sampleBtn.addEventListener("click", handleSample);
  elements.clearBtn.addEventListener("click", handleClear);
  elements.copyBtn.addEventListener("click", handleCopy);
  elements.icsBtn.addEventListener("click", downloadICS);

  elements.list.addEventListener("click", (event) => {
    const removeButton = event.target.closest(".entry-remove");
    if (!removeButton) return;
    removeEntry(removeButton.dataset.id);
  });
};

const init = () => {
  loadState();
  if (!elements.purchaseDate.value) {
    elements.purchaseDate.value = toInputDate(new Date());
  }
  renderList();
  bindEvents();
};

init();
