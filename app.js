/* =========================================================
   AUTO COST CHECK
   app.js
========================================================= */

"use strict";

const $ = (id) => document.getElementById(id);

const API_URL = "/api/vehicle-search";

/* =========================================================
   CACHE
========================================================= */

const CACHE_PREFIX = "acc_";
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000;

/* =========================================================
   HILFSFUNKTIONEN
========================================================= */

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

  return Number.isFinite(value) ? value : null;
}

function setValue(id, value) {
  const el = $(id);
  if (!el) return;

  el.value =
    value === undefined || value === null
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
   LOCAL CACHE
========================================================= */

function cacheKey(params) {
  return CACHE_PREFIX + JSON.stringify(
    Object.keys(params)
      .sort()
      .reduce((obj, key) => {
        obj[key] = params[key];
        return obj;
      }, {})
  );
}

function getCache(params) {
  try {
    const raw = localStorage.getItem(cacheKey(params));

    if (!raw) return null;

    const item = JSON.parse(raw);

    if (
      !item ||
      !item.time ||
      Date.now() - item.time > CACHE_TTL
    ) {
      localStorage.removeItem(cacheKey(params));
      return null;
    }

    return item.data;
  } catch {
    return null;
  }
}

function setCache(params, data) {
  try {
    localStorage.setItem(
      cacheKey(params),
      JSON.stringify({
        time: Date.now(),
        data
      })
    );
  } catch {
    /* Cache ist optional. */
  }
}

/* =========================================================
   API REQUEST
========================================================= */

async function apiRequest(params = {}, options = {}) {

  const useCache = options.cache !== false;

  if (useCache) {
    const cached = getCache(params);

    if (cached !== null) {
      return cached;
    }
  }

  const query = new URLSearchParams();

  Object.entries(params).forEach(
    ([key, value]) => {

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

    }
  );

  const response = await fetch(
    `${API_URL}?${query.toString()}`,
    {
      method: "GET",
      headers: {
        Accept: "application/json"
      }
    }
  );

  let data;

  try {
    data = await response.json();
  } catch {
    throw new Error(
      "Ungültige Antwort vom Server."
    );
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

  const result =
    data?.data ?? data;

  if (useCache) {
    setCache(params, result);
  }

  return result;
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

  element.textContent = message;

  element.classList.remove("hidden");
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

  document
    .querySelectorAll(".tabs .tab")
    .forEach(tab => {

      tab.addEventListener(
        "click",
        () => {

          const target =
            tab.dataset.target;

          document
            .querySelectorAll(".tabs .tab")
            .forEach(t =>
              t.classList.remove("active")
            );

          tab.classList.add("active");

          [
            "currentCarSection",
            "newCarSection",
            "savedSection"
          ].forEach(id => {

            const section = $(id);

            if (!section) return;

            section.classList.toggle(
              "hidden",
              id !== target
            );

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
              t.classList.remove("active")
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

                panel.classList.toggle(
                  "hidden",
                  panel.id !== panelId
                );

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

        button.textContent = "🌙";

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

        button.textContent = "☀️";

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
  placeholder
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

    if (typeof item === "string") {

      value = item;
      label = item;

    } else {

      value =
        item?.id ??
        item?.name ??
        item?.value ??
        item?.model ??
        item?.brand;

      label =
        item?.name ??
        item?.label ??
        item?.model ??
        item?.brand ??
        item?.title ??
        value;

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
   VEHICLE NORMALISIERUNG
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
    Array.isArray(
      data.results
    )
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

  return {

    raw: vehicle,

    brand:
      findValue(
        vehicle,
        [
          "brand",
          "make",
          "manufacturer",
          "make_name",
          "MakeName"
        ]
      ),

    model:
      findValue(
        vehicle,
        [
          "model",
          "model_name",
          "Model_Name"
        ]
      ),

    generation:
      findValue(
        vehicle,
        [
          "generation",
          "generation_name",
          "series"
        ]
      ),

    engine:
      findValue(
        vehicle,
        [
          "engine",
          "engine_name",
          "engine_type"
        ]
      ),

    year:
      findValue(
        vehicle,
        [
          "year",
          "model_year",
          "production_year",
          "registration_year",
          "ModelYear"
        ]
      ),

    power:
      findValue(
        vehicle,
        [
          "power_ps",
          "ps",
          "hp",
          "horsepower",
          "power"
        ]
      ),

    displacement:
      findValue(
        vehicle,
        [
          "displacement_l",
          "engine_displacement_l",
          "displacement"
        ]
      ),

    fuel:
      findValue(
        vehicle,
        [
          "fuel",
          "fuel_type",
          "fuelType"
        ]
      ),

    transmission:
      findValue(
        vehicle,
        [
          "transmission",
          "gearbox"
        ]
      ),

    hsn:
      findValue(
        vehicle,
        ["hsn"]
      ),

    tsn:
      findValue(
        vehicle,
        ["tsn"]
      )

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
        <strong>
          Kein Fahrzeug gefunden
        </strong>

        <p>
          Die Datenquelle hat kein
          passendes Fahrzeug geliefert.
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

        <small>
          FAHRZEUG GEFUNDEN
        </small>

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
        <small>
          Baujahr
        </small>
      </div>

      <div>
        <strong>
          ${
            vehicle.power
              ? `${formatNumber(
                  vehicle.power
                )} PS`
              : "–"
          }
        </strong>
        <small>
          Leistung
        </small>
      </div>

      <div>
        <strong>
          ${
            vehicle.displacement
              ? `${formatNumber(
                  vehicle.displacement,
                  1
                )} L`
              : "–"
          }
        </strong>
        <small>
          Hubraum
        </small>
      </div>

      <div>
        <strong>
          ${escapeHtml(
            vehicle.fuel || "–"
          )}
        </strong>
        <small>
          Kraftstoff
        </small>
      </div>

    </div>
  `;

  container.classList.remove(
    "hidden"
  );
}

/* =========================================================
   AKTUELLE FAHRZEUGE
========================================================= */

let currentVehicle = null;
let newVehicle = null;

/* =========================================================
   HSN / TSN
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

    if (prefix === "current") {
      currentVehicle = vehicle;
    } else {
      newVehicle = vehicle;
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
      error.message ||
        "Fahrzeug konnte nicht gefunden werden.",
      "error"
    );

  }
}

/* =========================================================
   MARKEN
========================================================= */

async function loadBrands(
  prefix
) {

  const select =
    $(`${prefix}BrandSelect`);

  if (!select) return;

  clearSelect(
    `${prefix}BrandSelect`,
    "Marke wird geladen …"
  );

  try {

    /*
     * WICHTIG:
     * Diese Anfrage geht jetzt über
     * die kostenlose NHTSA/vPIC-Datenquelle.
     *
     * API4Cars wird hierfür nicht benutzt.
     */

    const data =
      await apiRequest({
        action: "brands"
      });

    const brands =
      Array.isArray(data)
        ? data
        : data?.brands || [];

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

    clearSelect(
      `${prefix}BrandSelect`,
      "Marken konnten nicht geladen werden"
    );

  }
}

/* =========================================================
   MODELLE
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

    const models =
      Array.isArray(data)
        ? data
        : data?.models || [];

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

    clearSelect(
      `${prefix}ModelSelect`,
      "Modelle nicht verfügbar"
    );

  }
}

/* =========================================================
   GENERATIONEN
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

  /*
   * Die kostenlose NHTSA-Quelle stellt keine
   * zuverlässige deutsche Generationenliste bereit.
   *
   * Deshalb wird hier nicht unnötig API4Cars
   * belastet.
   */

  if (!brand || !model) {
    return;
  }

  try {

    const data =
      await apiRequest({
        action: "generations",
        brand,
        model
      });

    const generations =
      Array.isArray(data)
        ? data
        : data?.generations || [];

    fillSelect(
      `${prefix}GenerationSelect`,
      generations,
      "Generation auswählen"
    );

  } catch (error) {

    console.warn(
      "Generationen nicht verfügbar:",
      error
    );

  }
}

/* =========================================================
   MOTOREN
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

    const engines =
      Array.isArray(data)
        ? data
        : data?.engines || [];

    fillSelect(
      `${prefix}EngineSelect`,
      engines,
      "Motorisierung auswählen"
    );

  } catch (error) {

    console.warn(
      "Motorisierungen nicht verfügbar:",
      error
    );

  }
}

/* =========================================================
   FAHRZEUG ÜBER MARKE / MODELL
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

  if (!brand || !model) {

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

    if (prefix === "current") {
      currentVehicle = vehicle;
    } else {
      newVehicle = vehicle;
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

    /*
     * Wichtig:
     * Selbst wenn die technische Variantensuche
     * nicht verfügbar ist, zeigen wir Marke und
     * Modell trotzdem an.
     */

    const vehicle = {
      brand,
      model,
      generation,
      engine
    };

    if (prefix === "current") {
      currentVehicle = vehicle;
    } else {
      newVehicle = vehicle;
    }

    renderVehicle(
      vehicleDataId,
      vehicle
    );

    showStatus(
      statusId,
      "Marke und Modell gefunden. Technische Zusatzdaten sind aktuell nicht verfügbar.",
      "success"
    );

  }
}

/* =========================================================
   FAHRZEUGWERT
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
      (currentKm || purchaseKm || 0) -
      (purchaseKm || 0)
    );

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
   HALTEDAUER
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
      (purchaseKm || currentKm)
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
    (insurance || 0) * 12 +
    (tax || 0);

  const annualRunningCost =
    fuelPerYear +
    fixedPerYear;

  let recommendedYears = 5;

  if (currentKm >= 220000) {
    recommendedYears = 2;
  } else if (currentKm >= 190000) {
    recommendedYears = 3;
  } else if (currentKm >= 160000) {
    recommendedYears = 4;
  } else if (currentKm >= 130000) {
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

  return {
    recommendedYears,

    recommendedKm:
      currentKm +
      annualKm *
      recommendedYears,

    annualRunningCost,

    estimatedTotalAnnualCost:
      annualRunningCost +
      purchasePrice * 0.08,

    kmDriven
  };
}

/* =========================================================
   AKTUELLES AUTO
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
    ) || 0;

  const tax =
    numberValue(
      "currentTax"
    ) || 0;

  const repairCost =
    numberValue(
      "currentRepairCost"
    );

  const vehicleValueInput =
    numberValue(
      "currentValue"
    );

  const result =
    $("currentResult");

  if (!result) return;

  if (
    purchasePrice === null ||
    purchaseKm === null ||
    currentKm === null ||
    annualKm === null ||
    consumption === null ||
    fuelPrice === null
  ) {

    result.className =
      "result red";

    result.innerHTML = `
      <strong>
        Angaben fehlen
      </strong>

      <p>
        Bitte fülle mindestens
        Kaufpreis, Kilometerstände,
        Fahrleistung, Verbrauch
        und Kraftstoffpreis aus.
      </p>
    `;

    return;
  }

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

  const estimatedValue =
    vehicleValueInput ??
    estimateVehicleValue(
      purchasePrice,
      purchaseKm,
      currentKm
    );

  let repairHtml = "";

  if (
    repairCost !== null &&
    repairCost > 0 &&
    estimatedValue !== null
  ) {

    if (
      repairCost <=
      estimatedValue * 0.35
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
            )} %
            des geschätzten Fahrzeugwerts.
          </p>

        </div>
      `;

    } else if (
      repairCost <=
      estimatedValue * 0.60
    ) {

      repairHtml = `
        <div class="result amber">

          <strong>
            Reparatur genau abwägen
          </strong>

          <p>
            Die Reparatur liegt bereits
            bei einem größeren Anteil
            des Fahrzeugwerts.
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
            Die Reparaturkosten sind
            im Verhältnis zum geschätzten
            Fahrzeugwert sehr hoch.
          </p>

        </div>
      `;
    }
  }

  result.className =
    "result";

  result.innerHTML = `
    <strong>
      Weiterfahren ist aktuell
      grundsätzlich sinnvoll.
    </strong>

    <p>
      Eine Reparatur ist nicht
      automatisch ein Grund,
      das Fahrzeug zu verkaufen.
      Entscheidend sind die
      zukünftigen Gesamtkosten.
    </p>

    ${
      holding
        ? `
          <div class="metrics">

            <div>
              <b>
                ca.
                ${holding.recommendedYears}
                Jahre
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
                ungefährer Prüfpunkt
                für einen Verkauf
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
   VERGLEICH
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

  const result =
    $("comparisonResult");

  if (!result) return;

  if (
    currentAnnualKm === null ||
    currentConsumption === null ||
    currentFuelPrice === null ||
    newPurchasePrice === null ||
    newConsumption === null
  ) {

    result.className =
      "result red";

    result.innerHTML = `
      <strong>
        Angaben fehlen
      </strong>

      <p>
        Für den Vergleich werden
        die Daten des aktuellen Autos
        sowie Kaufpreis und Verbrauch
        des neuen Autos benötigt.
      </p>
    `;

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
    currentInsurance * 12 +
    currentTax;

  const newAnnualCost =
    newFuelCost +
    newInsurance * 12 +
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

  let recommendation;

  if (
    paybackYears !== null &&
    paybackYears <= 5
  ) {

    recommendation = `
      <div class="result green">

        <strong>
          Der Wechsel kann sich
          finanziell lohnen.
        </strong>

        <p>
          Die zusätzlichen
          Anschaffungskosten würden sich
          rechnerisch nach ungefähr
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
          Die zusätzlichen
          Anschaffungskosten amortisieren
          sich erst nach ungefähr
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
          Ein Wechsel ist finanziell
          aktuell eher nicht attraktiv.
        </strong>

        <p>
          Der finanzielle Vorteil reicht
          voraussichtlich nicht aus,
          um die Mehrkosten innerhalb
          eines sinnvollen Zeitraums
          auszugleichen.
        </p>

      </div>
    `;
  }

  result.className =
    "result";

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
      ),

    vehicleValue:
      numberValue(
        "currentValue"
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

  currentVehicle =
    car.vehicle || null;

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

  setValue(
    "currentValue",
    car.vehicleValue
  );

  if (car.vehicle) {

    renderVehicle(
      "currentVehicleData",
      car.vehicle
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
      id !==
      "currentCarSection"
    );

  });
}

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
          Speichere dein aktuelles
          Fahrzeug, um es später
          wieder aufzurufen.
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
                title
              )}
            </strong>

            <small class="saved-subtitle">
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
   EINGABEN LÖSCHEN
========================================================= */

function clearInputs() {

  document
    .querySelectorAll(
      "input"
    )
    .forEach(input => {
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

}

/* =========================================================
   EVENTS
========================================================= */

function initEvents() {

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

        if (
          typeof renderVehicleComparison ===
          "function"
        ) {
          renderVehicleComparison();
        }

      }
    );

  $("saveCurrentBtn")
    ?.addEventListener(
      "click",
      saveCurrentCar
    );

  $("clearInputsBtn")
    ?.addEventListener(
      "click",
      clearInputs
    );

  $("savedCarsBtn")
    ?.addEventListener(
      "click",
      () => {

        document
          .querySelector(
            '.tab[data-target="savedSection"]'
          )
          ?.click();

        renderSavedCars();

      }
    );
}

/* =========================================================
   INIT
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