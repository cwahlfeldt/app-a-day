const STORAGE_KEY = "packpilot-state";

const BASE_ITEMS = {
  documents: [
    "ID or passport",
    "Wallet or travel card",
    "Tickets or boarding pass",
    "Lodging confirmation",
    "Insurance card"
  ],
  toiletries: [
    "Toothbrush",
    "Toothpaste",
    "Deodorant",
    "Skincare essentials",
    "Hairbrush or comb",
    "Razor",
    "Medications"
  ],
  tech: [
    "Phone + charger",
    "Headphones",
    "Power bank",
    "Travel adapter"
  ],
  misc: [
    "Reusable water bottle",
    "Sunglasses",
    "Snacks",
    "Day bag"
  ]
};

const TRIP_ITEMS = {
  city: ["Umbrella", "Comfortable walking shoes", "Light jacket"],
  beach: ["Swimsuit (2)", "Sunscreen", "Beach towel", "Flip flops", "Sun hat"],
  business: ["Dress shoes", "Blazer", "Notebook", "Business cards"],
  camping: ["Tent", "Sleeping bag", "Headlamp", "Bug spray", "Camp stove"],
  winter: ["Heavy coat", "Gloves", "Scarf", "Thermal base layer", "Beanie"]
};

const EXTRA_ITEMS = {
  work: ["Laptop + charger", "Mouse", "Notebook", "HDMI adapter"],
  fitness: ["Workout outfit", "Gym shoes", "Resistance band"],
  kids: ["Wipes", "Extra snacks", "Comfort item", "Change of clothes"],
  photo: ["Camera body", "SD cards", "Extra battery", "Lens cloth"]
};

const CATEGORY_LABELS = {
  clothing: "Clothing",
  documents: "Documents",
  toiletries: "Toiletries",
  tech: "Tech",
  trip: "Trip-specific",
  extras: "Extras",
  misc: "Essentials",
  custom: "Custom"
};

const CATEGORY_ORDER = [
  "clothing",
  "documents",
  "toiletries",
  "tech",
  "misc",
  "trip",
  "extras",
  "custom"
];

const form = document.getElementById("plannerForm");
const tripType = document.getElementById("tripType");
const tripDays = document.getElementById("tripDays");
const laundryToggle = document.getElementById("laundryToggle");
const customItemInput = document.getElementById("customItem");
const addItemBtn = document.getElementById("addItem");
const clearBtn = document.getElementById("clearBtn");
const copyBtn = document.getElementById("copyBtn");
const results = document.getElementById("results");
const itemCount = document.getElementById("itemCount");
const summaryType = document.getElementById("summaryType");
const summaryDays = document.getElementById("summaryDays");
const summaryCount = document.getElementById("summaryCount");
const status = document.getElementById("status");

let state = {
  config: getDefaultConfig(),
  customItems: [],
  items: []
};

