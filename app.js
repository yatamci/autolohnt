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

  return Number.isFinite(value) ? value : null;

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
   API + CACHE
========================================================= */

/*
 * Fahrzeugdaten ändern sich nur selten.
 * Deshalb werden erfolgreiche API-Antworten lokal
 * im Browser zwischengespeichert.
 *
 * Vorteile:
 * - gleiche Abfrage verursacht 30 Tage lang keinen neuen API-Call
 * - Marken werden nur einmal geladen
 * - Modelle werden gecacht
 * - Generationen werden gecacht
 * - Motorisierungen werden gecacht
 * - HSN/TSN-Abfragen werden gecacht
 * - Fahrzeugabfragen werden gecacht
 * - identische parallele Anfragen werden zusammengeführt
 */

const API_CACHE_PREFIX =
  "autoCostCheck_apiCache_v1:";

const API_CACHE_TTL =
  1000 * 60 * 60 * 24 * 30;

const API_IN_FLIGHT =
  new Map();


/* =========================================================
   CACHE-SCHLÜSSEL
========================================================= */

function apiCacheKey(params = {}) {

  const normalized = {};

  Object.keys(params)
    .sort()
    .forEach(key => {

      const value =
        params[key];

      if (
        value !== undefined &&
        value !== null &&
        String(value).trim() !== ""
      ) {

        normalized[key] =
          String(value).trim();

      }

    });

  return (
    API_CACHE_PREFIX +
    JSON.stringify(normalized)
  );
}


/* =========================================================
   CACHE LESEN
========================================================= */

function getApiCache(key) {

  try {

    const raw =
      localStorage.getItem(key);

    if (!raw) {
      return {
        hit: false
      };
    }

    const cached =
      JSON.parse(raw);

    if (
      !cached ||
      !cached.timestamp
    ) {

      localStorage.removeItem(key);

      return {
        hit: false
      };

    }

    /*
     * Cache ist abgelaufen
     */

    if (
      Date.now() -
      cached.timestamp >
      API_CACHE_TTL
    ) {

      localStorage.removeItem(key);

      return {
        hit: false
      };

    }

    return {
      hit: true,
      data: cached.data
    };

  } catch {

    return {
      hit: false
    };

  }

}


/* =========================================================
   CACHE SPEICHERN
========================================================= */

function setApiCache(
  key,
  data
) {

  try {

    localStorage.setItem(
      key,
      JSON.stringify({
        timestamp: Date.now(),
        data
      })
    );

  } catch (error) {

    /*
     * Falls localStorage voll ist,
     * soll die Anwendung trotzdem funktionieren.
     */

    console.warn(
      "API-Cache konnte nicht gespeichert werden:",
      error
    );

  }

}


/* =========================================================
   API REQUEST
========================================================= */

