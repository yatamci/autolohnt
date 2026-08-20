"use strict";

/*
 * ============================================================
 * AUTO-COST-CHECK
 * Frontend Application
 * ============================================================
 */

const STORAGE_KEY = "autoCostCheck.savedCars";
const THEME_KEY = "autoCostCheck.theme";

/* ------------------------------------------------------------
   DOM HELPERS
------------------------------------------------------------ */

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

function getValue(id) {
  const element = document.getElementById(id);
  return element ? element.value.trim() : "";
}

function getNumber(id) {
  const value = getValue(id);

  if (!value) return null;

  const number = Number(
    value.replace(/\./g, "").replace(",", ".")
  );

  return Number.isFinite(number) ? number : null;
}

function setValue(id, value) {
  const element = document.getElementById(id);

  if (element && value !== undefined && value !== null) {
    element.value = value;
  }
}

function show(element) {
  if (element) {
    element.classList.remove("hidden");
  }
}

function hide(element) {
  if (element) {
    element.classList.add("hidden");
  }
}

/* ------------------------------------------------------------
   THEME
------------------------------------------------------------ */

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;

  const icon = $("#themeToggle");

  if (icon) {
    icon.textContent = theme === "dark" ? "☀️" : "🌙";
    icon.setAttribute(
      "aria-label",
      theme === "dark"
        ? "Hellen Modus aktivieren"
        : "Dunklen Modus aktivieren"
    );
  }

  localStorage.setItem(THEME_KEY, theme);
}

function initTheme() {
  const savedTheme = localStorage.getItem(THEME_KEY);

  if (savedTheme === "dark" || savedTheme === "light") {
    applyTheme(savedTheme);
    return;
  }

  const prefersDark = window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;

  applyTheme(prefersDark ? "dark" : "light");
}

function toggleTheme() {
  const current =
    document.documentElement.dataset.theme === "dark"
      ? "dark"
      : "light";

  applyTheme(current === "dark" ? "light" : "dark");
}

/* ------------------------------------------------------------
   TABS
------------------------------------------------------------ */

function initTabs() {
  $$(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      $$(".tab").forEach((item) => {
        item.classList.remove("active");
      });

      tab.classList.add("active");

      const target = tab.dataset.target;

      $$(".tab-content").forEach((section) => {
        section.classList.add("hidden");
      });

      if (target) {
        const section = document.getElementById(target);

        if (section) {
          section.classList.remove("hidden");
        }
      }
    });
  });
}

/* ------------------------------------------------------------
   API
------------------------------------------------------------ */

async function apiRequest(params = {}) {
  const query = new URLSearchParams(params);

  const response = await fetch(
    `/api/vehicle-search?${query.toString()}`,
    {
      method: "GET",
      headers: {
        Accept: "application/json"
      }
    }
  );

  let result;

  try {
    result = await response.json();
  } catch {
    throw new Error(
      `Ungültige Antwort vom Server (${response.status}).`
    );
  }

  if (!response.ok || result.success === false) {
    throw new Error(
      result.error ||
      `Serverfehler (${response.status})`
    );
  }

  return result.data;
}

/* ------------------------------------------------------------
   API STATUS
------------------------------------------------------------ */

function setApiStatus(type, message) {
  const status = $("#apiStatus");

  if (!status) return;

  status.className = "api-status";

  if (type) {
    status.classList.add(type);
  }

  status.textContent = message;

  show(status);
}

/* ------------------------------------------------------------
   VEHICLE SEARCH TABS
------------------------------------------------------------ */

function initVehicleSearchTabs() {
  $$(".search-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      $$(".search-tab").forEach((item) => {
        item.classList.remove("active");
      });

      tab.classList.add("active");

      $$(".search-panel").forEach((panel) => {
        panel.classList.add("hidden");
      });

      const target = tab.dataset.panel;

      if (target) {
        const panel = document.getElementById(target);

        if (panel) {
          panel.classList.remove("hidden");
        }
      }
    });
  });
}

/* ------------------------------------------------------------
   HSN / TSN SEARCH
------------------------------------------------------------ */