function getDefaultConfig() {
  return {
    tripType: "city",
    days: 4,
    laundry: false,
    extras: []
  };
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function buildClothingItems(days, laundry) {
  const coreDays = Math.min(days, laundry ? 4 : days);
  const tops = coreDays + 1;
  const bottoms = Math.max(1, Math.ceil(coreDays / 2));
  const underwear = coreDays + 1;
  const socks = coreDays + 1;

  return [
    `Tops (${tops})`,
    `Bottoms (${bottoms})`,
    `Underwear (${underwear})`,
    `Socks (${socks})`,
    "Sleepwear (1 set)",
    "Comfortable shoes (1 pair)"
  ];
}

function getSelectedExtras() {
  return Array.from(document.querySelectorAll('input[name="extras"]:checked')).map(
    (input) => input.value
  );
}

function getConfigFromInputs() {
  const daysValue = Math.min(Math.max(parseInt(tripDays.value, 10) || 1, 1), 30);
  tripDays.value = daysValue;

  return {
    tripType: tripType.value,
    days: daysValue,
    laundry: laundryToggle.checked,
    extras: getSelectedExtras()
  };
}

function applyConfigToInputs(config) {
  tripType.value = config.tripType;
  tripDays.value = config.days;
  laundryToggle.checked = config.laundry;

  const extraInputs = document.querySelectorAll('input[name="extras"]');
  extraInputs.forEach((input) => {
    input.checked = config.extras.includes(input.value);
  });
}

function buildItems(config, customItems, previousItems = []) {
  const previousChecked = new Map(previousItems.map((item) => [item.id, item.checked]));
  const items = [];

  addCategory(items, "clothing", buildClothingItems(config.days, config.laundry), previousChecked);
  addCategory(items, "documents", BASE_ITEMS.documents, previousChecked);
  addCategory(items, "toiletries", BASE_ITEMS.toiletries, previousChecked);
  addCategory(items, "tech", BASE_ITEMS.tech, previousChecked);
  addCategory(items, "misc", BASE_ITEMS.misc, previousChecked);
  addCategory(items, "trip", TRIP_ITEMS[config.tripType] || [], previousChecked);

  const extraList = config.extras.flatMap((key) => EXTRA_ITEMS[key] || []);
  addCategory(items, "extras", extraList, previousChecked);

  customItems.forEach((item) => {
    items.push({
      ...item,
      category: "custom",
      checked: item.checked || previousChecked.get(item.id) || false,
      isCustom: true
    });
  });

  return items;
}

function addCategory(items, category, labels, previousChecked) {
  labels.forEach((label) => {
    const id = `${category}-${slugify(label)}`;
    items.push({
      id,
      label,
      category,
      checked: previousChecked.get(id) || false,
      isCustom: false
    });
  });
}

function groupItems(items) {
  return items.reduce((groups, item) => {
    if (!groups[item.category]) {
      groups[item.category] = [];
    }
    groups[item.category].push(item);
    return groups;
  }, {});
}

function renderList() {
  results.innerHTML = "";

  if (!state.items.length) {
    results.innerHTML = `
      <div class="empty">
        <p>No list yet.</p>
        <span>Select your trip details to build a checklist.</span>
      </div>
    `;
    copyBtn.disabled = true;
    return;
  }

  const grouped = groupItems(state.items);

  CATEGORY_ORDER.forEach((category) => {
    const items = grouped[category];
    if (!items || !items.length) {
      return;
    }

    const section = document.createElement("section");
    section.className = "category";

    const title = document.createElement("h3");
    title.textContent = CATEGORY_LABELS[category] || category;
    section.appendChild(title);

    const list = document.createElement("div");
    list.className = "checklist";

    items.forEach((item) => {
      const label = document.createElement("label");
      label.className = "check";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = item.checked;
      checkbox.dataset.id = item.id;
      checkbox.addEventListener("change", () => {
        item.checked = checkbox.checked;
        syncCustomState(item);
        saveState();
      });

      const text = document.createElement("span");
      text.textContent = item.label;

      label.appendChild(checkbox);
      label.appendChild(text);

      if (item.isCustom) {
        const removeBtn = document.createElement("button");
        removeBtn.type = "button";
        removeBtn.textContent = "Remove";
        removeBtn.addEventListener("click", () => removeCustomItem(item.id));
        label.appendChild(removeBtn);
      }

      list.appendChild(label);
    });

    section.appendChild(list);
    results.appendChild(section);
  });

  copyBtn.disabled = false;
}

function updateSummary() {
  itemCount.textContent = `${state.items.length} items`;
  summaryCount.textContent = `${state.items.length}`;
  summaryDays.textContent = `${state.config.days}`;
  summaryType.textContent = tripType.options[tripType.selectedIndex].textContent;
}

function generateList() {
  const config = getConfigFromInputs();
  state.config = config;
  state.items = buildItems(config, state.customItems, state.items);
  renderList();
  updateSummary();
  saveState();
}

function syncCustomState(item) {
  if (!item.isCustom) {
    return;
  }
  const match = state.customItems.find((custom) => custom.id === item.id);
  if (match) {
    match.checked = item.checked;
  }
}

function addCustomItem() {
  const label = customItemInput.value.trim();
  if (!label) {
    return;
  }

  const id = `custom-${slugify(label)}-${Date.now()}`;
  state.customItems.push({ id, label, checked: false, isCustom: true });
  customItemInput.value = "";
  generateList();
}

function removeCustomItem(id) {
  state.customItems = state.customItems.filter((item) => item.id !== id);
  generateList();
}

function clearChecks() {
  state.items.forEach((item) => {
    item.checked = false;
  });
  state.customItems.forEach((item) => {
    item.checked = false;
  });
  renderList();
  saveState();
}

function copyList() {
  if (!state.items.length) {
    return;
  }

  const grouped = groupItems(state.items);
  const lines = [];

  CATEGORY_ORDER.forEach((category) => {
    const items = grouped[category];
    if (!items || !items.length) {
      return;
    }
    lines.push(`${CATEGORY_LABELS[category] || category}:`);
    items.forEach((item) => {
      const marker = item.checked ? "x" : " ";
      lines.push(`- [${marker}] ${item.label}`);
    });
    lines.push("");
  });

  const text = lines.join("\n").trim();

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(
      () => {
        setStatus("Checklist copied to clipboard.");
      },
      () => {
        fallbackCopy(text);
      }
    );
  } else {
    fallbackCopy(text);
  }
}

function fallbackCopy(text) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  try {
    document.execCommand("copy");
    setStatus("Checklist copied to clipboard.");
  } catch (error) {
    setStatus("Copy failed. Select and copy manually.");
  }
  document.body.removeChild(textarea);
}

function setStatus(message) {
  status.textContent = message;
  window.clearTimeout(setStatus.timeoutId);
  setStatus.timeoutId = window.setTimeout(() => {
    status.textContent = "";
  }, 2400);
}

function saveState() {
  const payload = {
    config: state.config,
    customItems: state.customItems,
    items: state.items
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    return false;
  }
  try {
    const parsed = JSON.parse(saved);
    state = {
      config: parsed.config || getDefaultConfig(),
      customItems: parsed.customItems || [],
      items: parsed.items || []
    };
    return true;
  } catch (error) {
    return false;
  }
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  generateList();
});

form.addEventListener("change", (event) => {
  if (event.target === customItemInput) {
    return;
  }
  generateList();
});

addItemBtn.addEventListener("click", addCustomItem);

customItemInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    addCustomItem();
  }
});

clearBtn.addEventListener("click", clearChecks);
copyBtn.addEventListener("click", copyList);

const hadState = loadState();
applyConfigToInputs(state.config);

if (state.items.length) {
  renderList();
  updateSummary();
} else {
  generateList();
}

if (!hadState) {
  saveState();
}
