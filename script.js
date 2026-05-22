const calendarGrid = document.querySelector("#calendarGrid");
const monthName = document.querySelector("#monthName");
const yearName = document.querySelector("#yearName");
const prevMonth = document.querySelector("#prevMonth");
const nextMonth = document.querySelector("#nextMonth");
const selectedDateTitle = document.querySelector("#selectedDateTitle");
const selectedDateHint = document.querySelector("#selectedDateHint");
const noteForm = document.querySelector("#noteForm");
const noteText = document.querySelector("#noteText");
const importantNote = document.querySelector("#importantNote");
const noteList = document.querySelector("#noteList");
const todayAlert = document.querySelector("#todayAlert");
const todayAlertList = document.querySelector("#todayAlertList");
const closeAlert = document.querySelector("#closeAlert");

const storageKey = "shiny-calendar-notes";
const today = new Date();

let shownDate = new Date(today.getFullYear(), today.getMonth(), 1);
let selectedDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
let notes = loadNotes();

function loadNotes() {
  const saved = localStorage.getItem(storageKey);

  if (!saved) {
    return {};
  }

  try {
    return JSON.parse(saved);
  } catch {
    return {};
  }
}

function saveNotes() {
  localStorage.setItem(storageKey, JSON.stringify(notes));
}

function dateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function readableDate(date) {
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric"
  });
}

function isPastDate(date) {
  return dateKey(date) < dateKey(today);
}

function renderCalendar() {
  calendarGrid.innerHTML = "";

  const year = shownDate.getFullYear();
  const month = shownDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  monthName.textContent = shownDate.toLocaleDateString(undefined, { month: "long" });
  yearName.textContent = String(year);

  for (let i = 0; i < firstDay; i += 1) {
    const emptyCell = document.createElement("div");
    emptyCell.className = "day-cell empty";
    calendarGrid.appendChild(emptyCell);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, month, day);
    const key = dateKey(date);
    const dayNotes = notes[key] || [];
    const hasImportantNote = dayNotes.some((note) => note.important);
    const isToday = key === dateKey(today);
    const isSelected = key === dateKey(selectedDate);
    const isLate = dayNotes.length > 0 && isPastDate(date);

    const cell = document.createElement("button");
    cell.type = "button";
    cell.className = "day-cell";
    cell.setAttribute("aria-label", `Open notes for ${readableDate(date)}`);

    if (hasImportantNote) {
      cell.classList.add("important");
    }

    if (isToday) {
      cell.classList.add("today");
    }

    if (isSelected) {
      cell.classList.add("selected");
    }

    if (isLate) {
      cell.classList.add("late");
    }

    const number = document.createElement("span");
    number.className = "day-number";
    number.textContent = day;
    cell.appendChild(number);

    if (dayNotes.length > 0) {
      const dot = document.createElement("span");
      dot.className = "note-dot";
      cell.appendChild(dot);

      const preview = document.createElement("span");
      preview.className = "day-preview";
      preview.textContent = dayNotes[0].text;
      cell.appendChild(preview);

      if (isLate) {
        const lateLabel = document.createElement("span");
        lateLabel.className = "late-label";
        lateLabel.textContent = "Project is late!";
        cell.appendChild(lateLabel);
      }
    }

    cell.addEventListener("click", () => {
      selectedDate = date;
      shownDate = new Date(date.getFullYear(), date.getMonth(), 1);
      renderCalendar();
      renderSelectedDay();
    });

    calendarGrid.appendChild(cell);
  }
}

function renderSelectedDay() {
  const key = dateKey(selectedDate);
  const dayNotes = notes[key] || [];
  const selectedDayIsLate = dayNotes.length > 0 && isPastDate(selectedDate);

  selectedDateTitle.textContent = readableDate(selectedDate);
  selectedDateHint.textContent = dayNotes.length
    ? selectedDayIsLate
      ? `Project is late! ${dayNotes.length} note${dayNotes.length === 1 ? "" : "s"} saved for this day.`
      : `${dayNotes.length} note${dayNotes.length === 1 ? "" : "s"} saved for this day.`
    : "No notes yet. Add one below.";
  noteText.value = "";
  importantNote.checked = false;
  noteList.innerHTML = "";

  if (dayNotes.length === 0) {
    const empty = document.createElement("li");
    empty.textContent = "Nothing planned yet.";
    noteList.appendChild(empty);
    return;
  }

  dayNotes.forEach((note, index) => {
    const item = document.createElement("li");

    if (note.important) {
      item.classList.add("important-note");
    }

    if (selectedDayIsLate) {
      item.classList.add("late-note");
    }

    const text = document.createElement("span");
    const notePrefix = selectedDayIsLate
      ? "Project is late! "
      : note.important
        ? "Important: "
        : "";
    text.textContent = `${notePrefix}${note.text}`;

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "delete-note";
    deleteButton.textContent = "X";
    deleteButton.setAttribute("aria-label", `Delete note: ${note.text}`);
    deleteButton.addEventListener("click", () => {
      notes[key].splice(index, 1);

      if (notes[key].length === 0) {
        delete notes[key];
      }

      saveNotes();
      renderCalendar();
      renderSelectedDay();
    });

    item.append(text, deleteButton);
    noteList.appendChild(item);
  });
}

function checkTodayAlert() {
  const todaysNotes = notes[dateKey(today)] || [];
  const importantNotes = todaysNotes.filter((note) => note.important);

  if (importantNotes.length === 0 || sessionStorage.getItem("today-alert-closed") === "yes") {
    return;
  }

  todayAlertList.innerHTML = "";
  importantNotes.forEach((note) => {
    const item = document.createElement("li");
    item.textContent = note.text;
    todayAlertList.appendChild(item);
  });

  todayAlert.hidden = false;
}

noteForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const text = noteText.value.trim();

  if (!text) {
    noteText.focus();
    return;
  }

  const key = dateKey(selectedDate);

  if (!notes[key]) {
    notes[key] = [];
  }

  notes[key].push({
    text,
    important: importantNote.checked,
    createdAt: new Date().toISOString()
  });

  saveNotes();
  renderCalendar();
  renderSelectedDay();

  if (key === dateKey(today) && importantNote.checked) {
    sessionStorage.removeItem("today-alert-closed");
    checkTodayAlert();
  }
});

prevMonth.addEventListener("click", () => {
  shownDate = new Date(shownDate.getFullYear(), shownDate.getMonth() - 1, 1);
  renderCalendar();
});

nextMonth.addEventListener("click", () => {
  shownDate = new Date(shownDate.getFullYear(), shownDate.getMonth() + 1, 1);
  renderCalendar();
});

closeAlert.addEventListener("click", () => {
  sessionStorage.setItem("today-alert-closed", "yes");
  todayAlert.hidden = true;
});

renderCalendar();
renderSelectedDay();
checkTodayAlert();
