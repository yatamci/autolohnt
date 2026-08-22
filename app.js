/* =========================================================
   AUTO COST CHECK
   app.js
========================================================= */

"use strict";

/* =========================================================
   HILFSFUNKTIONEN
========================================================= */

const $ = (id) => document.getElementById(id);

const API_URL = "/api/vehicle-search";


function clean(value) {
  if (value === undefined || value === null) return "";
  return String(value).trim();
}


function numberValue(id) {

  const el = $(id);

  if (!el) return null;

  const value = parseFloat(
    String(el.value).replace(",", ".")
  );

  return Number.isFinite(value)
    ? value
    : null;
}


function setValue(id, value) {

  const el = $(id);

  if (!el) return;

  el.value =
    value === undefined ||
    value === null
      ? ""
      : value;

}


function formatNumber(value, decimals = 0) {

  if (
    value === undefined ||
    value === null ||
    !Number.isFinite(Number(value))
  ) {
    return "–";
  }

  return new Intl.NumberFormat("de-DE", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(Number(value));

}


function formatEuro(value) {

  if (
    value === undefined ||
    value === null ||
    !Number.isFinite(Number(value))
  ) {
    return "–";
  }

  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Number(value));

}


function formatKm(value) {

  if (
    value === undefined ||
    value === null ||
    !Number.isFinite(Number(value))
  ) {
    return "–";
  }

  return `${formatNumber(value)} km`;

}


function escapeHtml(value) {

  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

}


/* =========================================================
   API
========================================================= */

