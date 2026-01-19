const plannerForm = document.getElementById("plannerForm");
const tasksInput = document.getElementById("tasks");
const taskCount = document.getElementById("taskCount");
const totalHoursInput = document.getElementById("totalHours");
const totalMinutesInput = document.getElementById("totalMinutes");
const startTimeInput = document.getElementById("startTime");
const nowBtn = document.getElementById("nowBtn");
const splitMethod = document.getElementById("splitMethod");
const breakToggle = document.getElementById("breakToggle");
const breakMinutesInput = document.getElementById("breakMinutes");
const sampleBtn = document.getElementById("sampleBtn");
const clearBtn = document.getElementById("clearBtn");
const results = document.getElementById("results");
const focusTotal = document.getElementById("focusTotal");
const breakTotal = document.getElementById("breakTotal");
const endTime = document.getElementById("endTime");
const copyBtn = document.getElementById("copyBtn");
const error = document.getElementById("error");
const status = document.getElementById("status");

const state = {
  scheduleText: "",
};

const SAMPLE = {
  tasks: "Deep work | 3\nInbox sweep | 1\nPrep meeting notes | 2\nAdmin wrap-up | 1",
  hours: 2,
  minutes: 45,
  method: "weighted",
  breaks: true,
  breakMinutes: 5,
};

function setDefaultStartTime() {
  const now = new Date();
  const minutes = now.getHours() * 60 + now.getMinutes();
  const rounded = Math.ceil(minutes / 15) * 15;
  const wrapped = rounded % 1440;
  startTimeInput.value = minutesToClock(wrapped);
}

function minutesToClock(minutes) {
  const total = ((minutes % 1440) + 1440) % 1440;
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

function clockInfo(minutes) {
  const dayOffset = Math.floor(minutes / 1440);
  return {
    time: minutesToClock(minutes),
    dayOffset,
  };
}

function dayOffsetLabel(offset) {
  if (offset <= 0) {
    return "";
  }
  const suffix = offset === 1 ? "day" : "days";
  return `+${offset} ${suffix}`;
}

function formatDuration(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours && mins) {
    return `${hours}h ${mins}m`;
  }
  if (hours) {
    return `${hours}h`;
  }
  return `${mins}m`;
}

function parseTasks() {
  const lines = tasksInput.value.split("\n");
  return lines
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split("|");
      const name = parts[0].trim();
      let weight = 1;
      if (parts.length > 1) {
        const parsed = Number.parseFloat(parts[1]);
        if (Number.isFinite(parsed) && parsed > 0) {
          weight = parsed;
        }
      }
      return { name, weight };
    });
}

function updateTaskCount() {
  const count = parseTasks().length;
  taskCount.textContent = `${count} ${count === 1 ? "task" : "tasks"}`;
}

function totalMinutesValue() {
  const hours = Number.parseInt(totalHoursInput.value, 10) || 0;
  const minutes = Number.parseInt(totalMinutesInput.value, 10) || 0;
  return hours * 60 + minutes;
}

function breakMinutesValue() {
  if (!breakToggle.checked) {
    return 0;
  }
  const minutes = Number.parseInt(breakMinutesInput.value, 10);
  return Number.isFinite(minutes) && minutes >= 0 ? minutes : 0;
}

function allocateMinutes(tasks, totalMinutes, method) {
  const count = tasks.length;
  if (method === "equal") {
    const base = Math.floor(totalMinutes / count);
    let remainder = totalMinutes - base * count;
    return tasks.map(() => {
      const extra = remainder > 0 ? 1 : 0;
      if (remainder > 0) {
        remainder -= 1;
      }
      return base + extra;
    });
  }

  const weights = tasks.map((task) => task.weight);
  const totalWeight = weights.reduce((sum, value) => sum + value, 0);
  if (!totalWeight) {
    return tasks.map(() => 0);
  }

  const base = Array.from({ length: count }, () => 1);
  const remaining = totalMinutes - count;
  if (remaining === 0) {
    return base;
  }

  const raw = weights.map((weight) => (remaining * weight) / totalWeight);
  const floors = raw.map((value) => Math.floor(value));
  let remainder = remaining - floors.reduce((sum, value) => sum + value, 0);
  const order = raw
    .map((value, index) => ({
      index,
      fraction: value - floors[index],
    }))
    .sort((a, b) => b.fraction - a.fraction);

  const allocation = floors.map((value, index) => value + base[index]);
  for (let i = 0; i < remainder; i += 1) {
    const target = order[i % order.length].index;
    allocation[target] += 1;
  }
  return allocation;
}

