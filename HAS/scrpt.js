
"use strict";

const STORAGE_KEY = "carepoint_appointments";

const form = document.getElementById("appointmentForm");
const doctorSelect = document.getElementById("doctor");
const dateInput = document.getElementById("date");
const timeSelect = document.getElementById("time");
const appointmentList = document.getElementById("appointmentList");
const message = document.getElementById("message");

// Format today's date using local time.
function getLocalDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

// Set the earliest bookable date.
dateInput.min = getLocalDate();

// Read saved appointments from browser storage.
function getAppointments() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    const appointments = saved ? JSON.parse(saved) : [];

    return Array.isArray(appointments) ? appointments : [];
  } catch (error) {
    console.error("Could not read appointments:", error);
    return [];
  }
}

// Save appointments in browser storage.
function saveAppointments(appointments) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(appointments)
    );
    return true;
  } catch (error) {
    console.error("Could not save appointments:", error);
    showMessage(
      "Unable to save data. Check browser storage settings.",
      "error"
    );
    return false;
  }
}

// Display a message below the form.
function showMessage(text, type) {
  message.textContent = text;
  message.className = `message ${type}`;
}

// Format dates for display.
function formatDate(dateString) {
  const parts = dateString.split("-").map(Number);
  const date = new Date(parts[0], parts[1] - 1, parts[2]);

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

// Format times such as 14:00 as 2:00 PM.
function formatTime(timeString) {
  const [hours, minutes] = timeString.split(":").map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);

  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  });
}

// Check for an existing active booking in the same slot.
function isSlotTaken(doctor, date, time, appointments) {
  return appointments.some((appointment) =>
    appointment.doctor === doctor &&
    appointment.date === date &&
    appointment.time === time &&
    appointment.status !== "Cancelled"
  );
}

// Create a table cell using safe text insertion.
function createCell(text) {
  const cell = document.createElement("td");
  cell.textContent = text;
  return cell;
}

// Display appointments in the table.
function renderAppointments() {
  const appointments = getAppointments();

  appointmentList.replaceChildren();

  if (appointments.length === 0) {
    const row = document.createElement("tr");
    const cell = createCell("No appointments booked yet.");

    cell.colSpan = 6;
    cell.className = "empty";

    row.appendChild(cell);
    appointmentList.appendChild(row);
    return;
  }

  // Show the newest appointments first.
  appointments.slice().reverse().forEach((appointment) => {
    const row = document.createElement("tr");

    row.appendChild(createCell(appointment.patientName));
    row.appendChild(createCell(appointment.doctor));
    row.appendChild(createCell(formatDate(appointment.date)));
    row.appendChild(createCell(formatTime(appointment.time)));

    const statusCell = document.createElement("td");
    const statusBadge = document.createElement("span");

    statusBadge.className = "status";
    statusBadge.textContent = appointment.status;
    statusCell.appendChild(statusBadge);
    row.appendChild(statusCell);

    const actionCell = document.createElement("td");

    if (appointment.status !== "Cancelled") {
      const cancelButton = document.createElement("button");

      cancelButton.type = "button";
      cancelButton.className = "cancel-btn";
      cancelButton.textContent = "Cancel";
      cancelButton.dataset.id = String(appointment.id);

      actionCell.appendChild(cancelButton);
    } else {
      actionCell.textContent = "—";
    }

    row.appendChild(actionCell);
    appointmentList.appendChild(row);
  });
}

// Handle booking form submission.
form.addEventListener("submit", function (event) {
  event.preventDefault();

  if (!form.reportValidity()) {
    return;
  }

  const patientName = document
    .getElementById("patientName")
    .value.trim();

  const email = document
    .getElementById("email")
    .value.trim();

  const phone = document
    .getElementById("phone")
    .value.trim();

  const doctor = doctorSelect.value;
  const date = dateInput.value;
  const time = timeSelect.value;

  const reason = document
    .getElementById("reason")
    .value.trim();

  if (!patientName || !email || !phone ||
      !doctor || !date || !time) {
    showMessage("Please fill in all required fields.", "error");
    return;
  }

  // Prevent appointments on past dates.
  if (date < getLocalDate()) {
    showMessage("Please choose today or a future date.", "error");
    return;
  }

  const appointments = getAppointments();

  // Prevent duplicate doctor/date/time bookings.
  if (isSlotTaken(doctor, date, time, appointments)) {
    showMessage(
      "This doctor already has a booking at that time. Please select another slot.",
      "error"
    );
    return;
  }

  const appointment = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    patientName,
    email,
    phone,
    doctor,
    date,
    time,
    reason,
    status: "Confirmed",
    createdAt: new Date().toISOString()
  };

  appointments.push(appointment);

  if (!saveAppointments(appointments)) {
    return;
  }

  showMessage(
    `Appointment confirmed for ${patientName} with ${doctor} on ${formatDate(date)} at ${formatTime(time)}.`,
    "success"
  );

  form.reset();

  // Reset the date restriction after resetting the form.
  dateInput.min = getLocalDate();

  renderAppointments();

  // Scroll to the appointment list.
  document.getElementById("appointments").scrollIntoView({
    behavior: "smooth"
  });
});

// Handle cancellation using event delegation.
appointmentList.addEventListener("click", function (event) {
  const button = event.target.closest(".cancel-btn");

  if (!button) {
    return;
  }

  const appointmentId = button.dataset.id;

  if (!window.confirm("Are you sure you want to cancel this appointment?")) {
    return;
  }

  const appointments = getAppointments();

  const appointment = appointments.find(
    (item) => String(item.id) === appointmentId
  );

  if (!appointment || appointment.status === "Cancelled") {
    return;
  }

  appointment.status = "Cancelled";

  if (saveAppointments(appointments)) {
    showMessage("Appointment cancelled successfully.", "success");
    renderAppointments();
  }
});

// Fill the booking form when a doctor is selected.
document.querySelectorAll(".doctor-select").forEach((button) => {
  button.addEventListener("click", function () {
    doctorSelect.value = button.dataset.doctor;

    document.getElementById("booking").scrollIntoView({
      behavior: "smooth"
    });
  });
});

