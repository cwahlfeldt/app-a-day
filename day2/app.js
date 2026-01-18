const form = document.querySelector("#trial-form");
const serviceInput = document.querySelector("#service");
const startDateInput = document.querySelector("#start-date");
const trialLengthInput = document.querySelector("#trial-length");
const leadDaysInput = document.querySelector("#lead-days");
const reminderTimeInput = document.querySelector("#reminder-time");
const noteInput = document.querySelector("#note");
const todayButton = document.querySelector("#today-btn");

const endDateEl = document.querySelector("#end-date");
const cancelDateEl = document.querySelector("#cancel-date");
const reminderDateEl = document.querySelector("#reminder-date");
const downloadButton = document.querySelector("#download-ics");
const copyButton = document.querySelector("#copy-summary");
const warningEl = document.querySelector("#warning");

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  year: "numeric",
  month: "short",
  day: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

const pad = (value) => String(value).padStart(2, "0");

const setToday = () => {
  const today = new Date();
  const dateValue = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
  startDateInput.value = dateValue;
};

const parseDate = (value) => {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
};

const addDays = (date, days) => {
  const next = new Date(date.getTime());
  next.setDate(next.getDate() + days);
  return next;
};

const formatDate = (date) => dateFormatter.format(date);
const formatDateTime = (date) => dateTimeFormatter.format(date);

const formatIcsDateLocal = (date) => {
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}T${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
};

const formatIcsDateUtc = (date) => {
  return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`;
};

const escapeIcs = (text) => {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
};

const getReminderDate = () => {
  const startDate = parseDate(startDateInput.value);
  if (!startDate) return null;

  const trialLength = Math.max(Number(trialLengthInput.value) || 0, 1);
  const leadDays = Math.max(Number(leadDaysInput.value) || 0, 0);
  const trialEnd = addDays(startDate, trialLength);
  const cancelBy = addDays(trialEnd, -leadDays);

  const reminderTime = reminderTimeInput.value || "09:00";
  const [hours, minutes] = reminderTime.split(":").map(Number);
  cancelBy.setHours(hours || 0, minutes || 0, 0, 0);

  return { startDate, trialEnd, cancelBy };
};

const buildIcs = (data) => {
  const serviceName = serviceInput.value.trim() || "trial";
  const note = noteInput.value.trim();
  const summary = `Cancel ${serviceName}`;
  const descriptionLines = [
    `Trial ends: ${formatDate(data.trialEnd)}`,
    `Cancel by: ${formatDateTime(data.cancelBy)}`,
  ];
  if (note) descriptionLines.push(`Note: ${note}`);

  const description = descriptionLines.join("\n");
  const dtStart = formatIcsDateLocal(data.cancelBy);
  const dtEndAdjusted = new Date(data.cancelBy.getTime() + 30 * 60 * 1000);

  const uid = (window.crypto && window.crypto.randomUUID)
    ? window.crypto.randomUUID()
    : `trial-${Date.now()}`;

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//TrialGuard//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${formatIcsDateUtc(new Date())}`,
    `DTSTART:${dtStart}`,
    `DTEND:${formatIcsDateLocal(dtEndAdjusted)}`,
    `SUMMARY:${escapeIcs(summary)}`,
    `DESCRIPTION:${escapeIcs(description)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return lines.join("\r\n");
};

const updateUI = () => {
  const data = getReminderDate();
  if (!data) {
    endDateEl.textContent = "--";
    cancelDateEl.textContent = "--";
    reminderDateEl.textContent = "--";
    warningEl.textContent = "";
    warningEl.hidden = true;
    downloadButton.disabled = true;
    copyButton.disabled = true;
    return;
  }

  endDateEl.textContent = formatDate(data.trialEnd);
  cancelDateEl.textContent = formatDateTime(data.cancelBy);
  reminderDateEl.textContent = formatDateTime(data.cancelBy);
  warningEl.textContent = data.cancelBy < data.startDate
    ? "Heads up: the reminder lands before the trial starts. Reduce lead days or increase the trial length."
    : "";
  warningEl.hidden = warningEl.textContent === "";

  downloadButton.disabled = false;
  copyButton.disabled = false;
};

const handleDownload = () => {
  const data = getReminderDate();
  if (!data) return;

  const icsContent = buildIcs(data);
  const blob = new Blob([icsContent], { type: "text/calendar" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  const serviceName = serviceInput.value.trim() || "trial";
  link.href = url;
  link.download = `${serviceName.replace(/\s+/g, "-").toLowerCase()}-cancel-reminder.ics`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const copyToClipboard = async (text) => {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return true;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();

  let succeeded = false;
  try {
    succeeded = document.execCommand("copy");
  } catch (err) {
    succeeded = false;
  } finally {
    textarea.remove();
  }
  return succeeded;
};

const handleCopy = async () => {
  const data = getReminderDate();
  if (!data) return;

  const serviceName = serviceInput.value.trim() || "trial";
  const summary = `Cancel ${serviceName} by ${formatDateTime(data.cancelBy)} (trial ends ${formatDate(data.trialEnd)}).`;
  try {
    const success = await copyToClipboard(summary);
    if (!success) throw new Error("copy failed");
    copyButton.textContent = "Copied!";
    setTimeout(() => {
      copyButton.textContent = "Copy summary";
    }, 1500);
  } catch (err) {
    copyButton.textContent = "Copy failed";
    setTimeout(() => {
      copyButton.textContent = "Copy summary";
    }, 1500);
  }
};

form.addEventListener("input", updateUI);
form.addEventListener("change", updateUI);

startDateInput.addEventListener("change", updateUI);

todayButton.addEventListener("click", () => {
  setToday();
  updateUI();
});

downloadButton.addEventListener("click", handleDownload);
copyButton.addEventListener("click", handleCopy);

setToday();
updateUI();