async function apiRequest(params = {}) {

  const query =
    new URLSearchParams();

  Object.entries(params)
    .forEach(([key, value]) => {

      if (
        value !== undefined &&
        value !== null &&
        String(value).trim() !== ""
      ) {

        query.set(
          key,
          String(value).trim()
        );

      }

    });

  const response =
    await fetch(
      `${API_URL}?${query.toString()}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json"
        }
      }
    );

  let data = null;

  try {

    data =
      await response.json();

  } catch {

    data = {
      success: false,
      error:
        "Ungültige Antwort vom Server."
    };

  }

  if (
    !response.ok ||
    data?.success === false
  ) {

    throw new Error(
      data?.error ||
      data?.message ||
      `Serverfehler (${response.status})`
    );

  }

  return data?.data ?? data;

}


/* =========================================================
   STATUS
========================================================= */

function showStatus(
  id,
  message,
  type = "loading"
) {

  const element = $(id);

  if (!element) return;

  element.className =
    `api-status ${type}`;

  element.textContent =
    message;

}


function hideStatus(id) {

  const element = $(id);

  if (!element) return;

  element.classList.add("hidden");
  element.textContent = "";

}


function showElement(id) {

  const element = $(id);

  if (element) {
    element.classList.remove("hidden");
  }

}


function hideElement(id) {

  const element = $(id);

  if (element) {
    element.classList.add("hidden");
  }

}


/* =========================================================
   TABS
========================================================= */

function initMainTabs() {

  const tabs =
    document.querySelectorAll(
      ".tabs .tab"
    );

  const sections = [
    "currentCarSection",
    "newCarSection",
    "savedSection"
  ];

  tabs.forEach(tab => {

    tab.addEventListener(
      "click",
      () => {

        const target =
          tab.dataset.target;

        tabs.forEach(t =>
          t.classList.remove("active")
        );

        tab.classList.add("active");

        sections.forEach(id => {

          const section = $(id);

          if (!section) return;

          if (id === target) {

            section.classList.remove(
              "hidden"
            );

          } else {

            section.classList.add(
              "hidden"
            );

          }

        });

      }
    );

  });

}


/* =========================================================
   SUCH-TABS
========================================================= */

function initSearchTabs() {

  document
    .querySelectorAll(".search-tabs")
    .forEach(container => {

      const tabs =
        container.querySelectorAll(
          ".search-tab"
        );

      tabs.forEach(tab => {

        tab.addEventListener(
          "click",
          () => {

            const panelId =
              tab.dataset.panel;

            tabs.forEach(t =>
              t.classList.remove(
                "active"
              )
            );

            tab.classList.add("active");

            const parent =
              tab.closest(
                ".vehicle-search"
              );

            if (!parent) return;

            parent
              .querySelectorAll(
                ".search-panel"
              )
              .forEach(panel => {

                if (
                  panel.id === panelId
                ) {

                  panel.classList.remove(
                    "hidden"
                  );

                } else {

                  panel.classList.add(
                    "hidden"
                  );

                }

              });

          }
        );

      });

    });

}


/* =========================================================
   DARK MODE
========================================================= */

function initTheme() {

  const button =
    $("themeToggle");

  if (!button) return;

  const saved =
    localStorage.getItem(
      "acc_theme"
    );

  if (saved === "dark") {

    document.documentElement
      .setAttribute(
        "data-theme",
        "dark"
      );

    button.textContent = "☀️";

  }

  button.addEventListener(
    "click",
    () => {

      const dark =
        document.documentElement
          .getAttribute(
            "data-theme"
          ) === "dark";

      if (dark) {

        document.documentElement
          .removeAttribute(
            "data-theme"
          );

        localStorage.setItem(
          "acc_theme",
          "light"
        );

        button.textContent =
          "🌙";

      } else {

        document.documentElement
          .setAttribute(
            "data-theme",
            "dark"
          );

        localStorage.setItem(
          "acc_theme",
          "dark"
        );

        button.textContent =
          "☀️";

      }

    }
  );

}


/* =========================================================
   SELECT HELFER
========================================================= */

function clearSelect(
  id,
  placeholder
) {

  const select = $(id);

  if (!select) return;

  select.innerHTML = "";

  const option =
    document.createElement(
      "option"
    );

  option.value = "";
  option.textContent =
    placeholder;

  select.appendChild(option);

  select.disabled = true;

}


function fillSelect(
  id,
  items,
  placeholder,
  valueKey = null,
  labelKey = null
) {

  const select = $(id);

  if (!select) return;

  select.innerHTML = "";

  const first =
    document.createElement(
      "option"
    );

  first.value = "";
  first.textContent =
    placeholder;

  select.appendChild(first);

  if (!Array.isArray(items)) {

    select.disabled = true;

    return;

  }

  items.forEach(item => {

    let value;
    let label;

    if (
      typeof item === "string"
    ) {

      value = item;
      label = item;

    } else {

      value =
        valueKey
          ? item?.[valueKey]
          : (
              item?.id ??
              item?.slug ??
              item?.name ??
              item?.value ??
              item?.model ??
              item?.brand
            );

      label =
        labelKey
          ? item?.[labelKey]
          : (
              item?.name ??
              item?.label ??
              item?.model ??
              item?.brand ??
              item?.title ??
              value
            );

    }

    if (
      value === undefined ||
      value === null ||
      String(value).trim() === ""
    ) {
      return;
    }

    const option =
      document.createElement(
        "option"
      );

    option.value = value;
    option.textContent =
      label ?? value;

    select.appendChild(option);

  });

  select.disabled =
    select.options.length <= 1;

}


/* =========================================================
   API DATEN NORMALISIEREN
========================================================= */

function unwrapVehicle(data) {

  if (!data) return null;

  if (Array.isArray(data)) {
    return data[0] || null;
  }

  if (data.vehicle) {
    return unwrapVehicle(
      data.vehicle
    );
  }

  if (data.data) {
    return unwrapVehicle(
      data.data
    );
  }

  if (data.result) {
    return unwrapVehicle(
      data.result
    );
  }

  if (
    data.results &&
    Array.isArray(data.results)
  ) {
    return data.results[0] || null;
  }

  return data;

}


function findValue(
  object,
  keys
) {

  if (
    !object ||
    typeof object !== "object"
  ) {
    return null;
  }

  for (const key of keys) {

    if (
      object[key] !== undefined &&
      object[key] !== null &&
      object[key] !== ""
    ) {

      return object[key];

    }

  }

  return null;

}


function normalizeVehicle(raw) {

  const vehicle =
    unwrapVehicle(raw);

  if (!vehicle) return null;

  const brand =
    findValue(vehicle, [
      "brand",
      "make",
      "manufacturer",
      "make_name"
    ]);

  const model =
    findValue(vehicle, [
      "model",
      "model_name"
    ]);

  const generation =
    findValue(vehicle, [
      "generation",
      "generation_name"
    ]);

  const engine =
    findValue(vehicle, [
      "engine",
      "engine_name",
      "engine_type"
    ]);

  const year =
    findValue(vehicle, [
      "year",
      "model_year",
      "production_year",
      "registration_year"
    ]);

  const power =
    findValue(vehicle, [
      "power_ps",
      "ps",
      "hp",
      "horsepower",
      "power"
    ]);

  const displacement =
    findValue(vehicle, [
      "displacement_l",
      "engine_displacement_l",
      "displacement"
    ]);

  const fuel =
    findValue(vehicle, [
      "fuel",
      "fuel_type",
      "fuelType"
    ]);

  const transmission =
    findValue(vehicle, [
      "transmission",
      "gearbox"
    ]);

  const hsn =
    findValue(vehicle, [
      "hsn"
    ]);

  const tsn =
    findValue(vehicle, [
      "tsn"
    ]);

  return {
    raw: vehicle,
    brand,
    model,
    generation,
    engine,
    year,
    power,
    displacement,
    fuel,
    transmission,
    hsn,
    tsn
  };

}


/* =========================================================
   FAHRZEUG ANZEIGEN
========================================================= */

function renderVehicle(
  containerId,
  vehicle
) {

  const container =
    $(containerId);

  if (!container) return;

  if (!vehicle) {

    container.innerHTML = `
      <div class="result red">
        <strong>Kein Fahrzeug gefunden</strong>
        <p>
          Die API hat kein passendes Fahrzeug geliefert.
        </p>
      </div>
    `;

    container.classList.remove(
      "hidden"
    );

    return;

  }

  const title =
    [
      vehicle.brand,
      vehicle.model
    ]
      .filter(Boolean)
      .join(" ");

  const subtitle =
    [
      vehicle.generation,
      vehicle.engine
    ]
      .filter(Boolean)
      .join(" · ");

  container.innerHTML = `

    <div class="vehicle-header">

      <div>

        <small>FAHRZEUG GEFUNDEN</small>

        <h3>
          ${escapeHtml(
            title || "Fahrzeug"
          )}
        </h3>

        <p>
          ${escapeHtml(
            subtitle ||
            "Fahrzeugdaten"
          )}
        </p>

      </div>

      <div class="vehicle-check">
        ✓
      </div>

    </div>


    <div class="vehicle-specs">

      <div>
        <strong>
          ${escapeHtml(
            vehicle.year ?? "–"
          )}
        </strong>
        <small>Baujahr</small>
      </div>

      <div>
        <strong>
          ${escapeHtml(
            vehicle.power
              ? formatNumber(
                  vehicle.power
                )
              : "–"
          )}
          ${vehicle.power ? " PS" : ""}
        </strong>
        <small>Leistung</small>
      </div>

      <div>
        <strong>
          ${escapeHtml(
            vehicle.displacement
              ? formatNumber(
                  vehicle.displacement,
                  1
                )
              : "–"
          )}
          ${vehicle.displacement ? " L" : ""}
        </strong>
        <small>Hubraum</small>
      </div>

      <div>
        <strong>
          ${escapeHtml(
            vehicle.fuel || "–"
          )}
        </strong>
        <small>Kraftstoff</small>
      </div>

    </div>
  `;

  container.classList.remove(
    "hidden"
  );

}


/* =========================================================
   FAHRZEUG SPEICHERN
========================================================= */

let currentVehicle = null;
let newVehicle = null;


/* =========================================================
   HSN / TSN SUCHE
========================================================= */

async function searchVehicleByHsn(
  prefix
) {

  const hsn =
    $(`${prefix}Hsn`)
      ?.value
      .trim();

  const tsn =
    $(`${prefix}Tsn`)
      ?.value
      .trim();

  const statusId =
    `${prefix}ApiStatus`;

  const vehicleDataId =
    `${prefix}VehicleData`;

  if (!hsn || !tsn) {

    showStatus(
      statusId,
      "Bitte HSN und TSN eingeben.",
      "error"
    );

    return;

  }

  showStatus(
    statusId,
    "Fahrzeug wird gesucht …",
    "loading"
  );

  hideElement(
    vehicleDataId
  );

  try {

    const data =
      await apiRequest({
        action: "vehicle",
        hsn,
        tsn
      });

    const vehicle =
      normalizeVehicle(data);

    if (
      prefix === "current"
    ) {

      currentVehicle =
        vehicle;

    } else {

      newVehicle =
        vehicle;

    }

    renderVehicle(
      vehicleDataId,
      vehicle
    );

    showStatus(
      statusId,
      "Fahrzeug erfolgreich gefunden.",
      "success"
    );

  } catch (error) {

    showStatus(
      statusId,
      error.message,
      "error"
    );

  }

}


/* =========================================================
   MARKEN LADEN
========================================================= */

async function loadBrands(
  prefix
) {

  const select =
    $(`${prefix}BrandSelect`);

  if (!select) return;

  try {

    const data =
      await apiRequest({
        action: "brands"
      });

    let brands = data;

    if (
      !Array.isArray(brands) &&
      Array.isArray(data?.brands)
    ) {

      brands =
        data.brands;

    }

    fillSelect(
      `${prefix}BrandSelect`,
      brands,
      "Marke auswählen"
    );

  } catch (error) {

    console.error(
      "Marken konnten nicht geladen werden:",
      error
    );

  }

}


/* =========================================================
   MODELLE LADEN
========================================================= */

async function loadModels(
  prefix
) {

  const brand =
    $(`${prefix}BrandSelect`)
      ?.value;

  clearSelect(
    `${prefix}ModelSelect`,
    "Modell auswählen"
  );

  clearSelect(
    `${prefix}GenerationSelect`,
    "Typ / Generation auswählen"
  );

  clearSelect(
    `${prefix}EngineSelect`,
    "Motorisierung auswählen"
  );

  if (!brand) return;

  try {

    const data =
      await apiRequest({
        action: "models",
        brand
      });

    let models = data;

    if (
      !Array.isArray(models) &&
      Array.isArray(data?.models)
    ) {

      models =
        data.models;

    }

    fillSelect(
      `${prefix}ModelSelect`,
      models,
      "Modell auswählen"
    );

  } catch (error) {

    console.error(
      "Modelle konnten nicht geladen werden:",
      error
    );

  }

}


/* =========================================================
   GENERATIONEN LADEN
========================================================= */

async function loadGenerations(
  prefix
) {

  const brand =
    $(`${prefix}BrandSelect`)
      ?.value;

  const model =
    $(`${prefix}ModelSelect`)
      ?.value;

  clearSelect(
    `${prefix}GenerationSelect`,
    "Typ / Generation auswählen"
  );

  clearSelect(
    `${prefix}EngineSelect`,
    "Motorisierung auswählen"
  );

  if (
    !brand ||
    !model
  ) {
    return;
  }

  try {

    const data =
      await apiRequest({
        action: "generations",
        brand,
        model
      });

    let generations =
      data;

    if (
      !Array.isArray(generations) &&
      Array.isArray(
        data?.generations
      )
    ) {

      generations =
        data.generations;

    }

    fillSelect(
      `${prefix}GenerationSelect`,
      generations,
      "Typ / Generation auswählen"
    );

  } catch (error) {

    console.error(
      "Generationen konnten nicht geladen werden:",
      error
    );

  }

}


/* =========================================================
   MOTOREN LADEN
========================================================= */

async function loadEngines(
  prefix
) {

  const brand =
    $(`${prefix}BrandSelect`)
      ?.value;

  const model =
    $(`${prefix}ModelSelect`)
      ?.value;

  const generation =
    $(`${prefix}GenerationSelect`)
      ?.value;

  clearSelect(
    `${prefix}EngineSelect`,
    "Motorisierung auswählen"
  );

  if (
    !brand ||
    !model ||
    !generation
  ) {

    return;

  }

  try {

    const data =
      await apiRequest({
        action: "engines",
        brand,
        model,
        generation
      });

    let engines =
      data;

    if (
      !Array.isArray(engines) &&
      Array.isArray(
        data?.engines
      )
    ) {

      engines =
        data.engines;

    }

    fillSelect(
      `${prefix}EngineSelect`,
      engines,
      "Motorisierung auswählen"
    );

  } catch (error) {

    console.error(
      "Motorisierungen konnten nicht geladen werden:",
      error
    );

  }

}


/* =========================================================
   FAHRZEUG ÜBER MODELL AUSWÄHLEN
========================================================= */

async function selectVehicleByModel(
  prefix
) {

  const brand =
    $(`${prefix}BrandSelect`)
      ?.value;

  const model =
    $(`${prefix}ModelSelect`)
      ?.value;

  const generation =
    $(`${prefix}GenerationSelect`)
      ?.value;

  const engine =
    $(`${prefix}EngineSelect`)
      ?.value;

  const statusId =
    `${prefix}ApiStatus`;

  const vehicleDataId =
    `${prefix}VehicleData`;

  if (
    !brand ||
    !model
  ) {

    showStatus(
      statusId,
      "Bitte mindestens Marke und Modell auswählen.",
      "error"
    );

    return;

  }

  showStatus(
    statusId,
    "Fahrzeug wird geladen …",
    "loading"
  );

  try {

    const data =
      await apiRequest({
        action: "vehicles",
        brand,
        model,
        generation,
        engine
      });

    const vehicle =
      normalizeVehicle(data);

    if (
      prefix === "current"
    ) {

      currentVehicle =
        vehicle;

    } else {

      newVehicle =
        vehicle;

    }

    renderVehicle(
      vehicleDataId,
      vehicle
    );

    showStatus(
      statusId,
      "Fahrzeug erfolgreich ausgewählt.",
      "success"
    );

  } catch (error) {

    showStatus(
      statusId,
      error.message,
      "error"
    );

  }

}


/* =========================================================
   FAHRZEUGWERT SCHÄTZEN
========================================================= */

function estimateVehicleValue(
  purchasePrice,
  purchaseKm,
  currentKm
) {

  if (
    !purchasePrice ||
    purchasePrice <= 0
  ) {

    return null;

  }

  const kmDifference =
    Math.max(
      0,
      (currentKm ||
        purchaseKm ||
        0) -
      (purchaseKm || 0)
    );

  /*
   * Grobe Modellrechnung.
   * Der Wert wird ausschließlich intern
   * für die Wirtschaftlichkeitsberechnung
   * verwendet und nicht vom Nutzer eingegeben.
   */

  const depreciation =
    Math.min(
      0.75,
      kmDifference /
        250000 *
        0.55
    );

  return Math.max(
    500,
    purchasePrice *
      (1 - depreciation)
  );

}


/* =========================================================
   HALTEDAUER BERECHNEN
========================================================= */

function calculateRecommendedHolding(
  data
) {

  const {
    purchasePrice,
    purchaseKm,
    currentKm,
    annualKm,
    consumption,
    fuelPrice,
    insurance,
    tax
  } = data;

  if (
    !purchasePrice ||
    !currentKm ||
    !annualKm ||
    annualKm <= 0
  ) {

    return null;

  }

  const kmDriven =
    Math.max(
      0,
      currentKm -
        (purchaseKm ||
          currentKm)
    );

  const fuelPerYear =
    consumption &&
    fuelPrice
      ? annualKm /
        100 *
        consumption *
        fuelPrice
      : 0;

  const fixedPerYear =
    (insurance || 0) *
      12 +
    (tax || 0);

  const annualRunningCost =
    fuelPerYear +
    fixedPerYear;

  let recommendedYears = 5;

  if (
    currentKm >= 220000
  ) {

    recommendedYears = 2;

  } else if (
    currentKm >= 190000
  ) {

    recommendedYears = 3;

  } else if (
    currentKm >= 160000
  ) {

    recommendedYears = 4;

  } else if (
    currentKm >= 130000
  ) {

    recommendedYears = 5;

  } else {

    recommendedYears = 6;

  }

  if (
    annualRunningCost > 3500
  ) {

    recommendedYears -= 1;

  }

  recommendedYears =
    Math.max(
      1,
      Math.min(
        8,
        recommendedYears
      )
    );

  const recommendedKm =
    currentKm +
    annualKm *
      recommendedYears;

  const annualValueLoss =
    purchasePrice *
    0.08;

  const estimatedTotalAnnualCost =
    annualRunningCost +
    annualValueLoss;

  return {
    recommendedYears,
    recommendedKm,
    annualRunningCost,
    estimatedTotalAnnualCost,
    kmDriven
  };

}


/* =========================================================
   AKTUELLES AUTO BERECHNEN
========================================================= */

function calculateCurrent() {

  const purchasePrice =
    numberValue(
      "currentPurchasePrice"
    );

  const purchaseKm =
    numberValue(
      "currentPurchaseKm"
    );

  const currentKm =
    numberValue(
      "currentKm"
    );

  const annualKm =
    numberValue(
      "currentAnnualKm"
    );

  const consumption =
    numberValue(
      "currentConsumption"
    );

  const fuelPrice =
    numberValue(
      "currentFuelPrice"
    );

  const insurance =
    numberValue(
      "currentInsurance"
    );

  const tax =
    numberValue(
      "currentTax"
    );

  const repairCost =
    numberValue(
      "currentRepairCost"
    );

  if (
    purchasePrice === null ||
    purchaseKm === null ||
    currentKm === null ||
    annualKm === null ||
    consumption === null ||
    fuelPrice === null
  ) {

    const result =
      $("currentResult");

    result.className =
      "result red";

    result.innerHTML = `
      <strong>Angaben fehlen</strong>

      <p>
        Bitte fülle mindestens Kaufpreis,
        Kilometerstände, Fahrleistung,
        Verbrauch und Kraftstoffpreis aus.
      </p>
    `;

    result.classList.remove(
      "hidden"
    );

    return;

  }

  /*
   * Fahrzeugwert wird automatisch
   * anhand der eingegebenen Daten geschätzt.
   * Es gibt kein Eingabefeld mehr dafür.
   */

  const estimatedValue =
    estimateVehicleValue(
      purchasePrice,
      purchaseKm,
      currentKm
    );

  const holding =
    calculateRecommendedHolding({
      purchasePrice,
      purchaseKm,
      currentKm,
      annualKm,
      consumption,
      fuelPrice,
      insurance,
      tax
    });

  let repairHtml = "";

  if (
    repairCost !== null &&
    repairCost > 0
  ) {

    if (
      estimatedValue !== null &&
      repairCost <=
        estimatedValue *
        0.35
    ) {

      repairHtml = `
        <div class="result green">

          <strong>
            Reparatur eher sinnvoll
          </strong>

          <p>
            ${formatEuro(
              repairCost
            )}
            entsprechen nur etwa
            ${formatNumber(
              repairCost /
                estimatedValue *
                100,
              1
            )}% des geschätzten
            Fahrzeugwerts von
            ${formatEuro(
              estimatedValue
            )}.
          </p>

        </div>
      `;

    } else if (
      estimatedValue !== null &&
      repairCost <=
        estimatedValue *
        0.60
    ) {

      repairHtml = `
        <div class="result amber">

          <strong>
            Reparatur genau abwägen
          </strong>

          <p>
            Die Reparaturkosten von
            ${formatEuro(
              repairCost
            )}
            entsprechen etwa
            ${formatNumber(
              repairCost /
                estimatedValue *
                100,
              1
            )}% des geschätzten
            Fahrzeugwerts.
          </p>

        </div>
      `;

    } else {

      repairHtml = `
        <div class="result red">

          <strong>
            Verkauf eher prüfen
          </strong>

          <p>
            Die Reparaturkosten von
            ${formatEuro(
              repairCost
            )}
            sind im Verhältnis zum
            geschätzten Fahrzeugwert von
            ${formatEuro(
              estimatedValue
            )}
            sehr hoch.
          </p>

        </div>
      `;

    }

  }

  const result =
    $("currentResult");

  result.className =
    "result";

  result.innerHTML = `

    <strong>
      Weiterfahren ist aktuell grundsätzlich sinnvoll.
    </strong>

    <p>
      Eine Reparatur ist nicht automatisch ein Grund,
      das Fahrzeug zu verkaufen. Entscheidend sind die
      zukünftigen Gesamtkosten.
    </p>

    ${
      holding
        ? `
          <div class="metrics">

            <div>
              <b>
                ca. ${holding.recommendedYears} Jahre
              </b>

              <small>
                empfohlene weitere Haltedauer
              </small>
            </div>

            <div>
              <b>
                ${formatKm(
                  holding.recommendedKm
                )}
              </b>

              <small>
                ungefährer Prüfpunkt für einen Verkauf
              </small>
            </div>

            <div>
              <b>
                ${formatEuro(
                  holding.annualRunningCost
                )}
              </b>

              <small>
                jährliche laufende Kosten
              </small>
            </div>

          </div>
        `
        : ""
    }

    ${
      estimatedValue
        ? `
          <div class="result">

            <strong>
              Geschätzter Fahrzeugwert:
              ${formatEuro(
                estimatedValue
              )}
            </strong>

            <p>
              Dies ist nur eine Rechengröße
              und kein konkreter Marktpreis.
            </p>

          </div>
        `
        : ""
    }

    ${repairHtml}

  `;

  result.classList.remove(
    "hidden"
  );

}


/* =========================================================
   VERGLEICH NEUES AUTO
========================================================= */

function calculateComparison() {

  const currentAnnualKm =
    numberValue(
      "currentAnnualKm"
    );

  const currentConsumption =
    numberValue(
      "currentConsumption"
    );

  const currentFuelPrice =
    numberValue(
      "currentFuelPrice"
    );

  const currentInsurance =
    numberValue(
      "currentInsurance"
    ) || 0;

  const currentTax =
    numberValue(
      "currentTax"
    ) || 0;

  const currentPurchasePrice =
    numberValue(
      "currentPurchasePrice"
    );

  const currentKm =
    numberValue(
      "currentKm"
    );

  const newPurchasePrice =
    numberValue(
      "newPurchasePrice"
    );

  const newConsumption =
    numberValue(
      "newConsumption"
    );

  const newInsurance =
    numberValue(
      "newInsurance"
    ) || 0;

  const newTax =
    numberValue(
      "newTax"
    ) || 0;

  if (
    currentAnnualKm === null ||
    currentConsumption === null ||
    currentFuelPrice === null ||
    newPurchasePrice === null ||
    newConsumption === null
  ) {

    const result =
      $("comparisonResult");

    result.className =
      "result red";

    result.innerHTML = `
      <strong>Angaben fehlen</strong>

      <p>
        Für den Vergleich werden die Daten des
        aktuellen Autos und mindestens Kaufpreis
        und Verbrauch des neuen Autos benötigt.
      </p>
    `;

    result.classList.remove(
      "hidden"
    );

    return;

  }

  const currentFuelCost =
    currentAnnualKm /
      100 *
      currentConsumption *
      currentFuelPrice;

  const newFuelCost =
    currentAnnualKm /
      100 *
      newConsumption *
      currentFuelPrice;

  const currentAnnualCost =
    currentFuelCost +
    currentInsurance *
      12 +
    currentTax;

  const newAnnualCost =
    newFuelCost +
    newInsurance *
      12 +
    newTax;

  const annualSaving =
    currentAnnualCost -
    newAnnualCost;

  const currentPrice =
    currentPurchasePrice || 0;

  const additionalInvestment =
    Math.max(
      0,
      newPurchasePrice -
        currentPrice
    );

  const paybackYears =
    annualSaving > 0
      ? additionalInvestment /
        annualSaving
      : null;

  const fuelSaving =
    currentFuelCost -
    newFuelCost;

  const result =
    $("comparisonResult");

  result.className =
    "result";

  let recommendation;

  if (
    paybackYears !== null &&
    paybackYears <= 5
  ) {

    recommendation = `
      <div class="result green">

        <strong>
          Der Wechsel kann sich finanziell lohnen.
        </strong>

        <p>
          Die zusätzlichen Anschaffungskosten
          würden sich rechnerisch nach ungefähr
          ${formatNumber(
            paybackYears,
            1
          )}
          Jahren amortisieren.
        </p>

      </div>
    `;

  } else if (
    paybackYears !== null &&
    paybackYears <= 10
  ) {

    recommendation = `
      <div class="result amber">

        <strong>
          Der Mehrwert ist eher begrenzt.
        </strong>

        <p>
          Die zusätzlichen Anschaffungskosten
          amortisieren sich erst nach ungefähr
          ${formatNumber(
            paybackYears,
            1
          )}
          Jahren.
        </p>

      </div>
    `;

  } else {

    recommendation = `
      <div class="result red">

        <strong>
          Ein Wechsel ist finanziell aktuell
          eher nicht attraktiv.
        </strong>

        <p>
          Der finanzielle Vorteil des neuen Autos
          reicht voraussichtlich nicht aus, um die
          Mehrkosten innerhalb eines sinnvollen
          Zeitraums auszugleichen.
        </p>

      </div>
    `;

  }

  result.innerHTML = `

    ${recommendation}

    <div class="metrics">

      <div>
        <b>
          ${formatEuro(
            currentAnnualCost
          )}
        </b>

        <small>
          aktuelle jährliche Kosten
        </small>
      </div>

      <div>
        <b>
          ${formatEuro(
            newAnnualCost
          )}
        </b>

        <small>
          neue jährliche Kosten
        </small>
      </div>

      <div>
        <b>
          ${formatEuro(
            Math.abs(
              annualSaving
            )
          )}
        </b>

        <small>
          ${
            annualSaving >= 0
              ? "jährliche Ersparnis"
              : "jährliche Mehrkosten"
          }
        </small>
      </div>

    </div>


    <div class="metrics">

      <div>
        <b>
          ${formatEuro(
            fuelSaving
          )}
        </b>

        <small>
          Kraftstoffersparnis pro Jahr
        </small>
      </div>

      <div>
        <b>
          ${formatEuro(
            additionalInvestment
          )}
        </b>

        <small>
          zusätzliche Investition
        </small>
      </div>

      <div>
        <b>
          ${
            paybackYears !== null
              ? formatNumber(
                  paybackYears,
                  1
                ) + " Jahre"
              : "nicht erreichbar"
          }
        </b>

        <small>
          Amortisationszeit
        </small>
      </div>

    </div>


    ${
      currentKm !== null
        ? `
          <p style="margin-top:18px">
            Aktueller Kilometerstand:

            <strong>
              ${formatKm(
                currentKm
              )}
            </strong>
          </p>
        `
        : ""
    }

  `;

  result.classList.remove(
    "hidden"
  );

}


/* =========================================================
   GESPEICHERTE AUTOS
========================================================= */

const STORAGE_KEY =
  "autoCostCheck_savedCars";


function getSavedCars() {

  try {

    const data =
      localStorage.getItem(
        STORAGE_KEY
      );

    return data
      ? JSON.parse(data)
      : [];

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

    id: Date.now(),

    created:
      new Date().toISOString(),

    vehicle:
      currentVehicle,

    purchasePrice:
      numberValue(
        "currentPurchasePrice"
      ),

    purchaseKm:
      numberValue(
        "currentPurchaseKm"
      ),

    purchaseDate:
      $("currentPurchaseDate")
        ?.value || "",

    currentKm:
      numberValue(
        "currentKm"
      ),

    annualKm:
      numberValue(
        "currentAnnualKm"
      ),

    consumption:
      numberValue(
        "currentConsumption"
      ),

    fuelPrice:
      numberValue(
        "currentFuelPrice"
      ),

    insurance:
      numberValue(
        "currentInsurance"
      ),

    tax:
      numberValue(
        "currentTax"
      ),

    repairCost:
      numberValue(
        "currentRepairCost"
      )

  };

}


function saveCurrentCar() {

  const car =
    collectCurrentCar();

  if (
    !car.purchasePrice &&
    !car.currentKm &&
    !car.vehicle
  ) {

    alert(
      "Bitte zuerst dein Fahrzeug und die wichtigsten Daten eingeben."
    );

    return;

  }

  const cars =
    getSavedCars();

  cars.push(car);

  saveCars(cars);

  renderSavedCars();

  alert(
    "Fahrzeug wurde gespeichert."
  );

}


function deleteSavedCar(id) {

  const cars =
    getSavedCars()
      .filter(
        car =>
          String(car.id) !==
          String(id)
      );

  saveCars(cars);

  renderSavedCars();

}


function loadSavedCar(id) {

  const car =
    getSavedCars()
      .find(
        item =>
          String(item.id) ===
          String(id)
      );

  if (!car) return;

  const vehicle =
    car.vehicle;

  currentVehicle =
    vehicle || null;

  setValue(
    "currentPurchasePrice",
    car.purchasePrice
  );

  setValue(
    "currentPurchaseKm",
    car.purchaseKm
  );

  setValue(
    "currentPurchaseDate",
    car.purchaseDate
  );

  setValue(
    "currentKm",
    car.currentKm
  );

  setValue(
    "currentAnnualKm",
    car.annualKm
  );

  setValue(
    "currentConsumption",
    car.consumption
  );

  setValue(
    "currentFuelPrice",
    car.fuelPrice
  );

  setValue(
    "currentInsurance",
    car.insurance
  );

  setValue(
    "currentTax",
    car.tax
  );

  setValue(
    "currentRepairCost",
    car.repairCost
  );

  if (vehicle) {

    renderVehicle(
      "currentVehicleData",
      vehicle
    );

  }

  document
    .querySelectorAll(
      ".tabs .tab"
    )
    .forEach(tab => {

      tab.classList.toggle(
        "active",
        tab.dataset.target ===
          "currentCarSection"
      );

    });

  [
    "currentCarSection",
    "newCarSection",
    "savedSection"
  ].forEach(id => {

    const section = $(id);

    if (!section) return;

    section.classList.toggle(
      "hidden",
      id !== "currentCarSection"
    );

  });

}


/* =========================================================
   GESPEICHERTE AUTOS RENDERN
========================================================= */

function renderSavedCars() {

  const container =
    $("savedCars");

  if (!container) return;

  const cars =
    getSavedCars();

  if (!cars.length) {

    container.innerHTML = `
      <div class="result">

        <strong>
          Noch keine Fahrzeuge gespeichert
        </strong>

        <p>
          Speichere dein aktuelles Fahrzeug,
          um es später wieder aufzurufen.
        </p>

      </div>
    `;

    return;

  }

  container.innerHTML =
    cars.map(car => {

      const vehicle =
        car.vehicle;

      const title =
        vehicle
          ? [
              vehicle.brand,
              vehicle.model
            ]
              .filter(Boolean)
              .join(" ")
          : "Fahrzeug";

      const subtitle =
        vehicle
          ? [
              vehicle.generation,
              vehicle.engine
            ]
              .filter(Boolean)
              .join(" · ")
          : "Keine Fahrzeugdaten";

      return `

        <div class="saved">

          <div>

            <strong>
              ${escapeHtml(
                title ||
                "Fahrzeug"
              )}
            </strong>

            <small>
              ${escapeHtml(
                subtitle
              )}
            </small>

            <small>
              ${
                car.currentKm
                  ? formatKm(
                      car.currentKm
                    )
                  : "Kilometerstand nicht angegeben"
              }
            </small>

          </div>

          <div class="actions">

            <button
              type="button"
              class="btn white"
              data-load-car="${car.id}"
            >
              Laden
            </button>

            <button
              type="button"
              class="btn white danger"
              data-delete-car="${car.id}"
            >
              Löschen
            </button>

          </div>

        </div>

      `;

    }).join("");


  container
    .querySelectorAll(
      "[data-load-car]"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          loadSavedCar(
            button.dataset.loadCar
          );

        }
      );

    });


  container
    .querySelectorAll(
      "[data-delete-car]"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          deleteSavedCar(
            button.dataset.deleteCar
          );

        }
      );

    });

}


/* =========================================================
   GESPEICHERTE AUTOS ÖFFNEN
========================================================= */

function openSavedCars() {

  document
    .querySelectorAll(
      ".tabs .tab"
    )
    .forEach(tab => {

      tab.classList.remove(
        "active"
      );

    });

  [
    "currentCarSection",
    "newCarSection",
    "savedSection"
  ].forEach(id => {

    const section = $(id);

    if (!section) return;

    section.classList.toggle(
      "hidden",
      id !== "savedSection"
    );

  });

  renderSavedCars();

}


/* =========================================================
   EINGABEN LÖSCHEN
========================================================= */

function clearInputs() {

  const inputs =
    document.querySelectorAll(
      "input"
    );

  inputs.forEach(input => {

    input.value = "";

  });


  currentVehicle = null;
  newVehicle = null;


  document
    .querySelectorAll(
      ".vehicle-data"
    )
    .forEach(element => {

      element.innerHTML = "";

      element.classList.add(
        "hidden"
      );

    });


  document
    .querySelectorAll(
      ".api-status"
    )
    .forEach(element => {

      element.textContent = "";

      element.classList.add(
        "hidden"
      );

    });


  const currentResult =
    $("currentResult");

  if (currentResult) {

    currentResult.innerHTML = "";

    currentResult.className =
      "result hidden";

  }


  const comparisonResult =
    $("comparisonResult");

  if (comparisonResult) {

    comparisonResult.innerHTML = "";

    comparisonResult.className =
      "result hidden";

  }


  [
    "currentModelSelect",
    "currentGenerationSelect",
    "currentEngineSelect",
    "newModelSelect",
    "newGenerationSelect",
    "newEngineSelect"
  ].forEach(id => {

    const select = $(id);

    if (!select) return;

    select.selectedIndex = 0;
    select.disabled = true;

  });

}


/* =========================================================
   DIREKTER FAHRZEUGVERGLEICH
========================================================= */

function renderVehicleComparison() {

  const container =
    $("vehicleComparison");

  const section =
    $("comparisonSection");

  if (
    !container ||
    !section
  ) {
    return;
  }

  if (
    !currentVehicle ||
    !newVehicle
  ) {

    section.classList.add(
      "hidden"
    );

    return;

  }

  const rows = [

    [
      "Marke",
      currentVehicle.brand,
      newVehicle.brand
    ],

    [
      "Modell",
      currentVehicle.model,
      newVehicle.model
    ],

    [
      "Generation",
      currentVehicle.generation,
      newVehicle.generation
    ],

    [
      "Baujahr",
      currentVehicle.year,
      newVehicle.year
    ],

    [
      "Leistung",
      currentVehicle.power
        ? `${formatNumber(
            currentVehicle.power
          )} PS`
        : "–",

      newVehicle.power
        ? `${formatNumber(
            newVehicle.power
          )} PS`
        : "–"
    ],

    [
      "Hubraum",
      currentVehicle.displacement
        ? `${formatNumber(
            currentVehicle.displacement,
            1
          )} L`
        : "–",

      newVehicle.displacement
        ? `${formatNumber(
            newVehicle.displacement,
            1
          )} L`
        : "–"
    ],

    [
      "Kraftstoff",
      currentVehicle.fuel || "–",
      newVehicle.fuel || "–"
    ],

    [
      "Getriebe",
      currentVehicle.transmission || "–",
      newVehicle.transmission || "–"
    ],

    [
      "HSN",
      currentVehicle.hsn || "–",
      newVehicle.hsn || "–"
    ],

    [
      "TSN",
      currentVehicle.tsn || "–",
      newVehicle.tsn || "–"
    ]

  ];


  container.innerHTML = `

    <table>

      <thead>

        <tr>
          <th>Merkmal</th>
          <th>Aktuelles Auto</th>
          <th>Neues Auto</th>
        </tr>

      </thead>

      <tbody>

        ${rows.map(row => `

          <tr>

            <td>
              <strong>
                ${escapeHtml(
                  row[0]
                )}
              </strong>
            </td>

            <td>
              ${escapeHtml(
                row[1] ?? "–"
              )}
            </td>

            <td>
              ${escapeHtml(
                row[2] ?? "–"
              )}
            </td>

          </tr>

        `).join("")}

      </tbody>

    </table>

  `;


  section.classList.remove(
    "hidden"
  );

}


/* =========================================================
   EVENTS
========================================================= */

function initEvents() {

  /* HSN / TSN */

  $("currentHsnSearchBtn")
    ?.addEventListener(
      "click",
      () =>
        searchVehicleByHsn(
          "current"
        )
    );


  $("newHsnSearchBtn")
    ?.addEventListener(
      "click",
      () =>
        searchVehicleByHsn(
          "new"
        )
    );


  /* Marken */

  $("currentBrandSelect")
    ?.addEventListener(
      "change",
      () =>
        loadModels(
          "current"
        )
    );


  $("newBrandSelect")
    ?.addEventListener(
      "change",
      () =>
        loadModels(
          "new"
        )
    );


  /* Modelle */

  $("currentModelSelect")
    ?.addEventListener(
      "change",
      () =>
        loadGenerations(
          "current"
        )
    );


  $("newModelSelect")
    ?.addEventListener(
      "change",
      () =>
        loadGenerations(
          "new"
        )
    );


  /* Generation */

  $("currentGenerationSelect")
    ?.addEventListener(
      "change",
      () =>
        loadEngines(
          "current"
        )
    );


  $("newGenerationSelect")
    ?.addEventListener(
      "change",
      () =>
        loadEngines(
          "new"
        )
    );


  /* Modell-Suche */

  $("currentModelSearchBtn")
    ?.addEventListener(
      "click",
      () =>
        selectVehicleByModel(
          "current"
        )
    );


  $("newModelSearchBtn")
    ?.addEventListener(
      "click",
      () =>
        selectVehicleByModel(
          "new"
        )
    );


  /* Berechnen */

  $("calculateCurrentBtn")
    ?.addEventListener(
      "click",
      calculateCurrent
    );


  $("calculateComparisonBtn")
    ?.addEventListener(
      "click",
      () => {

        calculateComparison();

        renderVehicleComparison();

      }
    );


  /* Speichern */

  $("saveCurrentBtn")
    ?.addEventListener(
      "click",
      saveCurrentCar
    );


  /* Eingaben löschen */

  $("clearInputsBtn")
    ?.addEventListener(
      "click",
      clearInputs
    );


  /* Gespeicherte Autos über Stern */

  $("savedCarsBtn")
    ?.addEventListener(
      "click",
      openSavedCars
    );

}


/* =========================================================
   INITIALISIERUNG
========================================================= */

async function init() {

  initTheme();

  initMainTabs();

  initSearchTabs();

  initEvents();

  renderSavedCars();

  await Promise.allSettled([
    loadBrands("current"),
    loadBrands("new")
  ]);

}


document.addEventListener(
  "DOMContentLoaded",
  init
);