async function searchByHsnTsn() {
  const hsn = getValue("hsn");
  const tsn = getValue("tsn");

  if (!hsn || !tsn) {
    setApiStatus(
      "error",
      "Bitte HSN und TSN eingeben."
    );
    return;
  }

  setApiStatus(
    "loading",
    "Fahrzeug wird gesucht …"
  );

  const button = $("#hsnTsnSearchBtn");

  if (button) {
    button.disabled = true;
  }

  try {
    const data = await apiRequest({
      action: "vehicle",
      hsn,
      tsn
    });

    renderVehicleData(data);

    setApiStatus(
      "success",
      "Fahrzeug erfolgreich gefunden."
    );

  } catch (error) {
    console.error(error);

    setApiStatus(
      "error",
      error.message || "Fahrzeug konnte nicht gefunden werden."
    );

    hide($("#vehicleData"));

  } finally {
    if (button) {
      button.disabled = false;
    }
  }
}

/* ------------------------------------------------------------
   MODEL SEARCH
------------------------------------------------------------ */

async function loadBrands() {
  const select = $("#brandSelect");

  if (!select) return;

  select.innerHTML =
    '<option value="">Marke auswählen …</option>';

  try {
    const data = await apiRequest({
      action: "brands"
    });

    const brands = Array.isArray(data)
      ? data
      : Array.isArray(data?.brands)
        ? data.brands
        : Array.isArray(data?.data)
          ? data.data
          : [];

    brands.forEach((brand) => {
      const value =
        typeof brand === "string"
          ? brand
          : brand.name ||
            brand.brand ||
            brand.slug ||
            "";

      if (!value) return;

      const option = document.createElement("option");

      option.value = value;
      option.textContent = value;

      select.appendChild(option);
    });

  } catch (error) {
    console.error(error);

    select.innerHTML =
      '<option value="">Marken konnten nicht geladen werden</option>';
  }
}

async function loadModels() {
  const brand = getValue("brandSelect");
  const select = $("#modelSelect");

  if (!select) return;

  select.innerHTML =
    '<option value="">Modell auswählen …</option>';

  select.disabled = true;

  if (!brand) {
    return;
  }

  try {
    const data = await apiRequest({
      action: "models",
      brand
    });

    const models = Array.isArray(data)
      ? data
      : Array.isArray(data?.models)
        ? data.models
        : Array.isArray(data?.data)
          ? data.data
          : [];

    models.forEach((model) => {
      const value =
        typeof model === "string"
          ? model
          : model.name ||
            model.model ||
            model.slug ||
            "";

      if (!value) return;

      const option = document.createElement("option");

      option.value = value;
      option.textContent = value;

      select.appendChild(option);
    });

    select.disabled = false;

  } catch (error) {
    console.error(error);

    select.innerHTML =
      '<option value="">Modelle konnten nicht geladen werden</option>';
  }
}

async function searchByModel() {
  const brand = getValue("brandSelect");
  const model = getValue("modelSelect");

  if (!brand || !model) {
    setApiStatus(
      "error",
      "Bitte Marke und Modell auswählen."
    );
    return;
  }

  setApiStatus(
    "loading",
    "Fahrzeugdaten werden gesucht …"
  );

  const button = $("#modelSearchBtn");

  if (button) {
    button.disabled = true;
  }

  try {
    const data = await apiRequest({
      action: "vehicles",
      brand,
      model
    });

    renderVehicleSearchResults(data);

    setApiStatus(
      "success",
      "Fahrzeugdaten gefunden."
    );

  } catch (error) {
    console.error(error);

    setApiStatus(
      "error",
      error.message || "Keine Fahrzeugdaten gefunden."
    );

  } finally {
    if (button) {
      button.disabled = false;
    }
  }
}

/* ------------------------------------------------------------
   VEHICLE DISPLAY
------------------------------------------------------------ */

function normalizeVehicle(data) {
  const vehicle =
    data?.vehicle ||
    data?.data?.vehicle ||
    data;

  if (!vehicle || typeof vehicle !== "object") {
    return null;
  }

  return vehicle;
}