function parseStartMinutes() {
  const value = startTimeInput.value;
  if (!value) {
    return 0;
  }
  const [hours, minutes] = value.split(":").map((part) => Number(part));
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return 0;
  }
  return hours * 60 + minutes;
}

function fallbackCopy(text) {
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "true");
  area.style.position = "fixed";
  area.style.opacity = "0";
  area.style.pointerEvents = "none";
  document.body.appendChild(area);
  area.select();
  const success = document.execCommand("copy");
  document.body.removeChild(area);
  return success;
}

function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = value;
  return div.innerHTML;
}

function renderEmpty() {
  results.innerHTML = `
    <div class="empty">
      <p>No schedule yet.</p>
      <span>Add tasks and generate to see blocks.</span>
    </div>
  `;
  focusTotal.textContent = "0m";
  breakTotal.textContent = "0m";
  endTime.textContent = "--";
  copyBtn.disabled = true;
  status.textContent = "";
}

function buildSchedule(tasks, allocations, startMinutes, breakMinutes) {
  const blocks = [];
  let cursor = startMinutes;

  tasks.forEach((task, index) => {
    const duration = allocations[index];
    const start = cursor;
    const end = start + duration;
    blocks.push({
      name: task.name,
      start,
      end,
      duration,
    });
    cursor = end + (index < tasks.length - 1 ? breakMinutes : 0);
  });

  return blocks;
}

function formatClockWithOffset(minutes) {
  const info = clockInfo(minutes);
  const offsetLabel = dayOffsetLabel(info.dayOffset);
  return offsetLabel ? `${info.time} (${offsetLabel})` : info.time;
}

function renderSchedule(blocks, breakMinutes) {
  if (!blocks.length) {
    renderEmpty();
    return;
  }

  results.innerHTML = blocks
    .map((block, index) => {
      const startInfo = clockInfo(block.start);
      const endInfo = clockInfo(block.end);
      const startLabel = dayOffsetLabel(startInfo.dayOffset);
      const endLabel = dayOffsetLabel(endInfo.dayOffset);
      const delay = (index * 0.06).toFixed(2);

      return `
        <div class="block" style="--delay: ${delay}s">
          <div class="block-time">
            <div>
              <span class="time">${startInfo.time}</span>
              ${startLabel ? `<span class="day-note">${startLabel}</span>` : ""}
            </div>
            <span class="arrow">-></span>
            <div>
              <span class="time">${endInfo.time}</span>
              ${endLabel ? `<span class="day-note">${endLabel}</span>` : ""}
            </div>
          </div>
          <div class="block-main">
            <h3>${escapeHtml(block.name)}</h3>
            <span class="duration">${formatDuration(block.duration)}</span>
          </div>
        </div>
        ${
          breakMinutes && index < blocks.length - 1
            ? `<div class="break">Break ${formatDuration(breakMinutes)}</div>`
            : ""
        }
      `;
    })
    .join("");
}

function updateSummary(totalFocus, totalBreak, endMinutes) {
  focusTotal.textContent = formatDuration(totalFocus);
  breakTotal.textContent = formatDuration(totalBreak);
  endTime.textContent = formatClockWithOffset(endMinutes);
}

