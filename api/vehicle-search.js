/* =========================================================
   AUTO COST CHECK
   api/vehicle-search.js

   DATENQUELLEN

   Marken + Modelle:
   NHTSA / vPIC
   -> kostenlos
   -> kein API4Cars-Kontingent

   HSN / TSN:
   API4Cars
   -> primäre deutsche Fahrzeugdatenquelle

   Optional:
   CarAPI.dev als Backup für Fahrzeuglisten
========================================================= */

const API4CARS_BASE =
  "https://api4cars.com/api/v1";

const NHTSA_BASE =
  "https://vpic.nhtsa.dot.gov/api/vehicles";

const CARAPI_BASE =
  "https://api.carapi.dev/v1";

const CACHE =
  new Map();

const CACHE_TTL =
  24 * 60 * 60 * 1000;

/* =========================================================
   RESPONSE
========================================================= */

function json(
  res,
  status,
  body
) {

  res
    .status(status)
    .setHeader(
      "Cache-Control",
      "no-store"
    )
    .json(body);
}

/* =========================================================
   CACHE
========================================================= */

function cacheKey(
  action,
  params
) {

  return (
    action +
    ":" +
    JSON.stringify(
      params
    )
  );
}

function getCache(key) {

  const item =
    CACHE.get(key);

  if (!item) {
    return null;
  }

  if (
    Date.now() -
      item.time >
    CACHE_TTL
  ) {

    CACHE.delete(key);

    return null;
  }

  return item.data;
}

function setCache(
  key,
  data
) {

  CACHE.set(
    key,
    {
      time: Date.now(),
      data
    }
  );
}

/* =========================================================
   HELPERS
========================================================= */

function clean(value) {

  return (
    value === undefined ||
    value === null
  )
    ? ""
    : String(value).trim();
}

function firstDefined(
  ...values
) {

  return values.find(
    value =>
      value !== undefined &&
      value !== null &&
      value !== ""
  );
}

function normalizeList(
  data,
  keys = []
) {

  if (Array.isArray(data)) {
    return data;
  }

  for (
    const key of keys
  ) {

    if (
      Array.isArray(
        data?.[key]
      )
    ) {

      return data[key];

    }
  }

  if (
    Array.isArray(
      data?.results
    )
  ) {

    return data.results;

  }

  if (
    Array.isArray(
      data?.Results
    )
  ) {

    return data.Results;

  }

  return [];
}

function normalizeVehicle(
  item
) {

  if (!item) {
    return null;
  }

  return {

    ...item,

    brand:
      firstDefined(
        item.brand,
        item.make,
        item.manufacturer,
        item.MakeName
      ),

    model:
      firstDefined(
        item.model,
        item.model_name,
        item.Model_Name
      ),

    generation:
      firstDefined(
        item.generation,
        item.generation_name,
        item.series
      ),

    engine:
      firstDefined(
        item.engine,
        item.engine_name,
        item.engine_type
      ),

    year:
      firstDefined(
        item.year,
        item.model_year,
        item.ModelYear,
        item.production_year
      ),

    power_ps:
      firstDefined(
        item.power_ps,
        item.ps,
        item.hp,
        item.horsepower
      ),

    displacement_l:
      firstDefined(
        item.displacement_l,
        item.engine_displacement_l,
        item.displacement
      ),

    fuel:
      firstDefined(
        item.fuel,
        item.fuel_type,
        item.fuelType
      ),

    transmission:
      firstDefined(
        item.transmission,
        item.gearbox
      ),

    hsn:
      firstDefined(
        item.hsn
      ),

    tsn:
      firstDefined(
        item.tsn
      )

  };
}

/* =========================================================
   FETCH
========================================================= */