function renderVehicleData(data) {
  const vehicle = normalizeVehicle(data);
  const container = $("#vehicleData");

  if (!vehicle || !container) {
    return;
  }

  const brand =
    vehicle.brand ||
    vehicle.make ||
    "";

  const model =
    vehicle.model ||
    vehicle.name ||
    "";

  const display =
    vehicle.display_vehicle ||
    vehicle.displayVehicle ||
    "";

  const years =
    vehicle.years ||
    vehicle.year ||
    "";

  const hsn =
    vehicle.hsn ||
    getValue("hsn");

  const tsn =
    vehicle.tsn ||
    getValue("tsn");

  setText("vehicleBrand", brand);
  setText("vehicleModel", model);
  setText(
    "vehicleDisplay",
    display || `${brand} ${model}`.trim()
  );
  setText("vehicleYears", years || "—");
  setText("vehicleHsn", hsn || "—");
  setText("vehicleTsn", tsn || "—");

  show(container);

  /*
   * API-Daten für die Berechnung übernehmen.
   * Persönliche Nutzerwerte werden NICHT automatisch gesetzt.
   */
  setValue("selectedBrand", brand);
  setValue("selectedModel", model);
  setValue("selectedHsn", hsn);
  setValue("selectedTsn", tsn);
}

function renderVehicleSearchResults(data) {
  const container = $("#vehicleSearchResults");

  if (!container) return;

  container.innerHTML = "";

  const vehicles =
    Array.isArray(data)
      ? data
      : Array.isArray(data?.vehicles)
        ? data.vehicles
        : Array.isArray(data?.data)
          ? data.data
          : [];

  if (!vehicles.length) {
    container.innerHTML =
      '<p class="card">Keine passenden Fahrzeuge gefunden.</p>';
    return;
  }

  vehicles.forEach((vehicle, index) => {
    const item = document.createElement("button");

    item.type = "button";
    item.className = "saved";
    item.style.width = "100%";
    item.style.border = "0";
    item.style.textAlign = "left";

    const brand =
      vehicle.brand ||
      vehicle.make ||
      "";

    const model =
      vehicle.model ||
      vehicle.name ||
      "";

    const display =
      vehicle.display_vehicle ||
      `${brand} ${model}`.trim();

    const hsn =
      vehicle.hsn ||
      "";

    const tsn =
      vehicle.tsn ||
      "";

    item.innerHTML = `
      <span>
        <strong>${escapeHtml(display || "Fahrzeug")}</strong>
        <small>
          ${hsn ? `HSN: ${escapeHtml(hsn)}` : ""}
          ${tsn ? ` · TSN: ${escapeHtml(tsn)}` : ""}
        </small>
      </span>
      <span>›</span>
    `;

    item.addEventListener("click", () => {
      renderVehicleData({
        vehicle
      });

      setApiStatus(
        "success",
        "Fahrzeug ausgewählt."
      );
    });

    container.appendChild(item);
  });
}

