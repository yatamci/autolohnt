/* =========================================================
   AutoLohnt – app.js
   ========================================================= */

(() => {
  "use strict";

  /* =======================================================
     KONSTANTEN
  ======================================================= */

  const STORAGE_KEY = "autolohnt_saved_cars";
  const THEME_KEY = "autolohnt_theme";

  const state = {
    currentVehicle: null,
    comparisonVehicle: null,
    savedCars: loadSavedCars()
  };

  /* =======================================================
     DOM HELPERS
  ======================================================= */

  const $ = (selector, root = document) =>
    root.querySelector(selector);

  const $$ = (selector, root = document) =>
    [...root.querySelectorAll(selector)];

  function value(id) {
    const el = document.getElementById(id);
    return el ? el.value.trim() : "";
  }

  function numberValue(id) {
    const raw = value(id)
      .replace(/\./g, "")
      .replace(",", ".");

    const n = Number(raw);
    return Number.isFinite(n) ? n : 0;
  }

  function setValue(id, val) {
    const el = document.getElementById(id);
    if (el && val !== undefined && val !== null) {
      el.value = val;
    }
  }

  function show(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove("hidden");
  }

  function hide(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add("hidden");
  }

  /* =======================================================
     FORMATIERUNG
  ======================================================= */

  function euro(number) {
    if (!Number.isFinite(Number(number))) return "–";

    return Number(number).toLocaleString("de-DE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }) + " €";
  }

  function integer(number) {
    if (!Number.isFinite(Number(number))) return "–";

    return Number(number).toLocaleString("de-DE", {
      maximumFractionDigits: 0
    });
  }

  function decimal(number, digits = 1) {
    if (!Number.isFinite(Number(number))) return "–";

    return Number(number).toLocaleString("de-DE", {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits
    });
  }

  function years(number) {
    if (!Number.isFinite(Number(number))) return "–";

    return Number(number).toLocaleString("de-DE", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    }) + " Jahre";
  }

  /* =======================================================
     LOCAL STORAGE
  ======================================================= */

  function loadSavedCars() {
    try {
      const data = JSON.parse(
        localStorage.getItem(STORAGE_KEY) || "[]"
      );

      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }

  function saveCars() {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(state.savedCars)
    );
  }

  /* =======================================================
     THEME
  ======================================================= */

  function initTheme() {
    const savedTheme = localStorage.getItem(THEME_KEY);

    if (savedTheme === "dark") {
      document.documentElement.setAttribute("data-theme", "dark");
    } else if (savedTheme === "light") {
      document.documentElement.setAttribute("data-theme", "light");
    } else {
      const prefersDark =
        window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches;

      document.documentElement.setAttribute(
        "data-theme",
        prefersDark ? "dark" : "light"
      );
    }

    updateThemeButton();
  }

  function toggleTheme() {
    const current =
      document.documentElement.getAttribute("data-theme");

    const next = current === "dark" ? "light" : "dark";

    document.documentElement.setAttribute(
      "data-theme",
      next
    );

    localStorage.setItem(THEME_KEY, next);

    updateThemeButton();
  }

  function updateThemeButton() {
    const button =
      document.getElementById("themeToggle");

    if (!button) return;

    const dark =
      document.documentElement.getAttribute("data-theme") === "dark";

    button.textContent = dark ? "☀️" : "🌙";
    button.setAttribute(
      "aria-label",
      dark ? "Hellen Modus" : "Dunklen Modus"
    );
  }

  /* =======================================================
     EINGABEN ZURÜCKSETZEN
  ======================================================= */

  function resetInputs() {
    const inputs = $$("input");

    inputs.forEach(input => {
      input.value = "";
    });

    $$("select").forEach(select => {
      select.selectedIndex = 0;
    });

    state.currentVehicle = null;
    state.comparisonVehicle = null;

    $$(".result").forEach(result => {
      result.classList.add("hidden");
    });

    $$(".vehicle-data").forEach(vehicle => {
      vehicle.classList.add("hidden");
    });

    const statusElements = $$(".api-status");

    statusElements.forEach(status => {
      status.textContent = "";
      status.className = "api-status hidden";
    });

    updateSavedCars();
  }

  /* =======================================================
     TABS
  ======================================================= */

  function initTabs() {
    $$(".tab").forEach(tab => {
      tab.addEventListener("click", () => {
        const target = tab.dataset.target;

        if (!target) return;

        $$(".tab").forEach(t =>
          t.classList.remove("active")
        );

        tab.classList.add("active");

        $$("[data-section]").forEach(section => {
          section.classList.add("hidden");
        });

        const section =
          document.querySelector(
            `[data-section="${target}"]`
          );

        if (section) {
          section.classList.remove("hidden");
        }
      });
    });
  }

  /* =======================================================
     API
  ======================================================= */

  async function searchVehicle({
    hsn = "",
    tsn = "",
    brand = "",
    model = ""
  } = {}) {

    const params = new URLSearchParams();

    if (hsn) params.set("hsn", hsn);
    if (tsn) params.set("tsn", tsn);
    if (brand) params.set("brand", brand);
    if (model) params.set("model", model);

    if (!params.toString()) {
      throw new Error(
        "Bitte HSN/TSN oder Marke und Modell eingeben."
      );
    }

    const response = await fetch(
      `/api/vehicle-search?${params.toString()}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json"
        }
      }
    );

    let data = null;

    try {
      data = await response.json();
    } catch {
      throw new Error(
        "Die API hat keine gültige Antwort geliefert."
      );
    }

    if (!response.ok) {
      throw new Error(
        data?.error ||
        data?.message ||
        `Fahrzeugsuche fehlgeschlagen (${response.status}).`
      );
    }

    return data;
  }

  /* =======================================================
     API STATUS
  ======================================================= */

  function setApiStatus(id, message, type = "") {
    const el = document.getElementById(id);

    if (!el) return;

    el.className =
      "api-status" +
      (type ? ` ${type}` : "");

    if (!message) {
      el.classList.add("hidden");
      el.textContent = "";
      return;
    }

    el.classList.remove("hidden");
    el.textContent = message;
  }

  /* =======================================================
     FAHRZEUGDATEN NORMALISIEREN
  ======================================================= */

  function normalizeVehicle(data) {

    /*
     CarAPI kann je nach Endpoint / Tarif
     unterschiedliche Daten liefern.
     Deshalb werden mehrere mögliche Feldnamen
     berücksichtigt.
    */

    const vehicle =
      data?.vehicle ||
      data?.data?.vehicle ||
      data?.data ||
      data;

    return {
      hsn:
        vehicle?.hsn ||
        data?.hsn ||
        "",

      tsn:
        vehicle?.tsn ||
        data?.tsn ||
        "",

      brand:
        vehicle?.brand ||
        vehicle?.make ||
        vehicle?.manufacturer ||
        "",

      model:
        vehicle?.model ||
        vehicle?.model_name ||
        "",

      display:
        vehicle?.display_vehicle ||
        vehicle?.displayVehicle ||
        "",

      years:
        vehicle?.years ||
        vehicle?.year_range ||
        "",

      year:
        vehicle?.year ||
        vehicle?.model_year ||
        "",

      ps:
        vehicle?.ps ||
        vehicle?.horsepower ||
        vehicle?.hp ||
        "",

      kw:
        vehicle?.kw ||
        vehicle?.power_kw ||
        "",

      displacement:
        vehicle?.displacement ||
        vehicle?.engine_displacement ||
        vehicle?.cc ||
        "",

      displacementL:
        vehicle?.displacement_l ||
        vehicle?.engine_displacement_l ||
        "",

      fuel:
        vehicle?.fuel ||
        vehicle?.fuel_type ||
        "",

      transmission:
        vehicle?.transmission ||
        "",

      drive:
        vehicle?.drive ||
        vehicle?.drivetrain ||
        "",

      body:
        vehicle?.body ||
        vehicle?.body_type ||
        "",

      doors:
        vehicle?.doors ||
        "",

      raw: data
    };
  }

  /* =======================================================
     FAHRZEUG-DARSTELLUNG
  ======================================================= */

  function renderVehicle(vehicle, containerId) {

    const container =
      document.getElementById(containerId);

    if (!container) return;

    const name =
      [
        vehicle.brand,
        vehicle.model
      ]
      .filter(Boolean)
      .join(" ") ||
      vehicle.display ||
      "Fahrzeug";

    const specs = [];

    if (vehicle.year)
      specs.push([
        "Baujahr",
        vehicle.year
      ]);

    if (vehicle.years)
      specs.push([
        "Bauzeit",
        vehicle.years
      ]);

    if (vehicle.ps)
      specs.push([
        "Leistung",
        `${integer(Number(vehicle.ps))} PS`
      ]);

    if (vehicle.kw)
      specs.push([
        "Leistung",
        `${integer(Number(vehicle.kw))} kW`
      ]);

    if (vehicle.displacementL)
      specs.push([
        "Hubraum",
        `${decimal(Number(vehicle.displacementL), 1)} l`
      ]);

    if (
      !vehicle.displacementL &&
      vehicle.displacement
    ) {
      const cc = Number(vehicle.displacement);

      specs.push([
        "Hubraum",
        Number.isFinite(cc)
          ? `${decimal(cc / 1000, 1)} l`
          : vehicle.displacement
      ]);
    }

    if (vehicle.fuel)
      specs.push([
        "Kraftstoff",
        vehicle.fuel
      ]);

    if (vehicle.transmission)
      specs.push([
        "Getriebe",
        vehicle.transmission
      ]);

    if (vehicle.drive)
      specs.push([
        "Antrieb",
        vehicle.drive
      ]);

    if (vehicle.body)
      specs.push([
        "Karosserie",
        vehicle.body
      ]);

    if (vehicle.doors)
      specs.push([
        "Türen",
        vehicle.doors
      ]);

    container.innerHTML = `
      <div class="vehicle-header">
        <div>
          <small>GEFUNDENES FAHRZEUG</small>
          <h3>${escapeHtml(name)}</h3>
          <p>
            ${
              vehicle.display
                ? escapeHtml(vehicle.display)
                : "Fahrzeugdaten erfolgreich abgerufen"
            }
          </p>
        </div>

        <div class="vehicle-check">✓</div>
      </div>

      ${
        specs.length
          ? `
            <div class="vehicle-specs">
              ${specs
                .map(
                  ([label, val]) => `
                    <div>
                      <strong>${escapeHtml(String(val))}</strong>
                      <small>${escapeHtml(label)}</small>
                    </div>
                  `
                )
                .join("")}
            </div>
          `
          : `
            <div class="result">
              <strong>Fahrzeug gefunden</strong>
              <p>
                Die API liefert für dieses Fahrzeug derzeit
                keine weiteren technischen Spezifikationen.
              </p>
            </div>
          `
      }
    `;

    container.classList.remove("hidden");
  }

  /* =======================================================
     ESCAPE HTML
  ======================================================= */

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  /* =======================================================
     AKTUELLES AUTO – FAHRZEUGSUCHE
  ======================================================= */

  async function searchCurrentVehicle() {

    const hsn = value("currentHsn");
    const tsn = value("currentTsn");
    const brand = value("currentBrand");
    const model = value("currentModel");

    setApiStatus(
      "currentApiStatus",
      "Fahrzeug wird gesucht …",
      "loading"
    );

    try {

      const data = await searchVehicle({
        hsn,
        tsn,
        brand,
        model
      });

      const vehicle = normalizeVehicle(data);

      state.currentVehicle = vehicle;

      renderVehicle(
        vehicle,
        "currentVehicleData"
      );

      setApiStatus(
        "currentApiStatus",
        "Fahrzeug erfolgreich gefunden.",
        "success"
      );

    } catch (error) {

      setApiStatus(
        "currentApiStatus",
        error.message,
        "error"
      );

    }
  }

  /* =======================================================
     NEUES AUTO – FAHRZEUGSUCHE
  ======================================================= */

  async function searchComparisonVehicle() {

    const hsn = value("newHsn");
    const tsn = value("newTsn");
    const brand = value("newBrand");
    const model = value("newModel");

    setApiStatus(
      "newApiStatus",
      "Fahrzeug wird gesucht …",
      "loading"
    );

    try {

      const data = await searchVehicle({
        hsn,
        tsn,
        brand,
        model
      });

      const vehicle = normalizeVehicle(data);

      state.comparisonVehicle = vehicle;

      renderVehicle(
        vehicle,
        "newVehicleData"
      );

      setApiStatus(
        "newApiStatus",
        "Fahrzeug erfolgreich gefunden.",
        "success"
      );

    } catch (error) {

      setApiStatus(
        "newApiStatus",
        error.message,
        "error"
      );

    }
  }

  /* =======================================================
     FAHRPROFIL
  ======================================================= */

  function getDrivingProfile() {

    const kmYear =
      numberValue("annualKm") ||
      numberValue("currentAnnualKm");

    const fuelPrice =
      numberValue("fuelPrice");

    const consumption =
      numberValue("consumption");

    return {
      annualKm: kmYear,
      fuelPrice,
      consumption,
      highway:
        numberValue("highwayPercent"),

      country:
        value("country")
    };
  }

  /* =======================================================
     JÄHRLICHE KRAFTSTOFFKOSTEN
  ======================================================= */

  function calculateFuelCost(
    annualKm,
    consumption,
    fuelPrice
  ) {

    if (
      annualKm <= 0 ||
      consumption <= 0 ||
      fuelPrice <= 0
    ) {
      return 0;
    }

    return (
      annualKm *
      consumption /
      100 *
      fuelPrice
    );
  }

  /* =======================================================
     AKTUELLE AUTO DATEN
  ======================================================= */

  function getCurrentCarData() {

    return {

      purchasePrice:
        numberValue("purchasePrice"),

      purchaseKm:
        numberValue("purchaseKm"),

      purchaseDate:
        value("purchaseDate"),

      currentKm:
        numberValue("currentKm"),

      annualKm:
        numberValue("annualKm") ||
        numberValue("currentAnnualKm"),

      consumption:
        numberValue("consumption"),

      insuranceMonthly:
        numberValue("insuranceMonthly"),

      taxYearly:
        numberValue("taxYearly"),

      repairCosts:
        numberValue("repairCosts"),

      currentValue:
        numberValue("currentValue"),

      fuelPrice:
        numberValue("fuelPrice"),

      name:
        getVehicleName(state.currentVehicle)
    };
  }

  /* =======================================================
     NEUES AUTO DATEN
  ======================================================= */

  function getNewCarData() {

    return {

      purchasePrice:
        numberValue("newPurchasePrice"),

      purchaseKm:
        numberValue("newPurchaseKm"),

      firstRegistration:
        value("newFirstRegistration"),

      annualKm:
        numberValue("newAnnualKm"),

      consumption:
        numberValue("newConsumption"),

      insuranceMonthly:
        numberValue("newInsuranceMonthly"),

      taxYearly:
        numberValue("newTaxYearly"),

      currentValue:
        numberValue("newCurrentValue"),

      fuelPrice:
        numberValue("newFuelPrice"),

      name:
        getVehicleName(
          state.comparisonVehicle
        )
    };
  }

  function getVehicleName(vehicle) {

    if (!vehicle) return "Fahrzeug";

    return [
      vehicle.brand,
      vehicle.model
    ]
      .filter(Boolean)
      .join(" ") || "Fahrzeug";
  }

  /* =======================================================
     FINANZIELLE HALTEKOSTEN
  ======================================================= */

  function annualFixedCosts(car) {

    return (
      car.insuranceMonthly * 12 +
      car.taxYearly
    );
  }

  function annualOperatingCosts(car) {

    return (
      calculateFuelCost(
        car.annualKm,
        car.consumption,
        car.fuelPrice
      ) +
      annualFixedCosts(car)
    );
  }

  /* =======================================================
     OPTIMALE HALTEDAUER
     
     Wichtig:
     Es wird NICHT nur auf Reparaturkosten geschaut.
     Auch ohne Reparaturkosten wird eine wirtschaftliche
     Haltedauer anhand von Wertverlust und laufenden Kosten
     geschätzt.
  ======================================================= */

  function calculateRecommendedHoldingPeriod(car) {

    const annualKm =
      car.annualKm > 0
        ? car.annualKm
        : 15000;

    const currentKm =
      car.currentKm > 0
        ? car.currentKm
        : car.purchaseKm;

    const purchasePrice =
      car.purchasePrice > 0
        ? car.purchasePrice
        : 0;

    const currentValue =
      car.currentValue > 0
        ? car.currentValue
        : Math.max(
            purchasePrice * 0.35,
            1000
          );

    const repairCosts =
      Math.max(0, car.repairCosts || 0);

    /*
      Bei einem älteren günstigen Auto ist ein gewisser
      Reparaturpuffer wirtschaftlich sinnvoll.

      Es gibt bewusst keine harte Grenze wie
      "Reparatur > 50 % des Kaufpreises = verkaufen".
      Der ursprüngliche Kaufpreis ist bereits versunken.
    */

    const annualRunning =
      annualOperatingCosts(car);

    /*
      Geschätzter Wertverlust pro Jahr.
      Bei günstigen älteren Autos fällt er geringer aus.
    */

    const depreciationRate =
      currentValue <= 4000
        ? 0.10
        : currentValue <= 8000
          ? 0.12
          : 0.15;

    let estimatedValue = currentValue;

    let recommendedYears = 5;

    for (let year = 1; year <= 10; year++) {

      const mileage =
        currentKm +
        annualKm * year;

      /*
        Wertverlust
      */

      estimatedValue *=
        1 - depreciationRate;

      /*
        Zusätzlicher Kilometerabschlag
        bei sehr hoher Laufleistung.
      */

      let mileagePenalty = 0;

      if (mileage > 200000) {
        mileagePenalty +=
          (mileage - 200000) *
          0.015;
      }

      if (mileage > 250000) {
        mileagePenalty +=
          (mileage - 250000) *
          0.025;
      }

      const estimatedFutureValue =
        Math.max(
          500,
          estimatedValue -
          mileagePenalty
        );

      /*
        Reparaturkosten werden nur dann
        berücksichtigt, wenn der Benutzer
        tatsächlich welche eingegeben hat.
      */

      const repairPenalty =
        repairCosts > 0
          ? repairCosts / year
          : 0;

      const effectiveAnnualCost =
        annualRunning +
        repairPenalty;

      /*
        Ab einem sehr hohen Kilometerstand
        steigt das Risiko stärker.
      */

      const risk =
        mileage >= 250000
          ? 1.25
          : mileage >= 220000
            ? 1.10
            : 1;

      const score =
        effectiveAnnualCost *
        risk;

      /*
        Solange der wirtschaftliche Betrieb
        noch vernünftig ist, wird weitergefahren.
      */

      if (
        score <
        Math.max(
          3500,
          currentValue * 0.55
        )
      ) {
        recommendedYears = year;
      } else {
        break;
      }

      /*
        Bei extrem hohen Laufleistungen
        nicht künstlich weiterrechnen.
      */

      if (mileage >= 280000) {
        recommendedYears = year;
        break;
      }
    }

    const recommendedKm =
      currentKm +
      annualKm * recommendedYears;

    return {
      years: recommendedYears,
      km: recommendedKm,
      currentKm,
      annualKm,
      annualRunning
    };
  }

  /* =======================================================
     REPARATURPRÜFUNG
  ======================================================= */

  function evaluateRepair(car) {

    const repair =
      Number(car.repairCosts || 0);

    if (!repair || repair <= 0) {

      return {
        status: "neutral",
        title: "Keine Reparaturkosten angegeben",
        text:
          "Du kannst das Fahrzeug auch ohne konkrete Reparaturkosten wirtschaftlich bewerten."
      };
    }

    const value =
      car.currentValue > 0
        ? car.currentValue
        : Math.max(
            car.purchasePrice * 0.35,
            1000
          );

    const ratio =
      repair / value;

    if (ratio <= 0.25) {

      return {
        status: "green",
        title: "Reparatur spricht eher für das Behalten",
        text:
          `Die Reparatur von ${euro(repair)} entspricht nur etwa ${decimal(ratio * 100, 0)} % des aktuellen Fahrzeugwerts.`
      };

    }

    if (ratio <= 0.50) {

      return {
        status: "amber",
        title: "Reparatur ist wirtschaftlich abwägbar",
        text:
          `Die Reparatur von ${euro(repair)} entspricht etwa ${decimal(ratio * 100, 0)} % des aktuellen Fahrzeugwerts.`
      };

    }

    return {
      status: "red",
      title: "Verkauf sollte geprüft werden",
      text:
        `Die Reparatur von ${euro(repair)} ist im Verhältnis zum aktuellen Fahrzeugwert relativ hoch.`
    };
  }

  /* =======================================================
     AKTUELLES AUTO BERECHNEN
  ======================================================= */

  function calculateCurrentCar() {

    const car = getCurrentCarData();

    if (
      !car.purchasePrice ||
      !car.currentKm ||
      !car.annualKm ||
      !car.consumption
    ) {

      alert(
        "Bitte fülle mindestens Kaufpreis, aktuellen Kilometerstand, jährliche Fahrleistung und Verbrauch aus."
      );

      return;
    }

    const holding =
      calculateRecommendedHoldingPeriod(car);

    const repair =
      evaluateRepair(car);

    const fuel =
      calculateFuelCost(
        car.annualKm,
        car.consumption,
        car.fuelPrice
      );

    renderCurrentResult(
      car,
      holding,
      repair,
      fuel
    );
  }

  /* =======================================================
     AKTUELLES ERGEBNIS
  ======================================================= */

  function renderCurrentResult(
    car,
    holding,
    repair,
    fuel
  ) {

    const result =
      document.getElementById(
        "currentResult"
      );

    if (!result) return;

    result.className =
      `result ${repair.status || ""}`;

    result.innerHTML = `
      <strong>
        ${
          holding.years <= 2
            ? "Ein Wechsel kann bereits sinnvoll sein"
            : `Voraussichtlich noch etwa ${holding.years} Jahre fahren`
        }
      </strong>

      <p>
        Wirtschaftlich sinnvoller Zielbereich:
        ungefähr
        <strong>
          ${integer(holding.km)} km
        </strong>.
      </p>

      <div class="metrics">

        <div>
          <b>${years(holding.years)}</b>
          <small>empfohlene Resthaltedauer</small>
        </div>

        <div>
          <b>${integer(holding.km)} km</b>
          <small>empfohlener Kilometerstand</small>
        </div>

        <div>
          <b>${euro(fuel)}</b>
          <small>Kraftstoffkosten / Jahr</small>
        </div>

      </div>

      <div class="section-divider"></div>

      <strong>
        ${escapeHtml(repair.title)}
      </strong>

      <p>
        ${escapeHtml(repair.text)}
      </p>
    `;

    result.classList.remove("hidden");
  }

  /* =======================================================
     NEUES AUTO BERECHNEN
  ======================================================= */

  function calculateNewCar() {

    const oldCar =
      getCurrentCarData();

    const newCar =
      getNewCarData();

    if (
      !newCar.purchasePrice ||
      !newCar.purchaseKm ||
      !newCar.annualKm ||
      !newCar.consumption
    ) {

      alert(
        "Bitte fülle beim neuen Auto mindestens Kaufpreis, Kilometerstand, jährliche Fahrleistung und Verbrauch aus."
      );

      return;
    }

    /*
      Wenn beim aktuellen Auto noch keine Daten
      vorhanden sind, wird trotzdem ein Vergleich
      des neuen Autos angezeigt.
    */

    const oldAnnual =
      annualOperatingCosts(oldCar);

    const newAnnual =
      annualOperatingCosts(newCar);

    const annualSaving =
      oldAnnual - newAnnual;

    const additionalPurchaseCost =
      Math.max(
        0,
        newCar.purchasePrice -
        (oldCar.currentValue || 0)
      );

    const breakEven =
      annualSaving > 0
        ? additionalPurchaseCost /
          annualSaving
        : Infinity;

    renderNewCarResult(
      oldCar,
      newCar,
      annualSaving,
      additionalPurchaseCost,
      breakEven
    );
  }

  /* =======================================================
     NEUES AUTO ERGEBNIS
  ======================================================= */

  function renderNewCarResult(
    oldCar,
    newCar,
    annualSaving,
    additionalPurchaseCost,
    breakEven
  ) {

    const result =
      document.getElementById(
        "newResult"
      );

    if (!result) return;

    let status = "amber";
    let title =
      "Der Mehrwert sollte genau geprüft werden.";

    if (
      annualSaving > 0 &&
      breakEven <= 5
    ) {

      status = "green";

      title =
        "Das neue Auto kann sich wirtschaftlich lohnen.";

    } else if (
      annualSaving <= 0
    ) {

      status = "red";

      title =
        "Finanziell bringt das neue Auto voraussichtlich keinen Vorteil.";

    }

    result.className =
      `result ${status}`;

    result.innerHTML = `

      <strong>${title}</strong>

      <p>
        ${
          annualSaving > 0
            ? `Geschätzte jährliche Ersparnis:
               <strong>${euro(annualSaving)}</strong>.`
            : `Geschätzte Mehrkosten pro Jahr:
               <strong>${euro(Math.abs(annualSaving))}</strong>.`
        }
      </p>

      <div class="metrics">

        <div>
          <b>
            ${
              Number.isFinite(breakEven)
                ? years(breakEven)
                : "–"
            }
          </b>
          <small>Amortisationszeit</small>
        </div>

        <div>
          <b>${euro(additionalPurchaseCost)}</b>
          <small>zusätzlicher Kapitaleinsatz</small>
        </div>

        <div>
          <b>${euro(Math.abs(annualSaving))}</b>
          <small>jährlicher Kostenunterschied</small>
        </div>

      </div>
    `;

    result.classList.remove("hidden");
  }

  /* =======================================================
     AUTOS SPEICHERN
  ======================================================= */

  function saveCurrentCar() {

    const car =
      getCurrentCarData();

    if (
      !car.purchasePrice &&
      !car.currentKm &&
      !state.currentVehicle
    ) {

      alert(
        "Bitte gib zuerst ein Fahrzeug ein."
      );

      return;
    }

    const saved = {

      id:
        Date.now().toString(),

      created:
        new Date().toISOString(),

      vehicle:
        state.currentVehicle,

      data:
        car
    };

    state.savedCars.unshift(saved);

    saveCars();

    updateSavedCars();

    alert(
      "Fahrzeug wurde gespeichert."
    );
  }

  function deleteSavedCar(id) {

    state.savedCars =
      state.savedCars.filter(
        car => car.id !== id
      );

    saveCars();

    updateSavedCars();
  }

  function loadSavedCar(id) {

    const saved =
      state.savedCars.find(
        car => car.id === id
      );

    if (!saved) return;

    const car = saved.data;

    setValue(
      "purchasePrice",
      car.purchasePrice || ""
    );

    setValue(
      "purchaseKm",
      car.purchaseKm || ""
    );

    setValue(
      "purchaseDate",
      car.purchaseDate || ""
    );

    setValue(
      "currentKm",
      car.currentKm || ""
    );

    setValue(
      "annualKm",
      car.annualKm || ""
    );

    setValue(
      "consumption",
      car.consumption || ""
    );

    setValue(
      "insuranceMonthly",
      car.insuranceMonthly || ""
    );

    setValue(
      "taxYearly",
      car.taxYearly || ""
    );

    setValue(
      "repairCosts",
      car.repairCosts || ""
    );

    setValue(
      "currentValue",
      car.currentValue || ""
    );

    setValue(
      "fuelPrice",
      car.fuelPrice || ""
    );

    state.currentVehicle =
      saved.vehicle || null;

    if (state.currentVehicle) {

      renderVehicle(
        state.currentVehicle,
        "currentVehicleData"
      );
    }
  }

  function updateSavedCars() {

    const container =
      document.getElementById(
        "savedCars"
      );

    if (!container) return;

    if (!state.savedCars.length) {

      container.innerHTML = `
        <div class="saved">
          <div>
            <strong>Noch keine gespeicherten Fahrzeuge</strong>
            <small>
              Gespeicherte Fahrzeuge erscheinen hier.
            </small>
          </div>
        </div>
      `;

      return;
    }

    container.innerHTML =
      state.savedCars
        .map(saved => {

          const name =
            getVehicleName(
              saved.vehicle
            ) !== "Fahrzeug"
              ? getVehicleName(saved.vehicle)
              : saved.data.name || "Fahrzeug";

          return `
            <div class="saved">

              <div>
                <strong>
                  ${escapeHtml(name)}
                </strong>

                <small>
                  ${
                    saved.data.currentKm
                      ? integer(saved.data.currentKm) + " km"
                      : "Kilometerstand nicht angegeben"
                  }
                </small>
              </div>

              <div class="actions">

                <button
                  class="btn white"
                  data-load-car="${escapeHtml(saved.id)}"
                  type="button"
                >
                  Laden
                </button>

                <button
                  class="btn white danger"
                  data-delete-car="${escapeHtml(saved.id)}"
                  type="button"
                >
                  Löschen
                </button>

              </div>

            </div>
          `;
        })
        .join("");

    $$("[data-load-car]").forEach(button => {

      button.addEventListener(
        "click",
        () =>
          loadSavedCar(
            button.dataset.loadCar
          )
      );
    });

    $$("[data-delete-car]").forEach(button => {

      button.addEventListener(
        "click",
        () =>
          deleteSavedCar(
            button.dataset.deleteCar
          )
      );
    });
  }

  /* =======================================================
     MARKEN / MODELLE
     
     Diese Funktion funktioniert auch dann,
     wenn die API eine Liste von Marken oder Modellen
     zurückliefert.
  ======================================================= */

  function fillSelect(
    select,
    items,
    placeholder = "Bitte auswählen"
  ) {

    if (!select) return;

    select.innerHTML = `
      <option value="">
        ${escapeHtml(placeholder)}
      </option>
    `;

    if (!Array.isArray(items)) return;

    items.forEach(item => {

      const option =
        document.createElement("option");

      if (
        typeof item === "string"
      ) {

        option.value = item;
        option.textContent = item;

      } else {

        option.value =
          item.value ||
          item.id ||
          item.name ||
          "";

        option.textContent =
          item.label ||
          item.name ||
          item.model ||
          item.value ||
          "";
      }

      if (option.value) {
        select.appendChild(option);
      }
    });
  }

  /* =======================================================
     MODELL AUS MARKENWAHL
     
     Falls deine API hierfür einen separaten
     Endpoint besitzt, kann die Funktion später
     direkt darauf zugreifen.
  ======================================================= */

  async function loadModelsForBrand(
    brand,
    prefix
  ) {

    if (!brand) return;

    const modelSelect =
      document.getElementById(
        `${prefix}Model`
      );

    if (!modelSelect) return;

    modelSelect.disabled = true;

    modelSelect.innerHTML =
      `<option value="">Modelle werden geladen …</option>`;

    try {

      const data =
        await searchVehicle({
          brand
        });

      const models =
        data?.models ||
        data?.data?.models ||
        [];

      if (Array.isArray(models) && models.length) {

        fillSelect(
          modelSelect,
          models,
          "Modell auswählen"
        );

      } else {

        modelSelect.innerHTML =
          `<option value="">
            Modell manuell eingeben
          </option>`;
      }

    } catch {

      modelSelect.innerHTML =
        `<option value="">
          Modell manuell eingeben
        </option>`;

    } finally {

      modelSelect.disabled = false;
    }
  }

  /* =======================================================
     EVENTS
  ======================================================= */

  function bindClick(
    ids,
    handler
  ) {

    ids.forEach(id => {

      const el =
        document.getElementById(id);

      if (!el) return;

      el.addEventListener(
        "click",
        event => {
          event.preventDefault();
          handler();
        }
      );
    });
  }

  function initEvents() {

    bindClick(
      ["themeToggle"],
      toggleTheme
    );

    bindClick(
      ["resetButton", "resetInputs"],
      resetInputs
    );

    bindClick(
      [
        "searchCurrentVehicle",
        "currentVehicleSearch"
      ],
      searchCurrentVehicle
    );

    bindClick(
      [
        "searchNewVehicle",
        "newVehicleSearch"
      ],
      searchComparisonVehicle
    );

    bindClick(
      [
        "calculateCurrent",
        "calculateButton"
      ],
      calculateCurrentCar
    );

    bindClick(
      [
        "calculateNew",
        "calculateNewButton",
        "newCalculate"
      ],
      calculateNewCar
    );

    bindClick(
      [
        "saveCurrent",
        "saveCarButton",
        "saveVehicle"
      ],
      saveCurrentCar
    );

    /*
      Markenänderung
    */

    const currentBrand =
      document.getElementById(
        "currentBrand"
      );

    if (currentBrand) {

      currentBrand.addEventListener(
        "change",
        () =>
          loadModelsForBrand(
            currentBrand.value,
            "current"
          )
      );
    }

    const newBrand =
      document.getElementById(
        "newBrand"
      );

    if (newBrand) {

      newBrand.addEventListener(
        "change",
        () =>
          loadModelsForBrand(
            newBrand.value,
            "new"
          )
      );
    }
  }

  /* =======================================================
     INITIALISIERUNG
  ======================================================= */

  function init() {

    initTheme();

    initTabs();

    initEvents();

    updateSavedCars();

    /*
      KEINE Beispielwerte!
      Alle Eingabefelder bleiben bewusst leer.
    */
  }

  if (
    document.readyState === "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      init
    );

  } else {

    init();
  }

})();