async function fetchJson(
  url,
  options = {}
) {

  const response =
    await fetch(
      url,
      {
        ...options,

        headers: {
          Accept:
            "application/json",

          ...(options.headers || {})
        }
      }
    );

  let data = null;

  try {

    data =
      await response.json();

  } catch {

    const error =
      new Error(
        `Ungültige Antwort (${response.status})`
      );

    error.status =
      response.status;

    throw error;
  }

  if (!response.ok) {

    const error =
      new Error(
        data?.message ||
        data?.error ||
        `HTTP ${response.status}`
      );

    error.status =
      response.status;

    error.code =
      data?.code;

    throw error;
  }

  return data;
}

/* =========================================================
   API4CARS AUTH
========================================================= */

function api4carsHeaders() {

  const key =
    clean(
      process.env.API4CARS_API_KEY
    );

  const secret =
    clean(
      process.env.API4CARS_API_SECRET
    );

  if (!key || !secret) {

    throw new Error(
      "API4CARS_API_KEY oder API4CARS_API_SECRET fehlt in Vercel."
    );
  }

  return {

    "X-API-Key":
      key,

    "X-API-Secret":
      secret

  };
}

/* =========================================================
   API4CARS
========================================================= */

async function api4carsVehicle(
  hsn,
  tsn
) {

  const url =
    new URL(
      `${API4CARS_BASE}/vehicle`
    );

  url.searchParams.set(
    "hsn",
    hsn
  );

  url.searchParams.set(
    "tsn",
    tsn
  );

  const data =
    await fetchJson(
      url,
      {
        headers:
          api4carsHeaders()
      }
    );

  return (
    data?.data ??
    data
  );
}

/* =========================================================
   NHTSA – MARKEN
========================================================= */

async function nhtsaBrands() {

  const data =
    await fetchJson(
      `${NHTSA_BASE}/GetAllMakes?format=json`
    );

  return normalizeList(
    data,
    [
      "Results",
      "results"
    ]
  )
    .map(item => ({
      id:
        item.Make_ID,

      name:
        item.Make_Name,

      source:
        "nhtsa"
    }))
    .filter(
      item =>
        item.name
    )
    .sort(
      (a, b) =>
        a.name.localeCompare(
          b.name,
          "de"
        )
    );
}

/* =========================================================
   NHTSA – MODELLE
========================================================= */

async function nhtsaModels(
  brand
) {

  const url =
    `${NHTSA_BASE}/GetModelsForMake/${encodeURIComponent(
      brand
    )}?format=json`;

  const data =
    await fetchJson(
      url
    );

  return normalizeList(
    data,
    [
      "Results",
      "results"
    ]
  )
    .map(item => ({
      id:
        item.Model_ID,

      name:
        item.Model_Name,

      source:
        "nhtsa"
    }))
    .filter(
      item =>
        item.name
    )
    .sort(
      (a, b) =>
        a.name.localeCompare(
          b.name,
          "de"
        )
    );
}

/* =========================================================
   NHTSA – MODELL ZU FAHRZEUG
========================================================= */

function nhtsaBasicVehicle(
  brand,
  model,
  generation,
  engine
) {

  return {

    brand,

    model,

    generation:
      generation || null,

    engine:
      engine || null,

    source:
      "nhtsa",

    note:
      "NHTSA liefert hier Marke und Modell. Deutsche HSN/TSN-Daten werden separat über API4Cars geladen."

  };
}

/* =========================================================
   FALLBACK CARAPI.DEV
========================================================= */

async function carApiVehicle(
  brand,
  model
) {

  const token =
    clean(
      process.env.CARAPI_DEV_TOKEN
    );

  if (!token) {
    return null;
  }

  const url =
    new URL(
      `${CARAPI_BASE}/listing`
    );

  url.searchParams.set(
    "make",
    brand
  );

  url.searchParams.set(
    "model",
    model
  );

  url.searchParams.set(
    "limit",
    "10"
  );

  url.searchParams.set(
    "token",
    token
  );

  const data =
    await fetchJson(
      url
    );

  const listings =
    normalizeList(
      data,
      [
        "listings"
      ]
    );

  if (!listings.length) {
    return null;
  }

  const item =
    listings[0];

  const specs =
    item?.specifications ||
    item;

  return normalizeVehicle({
    ...item,
    ...specs,

    brand:
      firstDefined(
        specs?.make,
        specs?.brand,
        brand
      ),

    model:
      firstDefined(
        specs?.model,
        model
      ),

    year:
      firstDefined(
        specs?.year,
        item?.year
      ),

    engine:
      specs?.engine,

    fuel_type:
      specs?.fuel_type,

    transmission:
      specs?.transmission

  });
}