function setText(id, value) {
  const element = document.getElementById(id);

  if (element) {
    element.textContent = value ?? "";
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* ------------------------------------------------------------
   CALCULATION
------------------------------------------------------------ */

function calculateCurrentCar() {
  const purchasePrice = getNumber("purchasePrice");
  const purchaseKm = getNumber("purchaseKm");
  const currentKm = getNumber("currentKm");
  const annualKm = getNumber("annualKm");
  const consumption = getNumber("consumption");
  const fuelPrice = getNumber("fuelPrice");
  const insurance = getNumber("insurance");
  const tax = getNumber("tax");
  const repairCost = getNumber("repairCost");
  const currentValue = getNumber("currentValue");

  if (
    annualKm === null ||
    consumption === null ||
    fuelPrice === null
  ) {
    showCalculationError(
      "Bitte mindestens jährliche Fahrleistung, Verbrauch und Kraftstoffpreis eingeben."
    );
    return;
  }

  const annualFuelLiters =
    annualKm * consumption / 100;

  const annualFuelCost =
    annualFuelLiters * fuelPrice;

  const annualFixedCosts =
    (insurance || 0) * 12 +
    (tax || 0);

  const annualRunningCosts =
    annualFuelCost +
    annualFixedCosts;

  const kmSincePurchase =
    purchaseKm !== null &&
    currentKm !== null
      ? Math.max(0, currentKm - purchaseKm)
      : null;

  const totalKnownCosts =
    (purchasePrice || 0) +
    (repairCost || 0);

  const estimatedRemainingYears =
    annualKm > 0 && currentKm !== null
      ? Math.max(
          0,
          Math.min(
            10,
            (300000 - currentKm) / annualKm
          )
        )
      : null;

  let recommendation;
  let resultClass;

  if (
    repairCost !== null &&
    currentValue !== null
  ) {
    if (repairCost <= currentValue * 0.25) {
      recommendation =
        "Die Reparatur erscheint wirtschaftlich sinnvoll.";
      resultClass = "green";
    } else if (repairCost <= currentValue * 0.5) {
      recommendation =
        "Die Reparatur ist noch vertretbar, sollte aber mit dem Fahrzeugwert verglichen werden.";
      resultClass = "amber";
    } else {
      recommendation =
        "Die Reparatur ist im Verhältnis zum Fahrzeugwert eher teuer. Ein Verkauf sollte geprüft werden.";
      resultClass = "red";
    }
  } else {
    recommendation =
      "Für eine Reparaturentscheidung fehlen noch Reparaturkosten und aktueller Fahrzeugwert.";
    resultClass = "amber";
  }

  renderCalculationResult({
    recommendation,
    resultClass,
    annualFuelCost,
    annualRunningCosts,
    kmSincePurchase,
    estimatedRemainingYears,
    currentKm
  });
}

function showCalculationError(message) {
  const result = $("#calculationResult");

  if (!result) return;

  result.className = "result red";

  result.innerHTML = `
    <strong>Eingaben prüfen</strong>
    <p>${escapeHtml(message)}</p>
  `;

  show(result);
}

function renderCalculationResult(data) {
  const result = $("#calculationResult");

  if (!result) return;

  result.className = `result ${data.resultClass}`;

  const years =
    data.estimatedRemainingYears !== null
      ? `${data.estimatedRemainingYears.toFixed(1)} Jahre`
      : "—";

  const km =
    data.currentKm !== null
      ? `${Math.round(data.currentKm).toLocaleString("de-DE")} km`
      : "—";

  result.innerHTML = `
    <strong>${escapeHtml(data.recommendation)}</strong>

    <p>
      Auf Basis deiner aktuellen Eingaben solltest du die
      laufenden Kosten und den Fahrzeugwert regelmäßig neu bewerten.
    </p>

    <div class="metrics">

      <div>
        <b>
          ${Math.round(data.annualFuelCost).toLocaleString("de-DE")} €
        </b>
        <small>Kraftstoff / Jahr</small>
      </div>

      <div>
        <b>
          ${Math.round(data.annualRunningCosts).toLocaleString("de-DE")} €
        </b>
        <small>bekannte laufende Kosten / Jahr</small>
      </div>

      <div>
        <b>${years}</b>
        <small>theoretischer Planungshorizont</small>
      </div>

      <div>
        <b>${km}</b>
        <small>aktueller Kilometerstand</small>
      </div>

    </div>
  `;

  show(result);
}

/* ------------------------------------------------------------
   SAVED CARS
------------------------------------------------------------ */

function getSavedCars() {
  try {
    const cars = JSON.parse(
      localStorage.getItem(STORAGE_KEY) || "[]"
    );

    return Array.isArray(cars) ? cars : [];

  } catch {
    return [];
  }
}

function saveCars(cars) {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(cars)
  );
}

function collectCurrentCar() {
  return {
    id: crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`,

    createdAt: new Date().toISOString(),

    vehicle: {
      brand: getValue("selectedBrand"),
      model: getValue("selectedModel"),
      hsn: getValue("selectedHsn"),
      tsn: getValue("selectedTsn")
    },

    purchasePrice: getNumber("purchasePrice"),
    purchaseKm: getNumber("purchaseKm"),
    purchaseDate: getValue("purchaseDate"),
    currentKm: getNumber("currentKm"),
    annualKm: getNumber("annualKm"),
    consumption: getNumber("consumption"),
    fuelPrice: getNumber("fuelPrice"),
    insurance: getNumber("insurance"),
    tax: getNumber("tax"),
    repairCost: getNumber("repairCost"),
    currentValue: getNumber("currentValue"),

    notes: getValue("notes")
  };
}

function saveCurrentCar() {
  const car = collectCurrentCar();

  const hasVehicle =
    car.vehicle.brand ||
    car.vehicle.model ||
    car.vehicle.hsn ||
    car.vehicle.tsn;

  if (!hasVehicle) {
    alert(
      "Bitte zuerst ein Fahrzeug auswählen oder HSN/TSN eingeben."
    );
    return;
  }

  const cars = getSavedCars();

  cars.push(car);

  saveCars(cars);
  renderSavedCars();

  setApiStatus(
    "success",
    "Fahrzeug wurde gespeichert."
  );
}

function deleteSavedCar(id) {
  const cars =
    getSavedCars().filter((car) => car.id !== id);

  saveCars(cars);
  renderSavedCars();
}

function loadSavedCar(id) {
  const car =
    getSavedCars().find((item) => item.id === id);

  if (!car) return;

  setValue("selectedBrand", car.vehicle.brand);
  setValue("selectedModel", car.vehicle.model);
  setValue("selectedHsn", car.vehicle.hsn);
  setValue("selectedTsn", car.vehicle.tsn);

  setValue("purchasePrice", car.purchasePrice);
  setValue("purchaseKm", car.purchaseKm);
  setValue("purchaseDate", car.purchaseDate);
  setValue("currentKm", car.currentKm);
  setValue("annualKm", car.annualKm);
  setValue("consumption", car.consumption);
  setValue("fuelPrice", car.fuelPrice);
  setValue("insurance", car.insurance);
  setValue("tax", car.tax);
  setValue("repairCost", car.repairCost);
  setValue("currentValue", car.currentValue);
  setValue("notes", car.notes);

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

function renderSavedCars() {
  const container = $("#savedCars");

  if (!container) return;

  const cars = getSavedCars();

  container.innerHTML = "";

  if (!cars.length) {
    container.innerHTML =
      "<p>Noch keine Fahrzeuge gespeichert.</p>";
    return;
  }

  cars.forEach((car) => {
    const element = document.createElement("div");

    element.className = "saved";

    const title =
      [
        car.vehicle.brand,
        car.vehicle.model
      ]
        .filter(Boolean)
        .join(" ") ||
      "Unbenanntes Fahrzeug";

    element.innerHTML = `
      <span>
        <strong>${escapeHtml(title)}</strong>
        <small>
          ${car.vehicle.hsn
            ? `HSN ${escapeHtml(car.vehicle.hsn)}`
            : ""}
          ${car.vehicle.tsn
            ? ` · TSN ${escapeHtml(car.vehicle.tsn)}`
            : ""}
        </small>
      </span>

      <span style="display:flex;gap:6px">
        <button
          type="button"
          class="btn white load-saved"
        >
          Öffnen
        </button>

        <button
          type="button"
          class="btn white delete-saved danger"
        >
          Löschen
        </button>
      </span>
    `;

    element
      .querySelector(".load-saved")
      .addEventListener("click", () => {
        loadSavedCar(car.id);
      });

    element
      .querySelector(".delete-saved")
      .addEventListener("click", () => {
        deleteSavedCar(car.id);
      });

    container.appendChild(element);
  });
}

/* ------------------------------------------------------------
   BUTTON EVENTS
------------------------------------------------------------ */

function initButtons() {
  const themeToggle = $("#themeToggle");

  if (themeToggle) {
    themeToggle.addEventListener(
      "click",
      toggleTheme
    );
  }

  const hsnTsnSearchBtn =
    $("#hsnTsnSearchBtn");

  if (hsnTsnSearchBtn) {
    hsnTsnSearchBtn.addEventListener(
      "click",
      searchByHsnTsn
    );
  }

  const modelSearchBtn =
    $("#modelSearchBtn");

  if (modelSearchBtn) {
    modelSearchBtn.addEventListener(
      "click",
      searchByModel
    );
  }

  const brandSelect =
    $("#brandSelect");

  if (brandSelect) {
    brandSelect.addEventListener(
      "change",
      loadModels
    );
  }

  const calculateBtn =
    $("#calculateBtn");

  if (calculateBtn) {
    calculateBtn.addEventListener(
      "click",
      calculateCurrentCar
    );
  }

  const saveCarBtn =
    $("#saveCarBtn");

  if (saveCarBtn) {
    saveCarBtn.addEventListener(
      "click",
      saveCurrentCar
    );
  }
}

/* ------------------------------------------------------------
   INIT
------------------------------------------------------------ */

document.addEventListener(
  "DOMContentLoaded",
  () => {
    initTheme();
    initTabs();
    initVehicleSearchTabs();
    initButtons();
    renderSavedCars();

    /*
     * Marken werden nur geladen, wenn die entsprechende
     * Auswahl im HTML vorhanden ist.
     */
    if ($("#brandSelect")) {
      loadBrands();
    }
  }
);