function buildCopyText(blocks, totalFocus, totalBreak, endMinutes, breakMinutes) {
  const lines = [
    "Blocksmith schedule",
    `Focus time: ${formatDuration(totalFocus)}`,
    `Break time: ${formatDuration(totalBreak)}`,
    `End time: ${formatClockWithOffset(endMinutes)}`,
    "",
  ];

  blocks.forEach((block, index) => {
    lines.push(
      `${index + 1}. ${block.name} | ${formatClockWithOffset(
        block.start
      )} - ${formatClockWithOffset(block.end)} (${formatDuration(
        block.duration
      )})`
    );
    if (breakMinutes && index < blocks.length - 1) {
      lines.push(`   Break ${formatDuration(breakMinutes)}`);
    }
  });

  return lines.join("\n");
}

function showError(message) {
  error.textContent = message;
}

function clearError() {
  error.textContent = "";
}

function generateSchedule(event) {
  event.preventDefault();
  clearError();
  status.textContent = "";

  const tasks = parseTasks();
  const totalFocus = totalMinutesValue();
  const breaks = breakMinutesValue();

  if (!tasks.length) {
    showError("Add at least one task to build a schedule.");
    renderEmpty();
    return;
  }

  if (!totalFocus) {
    showError("Enter the total time you want to divide.");
    renderEmpty();
    return;
  }

  if (totalFocus < tasks.length) {
    showError("Total time is too short for the number of tasks.");
    renderEmpty();
    return;
  }

  const method = splitMethod.value;
  const allocations = allocateMinutes(tasks, totalFocus, method);
  const invalidAllocation = allocations.some((minutes) => minutes <= 0);

  if (invalidAllocation) {
    showError("Some tasks ended up with zero time. Adjust your totals.");
    renderEmpty();
    return;
  }

  let startMinutes = parseStartMinutes();
  if (!startTimeInput.value) {
    setDefaultStartTime();
    startMinutes = parseStartMinutes();
  }
  const totalBreak = breaks * Math.max(tasks.length - 1, 0);
  const endMinutes = startMinutes + totalFocus + totalBreak;

  const blocks = buildSchedule(tasks, allocations, startMinutes, breaks);
  renderSchedule(blocks, breaks);
  updateSummary(totalFocus, totalBreak, endMinutes);

  state.scheduleText = buildCopyText(
    blocks,
    totalFocus,
    totalBreak,
    endMinutes,
    breaks
  );

  copyBtn.disabled = false;
  status.textContent = "Schedule ready.";
}

function copySchedule() {
  if (!state.scheduleText) {
    return;
  }

  navigator.clipboard
    .writeText(state.scheduleText)
    .then(() => {
      status.textContent = "Copied to clipboard.";
    })
    .catch(() => {
      const success = fallbackCopy(state.scheduleText);
      status.textContent = success
        ? "Copied to clipboard."
        : "Clipboard blocked. Select and copy manually.";
    });
}

function applySample() {
  tasksInput.value = SAMPLE.tasks;
  totalHoursInput.value = SAMPLE.hours;
  totalMinutesInput.value = SAMPLE.minutes;
  splitMethod.value = SAMPLE.method;
  breakToggle.checked = SAMPLE.breaks;
  breakMinutesInput.disabled = !SAMPLE.breaks;
  breakMinutesInput.value = SAMPLE.breakMinutes;
  updateTaskCount();
  status.textContent = "Sample loaded.";
}

function clearAll() {
  tasksInput.value = "";
  totalHoursInput.value = "";
  totalMinutesInput.value = "";
  splitMethod.value = "equal";
  breakToggle.checked = false;
  breakMinutesInput.disabled = true;
  breakMinutesInput.value = "5";
  updateTaskCount();
  renderEmpty();
  clearError();
}

function syncBreakState() {
  breakMinutesInput.disabled = !breakToggle.checked;
}

setDefaultStartTime();
updateTaskCount();

plannerForm.addEventListener("submit", generateSchedule);
tasksInput.addEventListener("input", updateTaskCount);
nowBtn.addEventListener("click", () => {
  setDefaultStartTime();
});
breakToggle.addEventListener("change", syncBreakState);
copyBtn.addEventListener("click", copySchedule);
sampleBtn.addEventListener("click", applySample);
clearBtn.addEventListener("click", clearAll);
