(() => {

  "use strict";


  /* =========================================================
     HILFSFUNKTIONEN
  ========================================================= */

  const $ = id => document.getElementById(id);

  const num = id =>
    Number($(id)?.value) || 0;


  const euro = value =>
    new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0
    }).format(Number(value) || 0);


  const escapeHTML = value =>
    String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[char]));


  /* =========================================================
     TABS
  ========================================================= */

  function showTab(id) {

    document
      .querySelectorAll(".page")
      .forEach(page => {
        page.classList.toggle(
          "hidden",
          page.id !== id
        );
      });


    document
      .querySelectorAll(".tab")
      .forEach(tab => {
        tab.classList.toggle(
          "active",
          tab.dataset.tab === id
        );
      });

  }


  document
    .querySelectorAll(".tab")
    .forEach(tab => {

      tab.addEventListener(
        "click",
        () => showTab(tab.dataset.tab)
      );

    });


  /* =========================================================
     API
  ========================================================= */

  async function api(action, parameters = {}) {

    const params =
      new URLSearchParams({
        action,
        ...parameters
      });


    const response =
      await fetch(
        `/api/vehicle-search?${params.toString()}`
      );


    const data =
      await response.json();


    if (!response.ok || data.error) {

      throw new Error(
        data.error ||
        "Die Fahrzeugdaten konnten nicht geladen werden."
      );

    }


    return data.data;

  }


  /* =========================================================
     FAHRZEUGDATEN NORMALISIEREN
  ========================================================= */

  function findValue(object, keys) {

    if (!object || typeof object !== "object") {
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


  function findDeep(object, keys, depth = 0) {

    if (
      object === null ||
      object === undefined ||
      depth > 5
    ) {
      return null;
    }


    if (
      typeof object !== "object"
    ) {
      return null;
    }


    const direct =
      findValue(object, keys);


    if (direct !== null) {
      return direct;
    }


    for (const value of Object.values(object)) {

      if (
        value &&
        typeof value === "object"
      ) {

        const result =
          findDeep(
            value,
            keys,
            depth + 1
          );


        if (result !== null) {
          return result;
        }

      }

    }


    return null;

  }


  function normalizeVehicle(raw) {

    /*
     * CarAPI kann je nach Endpoint bzw.
     * Datensatz unterschiedliche Feldstrukturen
     * zurückgeben.
     *
     * Deshalb suchen wir mehrere mögliche
     * Feldnamen.
     */

    const data =
      Array.isArray(raw)
        ? raw[0] || {}
        : raw || {};


    const brand =
      findDeep(
        data,
        [
          "brand",
          "make",
          "manufacturer",
          "marke"
        ]
      );


    const model =
      findDeep(
        data,
        [
          "model",
          "modell"
        ]
      );


    const generation =
      findDeep(
        data,
        [
          "generation",
          "baureihe"
        ]
      );


    const type =
      findDeep(
        data,
        [
          "type",
          "typ",
          "variant"
        ]
      );


    const power =
      findDeep(
        data,
        [
          "power_ps",
          "powerPs",
          "ps",
          "horsepower",
          "leistung"
        ]
      );


    const displacement =
      findDeep(
        data,
        [
          "displacement_cc",
          "displacementCc",
          "displacement",
          "hubraum"
        ]
      );


    const fuel =
      findDeep(
        data,
        [
          "fuel",
          "fuel_type",
          "fuelType",
          "kraftstoff"
        ]
      );


    const year =
      findDeep(
        data,
        [
          "year",
          "model_year",
          "modelYear",
          "baujahr"
        ]
      );


    const hsn =
      findDeep(
        data,
        [
          "hsn"
        ]
      );


    const tsn =
      findDeep(
        data,
        [
          "tsn"
        ]
      );


    return {

      raw: data,

      brand,
      model,
      generation,
      type,

      powerPs:
        Number(power) || null,

      displacementCc:
        Number(displacement) || null,

      fuel,
      year,

      hsn,
      tsn

    };

  }


  /* =========================================================
     FAHRZEUGDATEN ANZEIGEN
  ========================================================= */

  function displayVehicle(vehicle) {

    const nameParts = [
      vehicle.brand,
      vehicle.model,
      vehicle.generation
    ].filter(Boolean);


    const name =
      nameParts.join(" ") ||
      "Fahrzeug erkannt";


    const subtitleParts = [
      vehicle.type,
      vehicle.hsn && vehicle.tsn
        ? `HSN ${vehicle.hsn} / TSN ${vehicle.tsn}`
        : null
    ].filter(Boolean);


    $("vehicleName").textContent =
      name;


    $("vehicleSubtitle").textContent =
      subtitleParts.join(" · ") ||
      "Fahrzeugdaten aus CarAPI";


    $("vehiclePower").textContent =
      vehicle.powerPs || "–";


    $("vehicleEngine").textContent =
      vehicle.displacementCc
        ? `${vehicle.displacementCc.toLocaleString("de-DE")} cm³`
        : "–";


    $("vehicleFuel").textContent =
      vehicle.fuel || "–";


    $("vehicleYear").textContent =
      vehicle.year || "–";


    $("vehicleData")
      .classList
      .remove("hidden");


    /*
     * Modellfeld automatisch befüllen
     */

    $("model").value =
      name;


    /*
     * Wenn die API PS liefert,
     * kann das später auch für
     * den Fahrzeugvergleich verwendet
     * werden.
     */

    window.currentVehicle =
      vehicle;

  }


  function showStatus(message, type = "info") {

    const element =
      $("vehicleStatus");


    element.textContent =
      message;


    element.className =
      `api-status ${type}`;

  }


  /* =========================================================
     HSN / TSN SUCHE
  ========================================================= */

  async function searchHSNTSN() {

    const hsn =
      $("hsn").value.trim().toUpperCase();


    const tsn =
      $("tsn").value.trim().toUpperCase();


    if (!hsn || !tsn) {

      showStatus(
        "Bitte HSN und TSN eingeben.",
        "error"
      );

      return;

    }


    const button =
      $("searchHsn");


    button.disabled = true;

    button.textContent =
      "Suche läuft …";


    showStatus(
      "Fahrzeug wird gesucht …",
      "loading"
    );


    try {

      const raw =
        await api(
          "vehicle",
          {
            hsn,
            tsn
          }
        );


      const vehicle =
        normalizeVehicle(raw);


      displayVehicle(vehicle);


      showStatus(
        "✓ Fahrzeug erfolgreich gefunden.",
        "success"
      );


    } catch (error) {

      console.error(error);


      showStatus(
        error.message,
        "error"
      );

    } finally {

      button.disabled = false;

      button.textContent =
        "Fahrzeug suchen";

    }

  }


  $("searchHsn")
    .addEventListener(
      "click",
      searchHSNTSN
    );


  /* =========================================================
     MODELLSUCHE
  ========================================================= */

  let brandsLoaded = false;


  async function loadBrands() {

    if (brandsLoaded) {
      return;
    }


    const select =
      $("brandSelect");


    try {

      showStatus(
        "Hersteller werden geladen …",
        "loading"
      );


      const raw =
        await api(
          "brands"
        );


      const brands =
        Array.isArray(raw)
          ? raw
          : (
              raw?.data ||
              raw?.brands ||
              raw?.results ||
              []
            );


      brands
        .map(item => {

          if (
            typeof item === "string"
          ) {
            return {
              value: item,
              label: item
            };
          }


          return {
            value:
              item.slug ||
              item.name ||
              item.brand ||
              item.id,

            label:
              item.name ||
              item.brand ||
              item.title ||
              item.slug
          };

        })
        .filter(item => item.value)
        .sort((a,b) =>
          String(a.label)
            .localeCompare(
              String(b.label),
              "de"
            )
        )
        .forEach(brand => {

          const option =
            document.createElement(
              "option"
            );


          option.value =
            brand.value;


          option.textContent =
            brand.label;


          select.appendChild(
            option
          );

        });


      brandsLoaded = true;


      showStatus(
        "Hersteller geladen.",
        "success"
      );


    } catch (error) {

      console.error(error);


      showStatus(
        "Hersteller konnten nicht geladen werden.",
        "error"
      );

    }

  }


  async function loadModels() {

    const brand =
      $("brandSelect").value;


    const modelSelect =
      $("modelSelect");


    modelSelect.innerHTML =
      `<option value="">
        Modell auswählen
      </option>`;


    modelSelect.disabled =
      true;


    $("searchModel").disabled =
      true;


    if (!brand) {
      return;
    }


    try {

      showStatus(
        "Modelle werden geladen …",
        "loading"
      );


      const raw =
        await api(
          "models",
          { brand }
        );


      const models =
        Array.isArray(raw)
          ? raw
          : (
              raw?.data ||
              raw?.models ||
              raw?.results ||
              []
            );


      models
        .map(item => {

          if (
            typeof item === "string"
          ) {
            return {
              value: item,
              label: item
            };
          }


          return {
            value:
              item.slug ||
              item.name ||
              item.model ||
              item.id,

            label:
              item.name ||
              item.model ||
              item.title ||
              item.slug
          };

        })
        .filter(item => item.value)
        .sort((a,b) =>
          String(a.label)
            .localeCompare(
              String(b.label),
              "de"
            )
        )
        .forEach(model => {

          const option =
            document.createElement(
              "option"
            );


          option.value =
            model.value;


          option.textContent =
            model.label;


          modelSelect.appendChild(
            option
          );

        });


      modelSelect.disabled =
        false;


      showStatus(
        "Modelle geladen.",
        "success"
      );


    } catch (error) {

      console.error(error);


      showStatus(
        "Modelle konnten nicht geladen werden.",
        "error"
      );

    }

  }


  async function searchModel() {

    const brand =
      $("brandSelect").value;


    const model =
      $("modelSelect").value;


    if (!brand || !model) {
      return;
    }


    try {

      showStatus(
        "Fahrzeugdaten werden geladen …",
        "loading"
      );


      /*
       * Wir holen zunächst Generationen.
       */

      const raw =
        await api(
          "generations",
          {
            brand,
            model
          }
        );


      const generations =
        Array.isArray(raw)
          ? raw
          : (
              raw?.data ||
              raw?.generations ||
              raw?.results ||
              []
            );


      const firstGeneration =
        generations[0];


      const generation =
        typeof firstGeneration === "string"
          ? firstGeneration
          : (
              firstGeneration?.name ||
              firstGeneration?.generation ||
              firstGeneration?.slug ||
              ""
            );


      /*
       * Falls Generationen vorhanden sind,
       * versuchen wir zusätzlich die
       * Motorinformationen zu laden.
       */

      let engineData = null;


      if (generation) {

        try {

          engineData =
            await api(
              "engines",
              {
                brand,
                model,
                generation
              }
            );

        } catch {

          /*
           * Motorinformationen sind optional.
           */

        }

      }


      const vehicle =
        normalizeVehicle({

          brand,
          model,
          generation,

          engines:
            engineData

        });


      displayVehicle(vehicle);


      showStatus(
        "✓ Fahrzeug erfolgreich ausgewählt.",
        "success"
      );


    } catch (error) {

      console.error(error);


      showStatus(
        error.message,
        "error"
      );

    }

  }


  $("brandSelect")
    .addEventListener(
      "change",
      loadModels
    );


  $("searchModel")
    .addEventListener(
      "click",
      searchModel
    );


  /* =========================================================
     SUCHMODUS
  ========================================================= */

  document
    .querySelectorAll(".search-tab")
    .forEach(tab => {

      tab.addEventListener(
        "click",
        async () => {

          const mode =
            tab.dataset.searchMode;


          document
            .querySelectorAll(
              ".search-tab"
            )
            .forEach(item =>
              item.classList.toggle(
                "active",
                item === tab
              )
            );


          $("hsnSearch")
            .classList.toggle(
              "hidden",
              mode !== "hsn"
            );


          $("modelSearch")
            .classList.toggle(
              "hidden",
              mode !== "model"
            );


          if (mode === "model") {
            await loadBrands();
          }

        }
      );

    });


  /* =========================================================
     BERECHNUNG
  ========================================================= */

  function getCurrentData() {

    return {

      model:
        $("model").value,

      hsn:
        $("hsn").value,

      tsn:
        $("tsn").value,

      buyPrice:
        num("buyPrice"),

      buyDate:
        $("buyDate").value,

      buyKm:
        num("buyKm"),

      currentKm:
        num("currentKm"),

      annualKm:
        num("annualKm"),

      consumption:
        num("consumption"),

      fuelPrice:
        num("fuelPrice"),

      insurance:
        num("insurance"),

      tax:
        num("tax"),

      repairs:
        num("repairs"),

      resale:
        num("resale"),

      highway:
        num("highway"),

      country:
        num("country"),

      city:
        num("city"),

      targetYears:
        num("targetYears"),

      replacementBudget:
        num("replacementBudget"),

      replacementTarget:
        num("replacementTarget"),

      reserve:
        num("reserve"),

      importanceFuel:
        num("importanceFuel"),

      importancePower:
        num("importancePower"),

      importanceSafety:
        num("importanceSafety"),

      importanceComfort:
        num("importanceComfort"),

      importanceRepair:
        num("importanceRepair"),

      importanceAge:
        num("importanceAge")

    };

  }


  function calculate() {

    const d =
      getCurrentData();


    if (
      d.highway +
      d.country +
      d.city !== 100
    ) {

      alert(
        "Dein Fahrprofil muss genau 100 % ergeben."
      );

      return;

    }


    if (
      d.currentKm <
      d.buyKm
    ) {

      alert(
        "Der aktuelle Kilometerstand darf nicht kleiner als der Kilometerstand beim Kauf sein."
      );

      return;

    }


    const fuelCost =
      d.annualKm *
      d.consumption /
      100 *
      d.fuelPrice;


    const annualFixed =
      d.insurance +
      d.tax;


    const annualCost =
      fuelCost +
      annualFixed;


    const km240 =
      Math.max(
        0,
        240000 -
        d.currentKm
      );


    const km270 =
      Math.max(
        0,
        270000 -
        d.currentKm
      );


    const km300 =
      Math.max(
        0,
        300000 -
        d.currentKm
      );


    const years240 =
      d.annualKm
        ? km240 / d.annualKm
        : 0;


    const years270 =
      d.annualKm
        ? km270 / d.annualKm
        : 0;


    const years300 =
      d.annualKm
        ? km300 / d.annualKm
        : 0;


    let title =
      "🟢 Weiterfahren";


    let className =
      "green";


    let explanation =
      "Ein sofortiger Fahrzeugwechsel ist bei deinen Angaben wirtschaftlich derzeit nicht zwingend sinnvoll.";


    if (
      d.currentKm >= 300000
    ) {

      title =
        "🟠 Wechsel vorbereiten";

      className =
        "amber";

      explanation =
        "Bei über 300.000 km solltest du größere Reparaturen besonders kritisch mit einem möglichen Ersatzwagen vergleichen.";

    }

    else if (
      d.currentKm >= 270000
    ) {

      title =
        "🟡 Wechsel beobachten";

      className =
        "amber";

      explanation =
        "Weiterfahren kann weiterhin sinnvoll sein. Gleichzeitig solltest du jetzt nach einem geeigneten Ersatzwagen Ausschau halten.";

    }

    else if (
      d.currentKm >= 240000
    ) {

      title =
        "🟢 Weiterfahren & beobachten";

      explanation =
        "Der Wagen kann weiterhin wirtschaftlich sein. Größere Reparaturen sollten ab jetzt aber genauer geprüft werden.";

    }


    $("result").className =
      `result ${className}`;


    $("result").innerHTML = `

      <strong>
        ${title}
      </strong>

      <p>
        ${explanation}
      </p>

      <div class="metrics">

        <div>
          <b>${euro(annualCost)}</b>
          <small>Basis-Kosten/Jahr</small>
        </div>

        <div>
          <b>${years240.toFixed(1)} J.</b>
          <small>bis 240.000 km</small>
        </div>

        <div>
          <b>${years300.toFixed(1)} J.</b>
          <small>bis 300.000 km</small>
        </div>

      </div>

      <p>
        Bei ${d.annualKm.toLocaleString("de-DE")}
        km/Jahr erreichst du 270.000 km
        voraussichtlich in
        ${years270.toFixed(1)} Jahren
        und 300.000 km in
        ${years300.toFixed(1)} Jahren.
      </p>

    `;


    $("heroDecision").textContent =
      title;


    $("heroText").textContent =
      `${d.currentKm.toLocaleString("de-DE")} km · ${euro(annualCost)} Basis-Kosten/Jahr`;


    const progress =
      Math.min(
        100,
        Math.max(
          0,
          (d.currentKm - 150000) /
          1500
        )
      );


    $("heroProgress")
      .style
      .width =
      `${progress}%`;

  }


  /* =========================================================
     REPARATUR
  ========================================================= */

  function repairCheck() {

    const d =
      getCurrentData();


    const cost =
      num("repairCost");


    const life =
      num("repairLife");


    if (!cost || !life) {

      alert(
        "Bitte Reparaturkosten und zusätzliche Nutzungsdauer eingeben."
      );

      return;

    }


    const ratio =
      d.resale
        ? cost / d.resale
        : 1;


    const annualRepairCost =
      cost / life;


    let title =
      "🟢 Reparieren";


    let className =
      "green";


    if (cost > 2500) {

      title =
        "🔴 Eher verkaufen";

      className =
        "red";

    }

    else if (cost > 1800) {

      title =
        "🟠 Verkauf prüfen";

      className =
        "amber";

    }

    else if (cost > 1200) {

      title =
        "🟡 Einzelfall prüfen";

      className =
        "amber";

    }


    $("repairResult").className =
      `result ${className}`;


    $("repairResult").innerHTML = `

      <strong>
        ${title}
      </strong>

      <p>
        Die Reparatur kostet
        ${euro(cost)}.
        Das entspricht
        ${Math.round(ratio * 100)} %
        deines aktuellen Fahrzeugwerts.
      </p>

      <p>
        Bei ${life} zusätzlichen Jahren
        kostet die Reparatur rechnerisch
        ${euro(annualRepairCost)}
        pro zusätzlichem Jahr.
      </p>

    `;


    $("mValue").textContent =
      euro(d.resale);


    $("mRepair").textContent =
      euro(cost);


    $("mRatio").textContent =
      `${Math.round(ratio * 100)} %`;

  }


  /* =========================================================
     VERGLEICH
  ========================================================= */

  function compareCars() {

    const d =
      getCurrentData();


    const price =
      num("newPrice");


    const consumption =
      num("newConsumption");


    const tax =
      num("newTax");


    const insurance =
      num("newInsurance");


    const futureValue =
      num("newFutureValue");


    const oldFuel =
      d.annualKm *
      d.consumption /
      100 *
      d.fuelPrice;


    const newFuel =
      d.annualKm *
      consumption /
      100 *
      d.fuelPrice;


    const oldFiveYear =
      (
        oldFuel +
        d.insurance +
        d.tax
      ) * 5
      +
      d.repairs
      -
      Math.max(
        0,
        d.resale - 500
      );


    const newFiveYear =
      (
        newFuel +
        insurance +
        tax
      ) * 5
      +
      price -
      futureValue;


    const difference =
      newFiveYear -
      oldFiveYear;


    $("old5").textContent =
      euro(oldFiveYear);


    $("new5").textContent =
      euro(newFiveYear);


    $("diff5").textContent =
      euro(
        Math.abs(difference)
      );


    const cheaper =
      difference < 0;


    $("compareText").className =
      `result ${
        cheaper
          ? "green"
          : "amber"
      }`;


    $("compareText").innerHTML = `

      <strong>
        ${
          cheaper
            ? "🟢 Neues Auto günstiger"
            : "🟡 Aktuelles Auto günstiger"
        }
      </strong>

      <p>
        Über fünf Jahre beträgt der modellierte
        Kostenunterschied
        ${euro(Math.abs(difference))}.
      </p>

    `;

  }


  /* =========================================================
     LOCAL STORAGE
  ========================================================= */

  function getSaved() {

    try {

      return JSON.parse(
        localStorage.getItem(
          "autolohnt"
        ) || "[]"
      );

    } catch {

      return [];

    }

  }


  function renderSaved() {

    const list =
      $("savedList");


    const cars =
      getSaved();


    list.innerHTML = "";


    if (!cars.length) {

      list.innerHTML = `

        <div class="result">

          <strong>
            Noch keine Autos gespeichert
          </strong>

          <p>
            Speichere dein aktuelles Auto
            oder einen möglichen Ersatzwagen.
          </p>

        </div>

      `;

      return;

    }


    cars.forEach(
      (car, index) => {

        const element =
          document.createElement(
            "div"
          );


        element.className =
          "saved";


        element.innerHTML = `

          <div>

            <strong>
              ${escapeHTML(car.name)}
            </strong>

            <small>
              ${(car.km || 0)
                .toLocaleString("de-DE")}
              km ·
              ${euro(car.price)}
            </small>

          </div>

          <div>

            <button
              class="btn white"
              type="button"
              data-load="${index}">
              Laden
            </button>

            <button
              class="btn white danger"
              type="button"
              data-delete="${index}">
              ×
            </button>

          </div>

        `;


        list.appendChild(
          element
        );

      }
    );


    list
      .querySelectorAll(
        "[data-delete]"
      )
      .forEach(button => {

        button.addEventListener(
          "click",
          () => {

            const cars =
              getSaved();


            cars.splice(
              Number(
                button.dataset.delete
              ),
              1
            );


            localStorage.setItem(
              "autolohnt",
              JSON.stringify(cars)
            );


            renderSaved();

          }
        );

      });


    list
      .querySelectorAll(
        "[data-load]"
      )
      .forEach(button => {

        button.addEventListener(
          "click",
          () => {

            const car =
              getSaved()[
                Number(
                  button.dataset.load
                )
              ];


            Object.entries(
              car.data
            ).forEach(
              ([key, value]) => {

                if ($(key)) {

                  $(key).value =
                    value;

                }

              }
            );


            showTab(
              "current"
            );


            calculate();

          }
        );

      });

  }


  function saveCurrentCar() {

    const d =
      getCurrentData();


    const cars =
      getSaved();


    cars.unshift({

      name:
        d.model ||
        "Mein Auto",

      price:
        d.buyPrice,

      km:
        d.currentKm,

      data:
        d

    });


    localStorage.setItem(
      "autolohnt",
      JSON.stringify(
        cars.slice(0, 20)
      )
    );


    renderSaved();


    alert(
      "Auto gespeichert."
    );

  }


  function saveNewCar() {

    const car = {

      name:
        $("newModel").value ||
        "Neues Auto",

      price:
        num("newPrice"),

      km:
        num("newKm"),

      data: {

        model:
          $("newModel").value,

        buyPrice:
          num("newPrice"),

        currentKm:
          num("newKm")

      }

    };


    const cars =
      getSaved();


    cars.unshift(car);


    localStorage.setItem(
      "autolohnt",
      JSON.stringify(
        cars.slice(0, 20)
      )
    );


    renderSaved();


    alert(
      "Auto gespeichert."
    );

  }


  /* =========================================================
     EVENT LISTENER
  ========================================================= */

  $("calculate")
    .addEventListener(
      "click",
      calculate
    );


  $("repairCheck")
    .addEventListener(
      "click",
      repairCheck
    );


  $("compare")
    .addEventListener(
      "click",
      compareCars
    );


  $("save")
    .addEventListener(
      "click",
      saveCurrentCar
    );


  $("saveNew")
    .addEventListener(
      "click",
      saveNewCar
    );


  $("heroCalc")
    .addEventListener(
      "click",
      () => {

        showTab(
          "current"
        );


        $("current")
          .scrollIntoView({
            behavior: "smooth"
          });

      }
    );


  $("theme")
    .addEventListener(
      "click",
      () => {

        const next =
          document.documentElement
            .dataset
            .theme === "dark"
              ? "light"
              : "dark";


        document.documentElement
          .dataset
          .theme =
          next;


        localStorage.setItem(
          "autolohnt-theme",
          next
        );

      }
    );


  $("reset")
    .addEventListener(
      "click",
      () => {

        if (
          confirm(
            "Alle aktuellen Eingaben zurücksetzen?"
          )
        ) {

          location.reload();

        }

      }
    );


  $("clearSaved")
    .addEventListener(
      "click",
      () => {

        if (
          confirm(
            "Alle gespeicherten Autos löschen?"
          )
        ) {

          localStorage.removeItem(
            "autolohnt"
          );


          renderSaved();

        }

      }
    );


  /* =========================================================
     START
  ========================================================= */

  document.documentElement
    .dataset
    .theme =
    localStorage.getItem(
      "autolohnt-theme"
    ) || "light";


  renderSaved();

})();