async function apiRequest(
  params = {}
) {

  const cacheKey =
    apiCacheKey(params);


  /* ======================================================
     1. CACHE PRÜFEN
  ====================================================== */

  const cached =
    getApiCache(cacheKey);

  if (cached.hit) {

    return cached.data;

  }


  /* ======================================================
     2. GLEICHZEITIGE DOPPELTE ANFRAGEN VERHINDERN
  ====================================================== */

  if (
    API_IN_FLIGHT.has(cacheKey)
  ) {

    return API_IN_FLIGHT.get(
      cacheKey
    );

  }


  /* ======================================================
     3. API-ANFRAGE
  ====================================================== */

  const request =
    (async () => {

      const query =
        new URLSearchParams();


      Object.entries(params)
        .forEach(
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


      const response =
        await fetch(
          `${API_URL}?${query.toString()}`,
          {
            method: "GET",

            headers: {
              Accept:
                "application/json"
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


      const result =
        data?.data ?? data;


      /*
       * Nur erfolgreiche Antworten
       * werden gespeichert.
       */

      setApiCache(
        cacheKey,
        result
      );


      return result;

    })();


  API_IN_FLIGHT.set(
    cacheKey,
    request
  );


  try {

    return await request;

  } finally {

    API_IN_FLIGHT.delete(
      cacheKey
    );

  }

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

function showSection(
  target
) {

  const sections = [
    "currentCarSection",
    "newCarSection",
    "savedSection"
  ];


  sections.forEach(
    id => {

      const section =
        $(id);

      if (!section) return;

      section.classList.toggle(
        "hidden",
        id !== target
      );

    }
  );


  document
    .querySelectorAll(
      ".tabs .tab"
    )
    .forEach(
      tab => {

        tab.classList.toggle(
          "active",
          tab.dataset.target ===
            target
        );

      }
    );

}


function initMainTabs() {

  const tabs =
    document.querySelectorAll(
      ".tabs .tab"
    );


  tabs.forEach(
    tab => {

      tab.addEventListener(
        "click",
        () => {

          showSection(
            tab.dataset.target
          );

        }
      );

    }
  );

}


/* =========================================================
   SUCH-TABS
========================================================= */

function initSearchTabs() {

  document
    .querySelectorAll(
      ".search-tabs"
    )
    .forEach(
      container => {

        const tabs =
          container.querySelectorAll(
            ".search-tab"
          );


        tabs.forEach(
          tab => {

            tab.addEventListener(
              "click",
              () => {

                const panelId =
                  tab.dataset.panel;


                tabs.forEach(
                  t =>
                    t.classList.remove(
                      "active"
                    )
                );


                tab.classList.add(
                  "active"
                );


                const parent =
                  tab.closest(
                    ".vehicle-search"
                  );


                if (!parent) return;


                parent
                  .querySelectorAll(
                    ".search-panel"
                  )
                  .forEach(
                    panel => {

                      panel.classList.toggle(
                        "hidden",
                        panel.id !==
                          panelId
                      );

                    }
                  );

              }
            );

          }
        );

      }
    );

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


  if (
    saved === "dark"
  ) {

    document.documentElement
      .setAttribute(
        "data-theme",
        "dark"
      );

    button.textContent =
      "☀️";

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

  const select =
    $(id);

  if (!select) return;


  select.innerHTML = "";


  const option =
    document.createElement(
      "option"
    );

  option.value = "";
  option.textContent =
    placeholder;


  select.appendChild(
    option
  );


  select.disabled = true;

}


function fillSelect(
  id,
  items,
  placeholder,
  valueKey = null,
  labelKey = null
) {

  const select =
    $(id);

  if (!select) return;


  select.innerHTML = "";


  const first =
    document.createElement(
      "option"
    );

  first.value = "";
  first.textContent =
    placeholder;


  select.appendChild(
    first
  );


  if (!Array.isArray(items)) {

    select.disabled = true;

    return;

  }


  items.forEach(
    item => {

      let value;
      let label;


      if (
        typeof item ===
        "string"
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


      option.value =
        value;

      option.textContent =
        label ?? value;


      select.appendChild(
        option
      );

    }
  );


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


  if (data.vehicle_data) {
    return unwrapVehicle(
      data.vehicle_data
    );
  }


  if (data.vehicleData) {
    return unwrapVehicle(
      data.vehicleData
    );
  }


  if (data.specifications) {

    return {
      ...data,
      ...data.specifications
    };

  }


  if (data.technical_data) {

    return {
      ...data,
      ...data.technical_data
    };

  }


  if (data.technicalData) {

    return {
      ...data,
      ...data.technicalData
    };

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

    return (
      data.results[0] ||
      null
    );

  }


  return data;

}


/*
 * Direkte Suche nach einem Wert.
 */

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


  for (
    const key of keys
  ) {

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


/*
 * Tiefensuche:
 * Falls die API die Daten z. B. unter
 * specifications.engine.power_ps
 * oder technical_data.fuel_type
 * liefert, werden sie trotzdem gefunden.
 */

function findValueDeep(
  object,
  keys,
  depth = 0
) {

  if (
    !object ||
    typeof object !== "object" ||
    depth > 6
  ) {
    return null;
  }


  const direct =
    findValue(
      object,
      keys
    );


  if (
    direct !== null &&
    direct !== undefined &&
    direct !== ""
  ) {

    return direct;

  }


  for (
    const value
    of Object.values(object)
  ) {

    if (
      value &&
      typeof value ===
        "object"
    ) {

      const result =
        findValueDeep(
          value,
          keys,
          depth + 1
        );


      if (
        result !== null &&
        result !== undefined &&
        result !== ""
      ) {

        return result;

      }

    }

  }


  return null;

}


/*
 * Zahlen aus Strings wie
 * "1.598 cm³", "1598 cc", "110 PS"
 * usw. besser herauslösen.
 */

function extractNumber(
  value
) {

  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }


  if (
    typeof value ===
    "number"
  ) {

    return Number.isFinite(
      value
    )
      ? value
      : null;

  }


  const normalized =
    String(value)
      .replace(",", ".")
      .replace(
        /[^\d.-]/g,
        " "
      )
      .trim();


  const match =
    normalized.match(
      /-?\d+(?:\.\d+)?/
    );


  if (!match) {
    return null;
  }


  const number =
    Number(
      match[0]
    );


  return Number.isFinite(
    number
  )
    ? number
    : null;

}


/*
 * Hubraum normalisieren.
 * API kann Liter oder cm³ liefern.
 */

function normalizeDisplacement(
  value
) {

  const number =
    extractNumber(
      value
    );


  if (number === null) {
    return null;
  }


  const text =
    String(value)
      .toLowerCase();


  if (
    text.includes("cc") ||
    text.includes("cm3") ||
    text.includes("cm³")
  ) {

    return number / 1000;

  }


  if (
    number > 20
  ) {

    return number / 1000;

  }


  return number;

}


/* =========================================================
   FAHRZEUG NORMALISIEREN
========================================================= */

function normalizeVehicle(
  raw
) {

  const vehicle =
    unwrapVehicle(
      raw
    );


  if (!vehicle) {
    return null;
  }


  const brand =
    findValueDeep(
      vehicle,
      [
        "brand",
        "make",
        "manufacturer",
        "make_name",
        "brand_name",
        "manufacturer_name"
      ]
    );


  const model =
    findValueDeep(
      vehicle,
      [
        "model",
        "model_name",
        "modelName"
      ]
    );


  const generation =
    findValueDeep(
      vehicle,
      [
        "generation",
        "generation_name",
        "generationName",
        "series",
        "series_name"
      ]
    );


  const engine =
    findValueDeep(
      vehicle,
      [
        "engine",
        "engine_name",
        "engine_type",
        "engineName",
        "version",
        "trim"
      ]
    );


  const year =
    findValueDeep(
      vehicle,
      [
        "year",
        "model_year",
        "production_year",
        "registration_year",
        "first_registration_year",
        "manufacture_year",
        "modelYear"
      ]
    );


  const powerRaw =
    findValueDeep(
      vehicle,
      [
        "power_ps",
        "powerPS",
        "ps",
        "hp",
        "horsepower",
        "power",
        "power_hp",
        "engine_power",
        "kw"
      ]
    );


  let power =
    extractNumber(
      powerRaw
    );


  /*
   * Falls nur kW geliefert werden:
   * kW × 1,35962 ≈ PS
   */

  if (
    power !== null &&
    powerRaw !== null &&
    String(powerRaw)
      .toLowerCase()
      .includes("kw")
  ) {

    power =
      power * 1.35962;

  }


  const displacementRaw =
    findValueDeep(
      vehicle,
      [
        "displacement_l",
        "engine_displacement_l",
        "displacement",
        "engine_displacement",
        "engine_capacity",
        "capacity",
        "cc",
        "engine_cc"
      ]
    );


  const displacement =
    normalizeDisplacement(
      displacementRaw
    );


  const fuel =
    findValueDeep(
      vehicle,
      [
        "fuel",
        "fuel_type",
        "fuelType",
        "fuel_name",
        "fuelName",
        "engine_fuel"
      ]
    );


  const transmission =
    findValueDeep(
      vehicle,
      [
        "transmission",
        "gearbox",
        "transmission_type",
        "gearbox_type"
      ]
    );


  const hsn =
    findValueDeep(
      vehicle,
      [
        "hsn"
      ]
    );


  const tsn =
    findValueDeep(
      vehicle,
      [
        "tsn"
      ]
    );


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
            title ||
            "Fahrzeug"
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
            vehicle.year ??
            "–"
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
          ${
            vehicle.power
              ? " PS"
              : ""
          }
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
          ${
            vehicle.displacement
              ? " L"
              : ""
          }
        </strong>
        <small>Hubraum</small>
      </div>


      <div>
        <strong>
          ${escapeHtml(
            vehicle.fuel ||
            "–"
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
      normalizeVehicle(
        data
      );


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


    let brands =
      data;


    if (
      !Array.isArray(brands) &&
      Array.isArray(
        data?.brands
      )
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


    let models =
      data;


    if (
      !Array.isArray(models) &&
      Array.isArray(
        data?.models
      )
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
      normalizeVehicle(
        data
      );


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
      (purchaseKm ||
        0)
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


  let recommendedYears =
    5;


  if (
    currentKm >=
    220000
  ) {

    recommendedYears =
      2;

  } else if (
    currentKm >=
    190000
  ) {

    recommendedYears =
      3;

  } else if (
    currentKm >=
    160000
  ) {

    recommendedYears =
      4;

  } else if (
    currentKm >=
    130000
  ) {

    recommendedYears =
      5;

  } else {

    recommendedYears =
      6;

  }


  if (
    annualRunningCost >
    3500
  ) {

    recommendedYears -=
      1;

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


  /*
   * Der aktuelle Fahrzeugwert wird IMMER
   * automatisch berechnet.
   */

  const estimatedValue =
    estimateVehicleValue(
      purchasePrice,
      purchaseKm,
      currentKm
    );


  let repairHtml =
    "";


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
          <strong>Reparatur eher sinnvoll</strong>
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
            )}% des geschätzten Fahrzeugwerts.
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
          <strong>Reparatur genau abwägen</strong>
          <p>
            Die Reparatur ist finanziell noch
            vertretbar, liegt aber bereits bei
            einem größeren Anteil des Fahrzeugwerts.
          </p>
        </div>
      `;

    } else {

      repairHtml = `
        <div class="result red">
          <strong>Verkauf eher prüfen</strong>
          <p>
            Die Reparaturkosten sind im Verhältnis
            zum geschätzten Fahrzeugwert sehr hoch.
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
      estimatedValue !== null
        ? `
          <div class="result">
            <strong>
              Geschätzter Fahrzeugwert:
              ${formatEuro(
                estimatedValue
              )}
            </strong>

            <p>
              Dieser Wert wird automatisch aus
              Kaufpreis und Kilometerentwicklung
              berechnet und ist nur eine Rechengröße,
              kein konkreter Marktpreis.
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
    currentPurchasePrice ||
    0;


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
        <strong>Der Wechsel kann sich finanziell lohnen.</strong>
        <p>
          Die zusätzlichen Anschaffungskosten würden sich
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
        <strong>Der Mehrwert ist eher begrenzt.</strong>
        <p>
          Die zusätzlichen Anschaffungskosten amortisieren
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
        <strong>Ein Wechsel ist finanziell aktuell eher nicht attraktiv.</strong>
        <p>
          Der finanzielle Vorteil des neuen Autos reicht
          voraussichtlich nicht aus, um die Mehrkosten
          innerhalb eines sinnvollen Zeitraums auszugleichen.
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
                ) +
                " Jahre"
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


  cars.push(
    car
  );


  saveCars(
    cars
  );


  renderSavedCars();


  alert(
    "Fahrzeug wurde gespeichert."
  );

}


function deleteSavedCar(
  id
) {

  const cars =
    getSavedCars()
      .filter(
        car =>
          String(
            car.id
          ) !==
          String(
            id
          )
      );


  saveCars(
    cars
  );


  renderSavedCars();

}


function loadSavedCar(
  id
) {

  const car =
    getSavedCars()
      .find(
        item =>
          String(
            item.id
          ) ===
          String(
            id
          )
      );


  if (!car) return;


  const vehicle =
    car.vehicle;


  currentVehicle =
    vehicle ||
    null;


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


  showSection(
    "currentCarSection"
  );

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
        <strong>Noch keine Fahrzeuge gespeichert</strong>
        <p>
          Speichere dein aktuelles Fahrzeug,
          um es später wieder aufzurufen.
        </p>
      </div>
    `;

    return;

  }


  container.innerHTML =
    cars
      .map(
        car => {

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


          const description =
            vehicle
              ? [
                  vehicle.generation,
                  vehicle.engine
                ]
                  .filter(Boolean)
                  .join(" - ")
              : "Keine Fahrzeugdaten";


          const kmText =
            car.currentKm
              ? formatKm(
                  car.currentKm
                )
              : "Kilometerstand-nicht-angegeben";


          return `

            <div
              class="saved"
              style="
                display:flex;
                align-items:center;
                justify-content:space-between;
                gap:24px;
              "
            >

              <div
                class="saved-info"
                style="
                  flex:1 1 auto;
                  min-width:0;
                  overflow-wrap:anywhere;
                  word-break:break-word;
                "
              >

                <strong>
                  ${escapeHtml(
                    title ||
                    "Fahrzeug"
                  )}
                </strong>

                <small
  style="
    display:block;
    white-space:normal;
    overflow-wrap:normal;
    word-break:normal;
  "
>
                  ${escapeHtml(
                    description
                  )}
                </small>

                <small
                  style="
                    display:block;
                    white-space:normal;
                    overflow-wrap:anywhere;
                    word-break:break-word;
                  "
                >
                  ${escapeHtml(
                    kmText
                  )}
                </small>

              </div>


              <div
                class="actions saved-actions"
                style="
                  display:flex;
                  flex-direction:column;
                  align-items:stretch;
                  justify-content:center;
                  gap:12px;
                  flex:0 0 auto;
                  width:150px;
                  margin:0;
                "
              >

                <button
                  type="button"
                  class="btn white"
                  data-load-car="${car.id}"
                  style="width:100%;"
                >
                  Laden
                </button>


                <button
                  type="button"
                  class="btn white danger"
                  data-delete-car="${car.id}"
                  style="width:100%;"
                >
                  Löschen
                </button>

              </div>

            </div>

          `;

        }
      )
      .join("");


  container
    .querySelectorAll(
      "[data-load-car]"
    )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          () => {

            loadSavedCar(
              button.dataset.loadCar
            );

          }
        );

      }
    );


  container
    .querySelectorAll(
      "[data-delete-car]"
    )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          () => {

            deleteSavedCar(
              button.dataset.deleteCar
            );

          }
        );

      }
    );

}


/* =========================================================
   EINGABEN LÖSCHEN
========================================================= */

function clearInputs() {

  const inputs =
    document.querySelectorAll(
      "input"
    );


  inputs.forEach(
    input => {

      input.value = "";

    }
  );


  currentVehicle =
    null;


  newVehicle =
    null;


  document
    .querySelectorAll(
      ".vehicle-data"
    )
    .forEach(
      element => {

        element.innerHTML =
          "";

        element.classList.add(
          "hidden"
        );

      }
    );


  document
    .querySelectorAll(
      ".api-status"
    )
    .forEach(
      element => {

        element.textContent =
          "";

        element.classList.add(
          "hidden"
        );

      }
    );


  const currentResult =
    $("currentResult");


  if (currentResult) {

    currentResult.innerHTML =
      "";

    currentResult.className =
      "result hidden";

  }


  const comparisonResult =
    $("comparisonResult");


  if (comparisonResult) {

    comparisonResult.innerHTML =
      "";

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
  ]
    .forEach(
      id => {

        const select =
          $(id);


        if (!select) return;


        select.selectedIndex =
          0;


        select.disabled =
          true;

      }
    );

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
      currentVehicle.fuel ||
        "–",
      newVehicle.fuel ||
        "–"
    ],


    [
      "Getriebe",
      currentVehicle.transmission ||
        "–",
      newVehicle.transmission ||
        "–"
    ],


    [
      "HSN",
      currentVehicle.hsn ||
        "–",
      newVehicle.hsn ||
        "–"
    ],


    [
      "TSN",
      currentVehicle.tsn ||
        "–",
      newVehicle.tsn ||
        "–"
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

        ${
          rows
            .map(
              row => `

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
                      row[1] ??
                      "–"
                    )}
                  </td>


                  <td>
                    ${escapeHtml(
                      row[2] ??
                      "–"
                    )}
                  </td>

                </tr>

              `
            )
            .join("")
        }

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


  /* Löschen */

  $("clearInputsBtn")
    ?.addEventListener(
      "click",
      clearInputs
    );


  /* Gespeicherte Autos */

  $("savedCarsBtn")
    ?.addEventListener(
      "click",
      () => {

        renderSavedCars();

        showSection(
          "savedSection"
        );

      }
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


  /*
 * Marken nur EINMAL laden und direkt
 * in beide Auswahlfelder übernehmen.
 *
 * Die alte Version hat beim Start
 * zwei identische API-Abfragen ausgelöst.
 */

try {

  const data =
    await apiRequest({
      action: "brands"
    });


  let brands =
    data;


  if (
    !Array.isArray(brands) &&
    Array.isArray(data?.brands)
  ) {

    brands =
      data.brands;

  }


  fillSelect(
    "currentBrandSelect",
    brands,
    "Marke auswählen"
  );


  fillSelect(
    "newBrandSelect",
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


document.addEventListener(
  "DOMContentLoaded",
  init
);