/* =========================================================
   API4CARS FEHLER
========================================================= */

function isQuotaError(
  error
) {

  const status =
    Number(
      error?.status
    );

  const code =
    clean(
      error?.code
    ).toLowerCase();

  const message =
    clean(
      error?.message
    ).toLowerCase();

  return (

    status === 401 ||
    status === 403 ||
    status === 404 ||
    status === 429 ||

    code.includes(
      "quota"
    ) ||

    code.includes(
      "rate"
    ) ||

    message.includes(
      "quota"
    ) ||

    message.includes(
      "limit"
    ) ||

    message.includes(
      "rate"
    )

  );
}

/* =========================================================
   HANDLER
========================================================= */

export default async function handler(
  req,
  res
) {

  if (
    req.method !== "GET"
  ) {

    return json(
      res,
      405,
      {
        success: false,

        error:
          "Nur GET ist erlaubt."
      }
    );
  }

  const action =
    clean(
      req.query.action
    ).toLowerCase();

  const brand =
    clean(
      req.query.brand
    );

  const model =
    clean(
      req.query.model
    );

  const generation =
    clean(
      req.query.generation
    );

  const engine =
    clean(
      req.query.engine
    );

  const hsn =
    clean(
      req.query.hsn
    );

  const tsn =
    clean(
      req.query.tsn
    );

  if (!action) {

    return json(
      res,
      400,
      {
        success: false,

        error:
          "Parameter 'action' fehlt."
      }
    );
  }

  const params = {
    brand,
    model,
    generation,
    engine,
    hsn,
    tsn
  };

  const key =
    cacheKey(
      action,
      params
    );

  const cached =
    getCache(key);

  if (cached !== null) {

    return json(
      res,
      200,
      {
        success: true,
        data: cached,
        source: "cache"
      }
    );
  }

  try {

    /* =====================================================
       MARKEN

       ABSICHTLICH NUR NHTSA
       KEIN API4CARS
    ===================================================== */

    if (
      action === "brands"
    ) {

      const data =
        await nhtsaBrands();

      setCache(
        key,
        data
      );

      return json(
        res,
        200,
        {
          success: true,
          data,
          source: "nhtsa"
        }
      );
    }

    /* =====================================================
       MODELLE

       ABSICHTLICH NUR NHTSA
       KEIN API4CARS
    ===================================================== */

    if (
      action === "models"
    ) {

      if (!brand) {

        return json(
          res,
          400,
          {
            success: false,

            error:
              "Für models wird 'brand' benötigt."
          }
        );
      }

      const data =
        await nhtsaModels(
          brand
        );

      setCache(
        key,
        data
      );

      return json(
        res,
        200,
        {
          success: true,
          data,
          source: "nhtsa"
        }
      );
    }

    /* =====================================================
       GENERATIONEN

       Keine unnötige API4CARS-Nutzung.
       NHTSA besitzt hierfür keine passende
       deutsche Generationen-Datenbank.

       Wenn CarAPI.dev vorhanden ist, versuchen wir
       darüber eine Variante zu bekommen.
    ===================================================== */

    if (
      action === "generations"
    ) {

      if (
        !brand ||
        !model
      ) {

        return json(
          res,
          400,
          {
            success: false,

            error:
              "Für generations werden brand und model benötigt."
          }
        );
      }

      /*
       * Wir liefern eine leere Liste,
       * statt API4Cars unnötig anzufragen.
       *
       * Das Modell kann trotzdem über
       * Marke + Modell ausgewählt werden.
       */

      const data = [];

      setCache(
        key,
        data
      );

      return json(
        res,
        200,
        {
          success: true,
          data,
          source: "nhtsa"
        }
      );
    }

    /* =====================================================
       MOTOREN
    ===================================================== */

    if (
      action === "engines"
    ) {

      const data = [];

      setCache(
        key,
        data
      );

      return json(
        res,
        200,
        {
          success: true,
          data,
          source: "nhtsa"
        }
      );
    }

    /* =====================================================
       HSN / TSN

       EINZIGER NORMALER API4CARS-WEG
    ===================================================== */

    if (
      action === "vehicle"
    ) {

      if (
        !hsn ||
        !tsn
      ) {

        return json(
          res,
          400,
          {
            success: false,

            error:
              "Für vehicle werden HSN und TSN benötigt."
          }
        );
      }

      try {

        const data =
          await api4carsVehicle(
            hsn,
            tsn
          );

        setCache(
          key,
          data
        );

        return json(
          res,
          200,
          {
            success: true,
            data,
            source: "api4cars"
          }
        );

      } catch (primaryError) {

        /*
         * Optionaler Backup.
         *
         * Wichtig:
         * CarAPI.dev kann nur verwendet werden,
         * wenn CARAPI_DEV_TOKEN vorhanden ist.
         */

        const backup =
          clean(
            process.env.CARAPI_DEV_TOKEN
          );

        if (!backup) {

          return json(
            res,
            503,
            {
              success: false,

              error:
                isQuotaError(
                  primaryError
                )
                  ? "Das API4Cars-Kontingent ist aktuell erschöpft. Für HSN/TSN ist kein gleichwertiger kostenloser Fallback konfiguriert."
                  : primaryError.message,

              source:
                "api4cars"
            }
          );
        }

        return json(
          res,
          503,
          {
            success: false,

            error:
              "API4Cars konnte die HSN/TSN-Anfrage nicht verarbeiten. Der konfigurierte Backup-Dienst unterstützt diese deutsche HSN/TSN-Abfrage nicht zuverlässig.",

            source:
              "backup-unavailable"
          }
        );
      }
    }

    /* =====================================================
       FAHRZEUG ÜBER MARKE + MODELL

       KEIN API4CARS-REQUEST
    ===================================================== */

    if (
      action === "vehicles"
    ) {

      if (
        !brand ||
        !model
      ) {

        return json(
          res,
          400,
          {
            success: false,

            error:
              "Für vehicles werden mindestens brand und model benötigt."
          }
        );
      }

      /*
       * Wir geben bewusst direkt
       * Marke + Modell zurück.
       *
       * Damit funktioniert die Modell-Suche
       * auch dann, wenn API4Cars keine
       * freien Anfragen mehr hat.
       */

      let data =
        nhtsaBasicVehicle(
          brand,
          model,
          generation,
          engine
        );

      /*
       * Optional versuchen wir CarAPI.dev.
       * Das ist NICHT notwendig und wird nur
       * verwendet, wenn ein Token vorhanden ist.
       */

      if (
        process.env.CARAPI_DEV_TOKEN
      ) {

        try {

          const backup =
            await carApiVehicle(
              brand,
              model
            );

          if (backup) {
            data = backup;
          }

        } catch {
          /*
           * NHTSA-Basisdaten bleiben erhalten.
           */
        }
      }

      setCache(
        key,
        data
      );

      return json(
        res,
        200,
        {
          success: true,
          data,
          source:
            data?.source ||
            "nhtsa"
        }
      );
    }

    return json(
      res,
      400,
      {
        success: false,

        error:
          `Unbekannte Aktion: ${action}`
      }
    );

  } catch (error) {

    console.error(
      "vehicle-search error:",
      error
    );

    return json(
      res,
      502,
      {
        success: false,

        error:
          error?.message ||
          "Fahrzeugdaten konnten nicht geladen werden.",

        source:
          "server"
      }
    );
  }
}