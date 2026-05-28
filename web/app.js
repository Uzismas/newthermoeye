const cases = {
  "TE-2405-0187": {
    score: 82,
    label: "High risk",
    context: "67F · working senior · OCTA OD",
    confidence: "Confidence 88%",
    density: "Vessel density -14.2%",
    review: "Review pending",
    heatmap: "High attention",
    note:
      "Elevated retinal vascular pattern deviation. Recommend clinician review, cognitive screening correlation, and follow-up plan if symptoms or risk factors are present.",
  },
  "TE-2405-0182": {
    score: 58,
    label: "Moderate risk",
    context: "73M · follow-up case · OCT OS",
    confidence: "Confidence 81%",
    density: "Vessel density -7.6%",
    review: "AI completed",
    heatmap: "Moderate attention",
    note:
      "Moderate vascular deviation detected. Review patient history and consider follow-up screening interval based on clinical context.",
  },
  "TE-2405-0179": {
    score: 24,
    label: "Low risk",
    context: "61F · routine scan · OCTA OU",
    confidence: "Confidence 92%",
    density: "Vessel density -1.8%",
    review: "Report ready",
    heatmap: "Low attention",
    note:
      "No strong vascular deviation in this screening result. Continue routine care unless symptoms or risk factors indicate otherwise.",
  },
  "TE-2405-0176": {
    score: 0,
    label: "Blocked",
    context: "70F · OCTA OS · quality failure",
    confidence: "Confidence unavailable",
    density: "Artifact detected",
    review: "Rescan needed",
    heatmap: "Quality blocked",
    note:
      "Image quality failed because artifact and blur exceed the MVP threshold. Request a new scan before AI analysis.",
  },
};

const viewButtons = document.querySelectorAll("[data-target]");
const views = document.querySelectorAll(".view");
const caseButtons = document.querySelectorAll("[data-case]");
const auditLog = document.querySelector("#audit-log");

function showView(target) {
  views.forEach((view) => {
    view.classList.toggle("active", view.id === target);
  });

  document.querySelectorAll(".nav-item").forEach((button) => {
    const isActive = button.dataset.target === target;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-selected", String(isActive));
  });

  window.location.hash = target;
}

function addAudit(message) {
  if (!auditLog) return;

  const now = new Date();
  const timestamp = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const item = document.createElement("li");
  item.innerHTML = `<strong>${timestamp}</strong><span>${message}</span>`;
  auditLog.prepend(item);
}

function setCase(caseId) {
  const selected = cases[caseId];
  if (!selected) return;

  caseButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.case === caseId);
  });

  document.querySelector("#case-code").textContent = caseId;
  document.querySelector("#case-context").textContent = selected.context;
  document.querySelector("#risk-score").textContent = selected.score;
  document.querySelector("#risk-label").textContent = selected.label;
  document.querySelector("#confidence-pill").textContent = selected.confidence;
  document.querySelector("#density-pill").textContent = selected.density;
  document.querySelector("#review-pill").textContent = selected.review;
  document.querySelector("#heatmap-state").textContent = selected.heatmap;
  document.querySelector("#clinical-note").textContent = selected.note;
  document.querySelector("#risk-meter").style.setProperty("--risk-fill", `${selected.score}%`);
  document.querySelector("#density-value").textContent = selected.density.replace("Vessel density ", "");
}

viewButtons.forEach((button) => {
  button.addEventListener("click", () => {
    showView(button.dataset.target);
  });
});

caseButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setCase(button.dataset.case);
  });
});

document.querySelector("#approve-case").addEventListener("click", () => {
  const caseCode = document.querySelector("#case-code").textContent;
  document.querySelector("#review-pill").textContent = "Doctor approved";
  addAudit(`Doctor approved report for ${caseCode}`);
});

document.querySelector("#request-rescan").addEventListener("click", () => {
  const caseCode = document.querySelector("#case-code").textContent;
  document.querySelector("#review-pill").textContent = "Rescan requested";
  addAudit(`Rescan requested for ${caseCode}`);
});

document.querySelector("#queue-upload").addEventListener("click", () => {
  document.querySelector("#upload-label").textContent = "Scan package queued for quarantine";
  addAudit("Hospital staff queued a new scan for secure screening");
  showView("governance");
});

document.querySelector("#scan-file").addEventListener("change", (event) => {
  const [file] = event.target.files;
  if (!file) return;

  document.querySelector("#upload-label").textContent = `${file.name} selected`;
});

document.querySelector("#new-upload").addEventListener("click", () => {
  showView("cases");
});

document.querySelector("#export-audit").addEventListener("click", () => {
  addAudit("Audit export requested by pilot administrator");
  showView("governance");
});

const initialView = window.location.hash.replace("#", "");
if (initialView && document.getElementById(initialView)) {
  showView(initialView);
}
