const API_BASE =
  "https://api4cars.com/wp-json/carapi/v1";


function clean(value) {

  if (
    value === undefined ||
    value === null
  ) {
    return "";
  }

  return String(value).trim();

}


async function callCarApi(
  endpoint,
  params,
  apiKey,
  apiSecret
) {

  const query =
    new URLSearchParams();

  Object.entries(
    params || {}
  ).forEach(
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


  const url =
    `${API_BASE}${endpoint}?${query.toString()}`;


  const response =
    await fetch(
      url,
      {
        method: "GET",

        headers: {
          Accept:
            "application/json",

          "X-API-Key":
            apiKey,

          "X-API-Secret":
            apiSecret
        }
      }
    );


  let data;

  try {

    data =
      await response.json();

  } catch {

    data = {
      error:
        "Die CarAPI hat keine gültige JSON-Antwort geliefert."
    };

  }


  return {
    response,
    data
  };

}


function errorMessage(
  data,
  status
) {

  return (
    data?.message ||
    data?.error ||
    data?.code ||
    `CarAPI Fehler (${status})`
  );

}


export default async function handler(
  req,
  res
) {

  res.setHeader(
    "Access-Control-Allow-Origin",
    "*"
  );

  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, OPTIONS"
  );

  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type"
  );


  if (
    req.method === "OPTIONS"
  ) {

    return res
      .status(200)
      .end();

  }


  if (
    req.method !== "GET"
  ) {

    return res
      .status(405)
      .json({
        success: false,
        error:
          "Method not allowed"
      });

  }


  const apiKey =
    process.env.CARAPI_KEY;

  const apiSecret =
    process.env.CARAPI_SECRET;


  if (
    !apiKey ||
    !apiSecret
  ) {

    return res
      .status(500)
      .json({
        success: false,

        error:
          "CARAPI_KEY oder CARAPI_SECRET ist in Vercel nicht konfiguriert."
      });

  }


  const {
    action = "vehicle",

    hsn,
    tsn,

    brand,
    model,
    generation,
    engine
  } = req.query;


  try {

    /* ======================================================
       HSN / TSN
    ======================================================= */

    if (
      action === "vehicle"
    ) {

      const cleanHsn =
        clean(hsn);

      const cleanTsn =
        clean(tsn);


      if (
        !cleanHsn ||
        !cleanTsn
      ) {

        return res
          .status(400)
          .json({
            success: false,
            error:
              "HSN und TSN werden benötigt."
          });

      }


      const result =
        await callCarApi(
          "/vehicle",
          {
            hsn:
              cleanHsn,

            tsn:
              cleanTsn
          },
          apiKey,
          apiSecret
        );


      if (
        !result.response.ok
      ) {

        return res
          .status(
            result.response.status
          )
          .json({
            success: false,

            error:
              errorMessage(
                result.data,
                result.response.status
              ),

            details:
              result.data
          });

      }


      return res
        .status(200)
        .json({
          success: true,
          data:
            result.data
        });

    }


    /* ======================================================
       MARKEN
    ======================================================= */

    if (
      action === "brands"
    ) {

      const result =
        await callCarApi(
          "/brands",
          {},
          apiKey,
          apiSecret
        );


      if (
        !result.response.ok
      ) {

        return res
          .status(
            result.response.status
          )
          .json({
            success: false,

            error:
              errorMessage(
                result.data,
                result.response.status
              )
          });

      }


      return res
        .status(200)
        .json({
          success: true,
          data:
            result.data
        });

    }


    /* ======================================================
       MODELLE
    ======================================================= */

    if (
      action === "models"
    ) {

      const cleanBrand =
        clean(brand);


      if (!cleanBrand) {

        return res
          .status(400)
          .json({
            success: false,
            error:
              "Eine Marke wird benötigt."
          });

      }


      const result =
        await callCarApi(
          "/models",
          {
            brand:
              cleanBrand
          },
          apiKey,
          apiSecret
        );


      if (
        !result.response.ok
      ) {

        return res
          .status(
            result.response.status
          )
          .json({
            success: false,

            error:
              "Die Modellsuche konnte über die CarAPI nicht geladen werden.",

            details:
              result.data
          });

      }


      return res
        .status(200)
        .json({
          success: true,
          data:
            result.data
        });

    }


    /* ======================================================
       GENERATIONEN
    ======================================================= */

    if (
      action === "generations"
    ) {

      const cleanBrand =
        clean(brand);

      const cleanModel =
        clean(model);


      if (
        !cleanBrand ||
        !cleanModel
      ) {

        return res
          .status(400)
          .json({
            success: false,
            error:
              "Marke und Modell werden benötigt."
          });

      }


      const result =
        await callCarApi(
          "/generations",
          {
            brand:
              cleanBrand,

            model:
              cleanModel
          },
          apiKey,
          apiSecret
        );


      if (
        !result.response.ok
      ) {

        return res
          .status(
            result.response.status
          )
          .json({
            success: false,

            error:
              "Die Generationen konnten über die CarAPI nicht geladen werden.",

            details:
              result.data
          });

      }


      return res
        .status(200)
        .json({
          success: true,
          data:
            result.data
        });

    }


    /* ======================================================
       MOTOREN
    ======================================================= */

    if (
      action === "engines"
    ) {

      const cleanBrand =
        clean(brand);

      const cleanModel =
        clean(model);

      const cleanGeneration =
        clean(generation);


      if (
        !cleanBrand ||
        !cleanModel ||
        !cleanGeneration
      ) {

        return res
          .status(400)
          .json({
            success: false,
            error:
              "Marke, Modell und Generation werden benötigt."
          });

      }


      const result =
        await callCarApi(
          "/engines",
          {
            brand:
              cleanBrand,

            model:
              cleanModel,

            generation:
              cleanGeneration
          },
          apiKey,
          apiSecret
        );


      if (
        !result.response.ok
      ) {

        return res
          .status(
            result.response.status
          )
          .json({
            success: false,

            error:
              "Die Motorisierungen konnten über die CarAPI nicht geladen werden.",

            details:
              result.data
          });

      }


      return res
        .status(200)
        .json({
          success: true,
          data:
            result.data
        });

    }


    /* ======================================================
       KONKRETES FAHRZEUG ÜBER MODELL
    ======================================================= */

    if (
      action === "vehicles"
    ) {

      const cleanBrand =
        clean(brand);

      const cleanModel =
        clean(model);

      const cleanGeneration =
        clean(generation);

      const cleanEngine =
        clean(engine);


      if (
        !cleanBrand ||
        !cleanModel
      ) {

        return res
          .status(400)
          .json({
            success: false,
            error:
              "Marke und Modell werden benötigt."
          });

      }


      /*
       * Der dokumentierte öffentliche Fahrzeug-Endpunkt
       * arbeitet eindeutig mit HSN/TSN.
       *
       * Der Modell-Konfigurator der Website ist laut
       * CarAPI mehrstufig aufgebaut. Falls dein API-Plan
       * dafür einen /vehicles-Endpunkt bereitstellt,
       * wird er hier verwendet.
       */


      const result =
        await callCarApi(
          "/vehicles",
          {
            brand:
              cleanBrand,

            model:
              cleanModel,

            generation:
              cleanGeneration,

            engine:
              cleanEngine
          },
          apiKey,
          apiSecret
        );


      if (
        !result.response.ok
      ) {

        return res
          .status(
            result.response.status
          )
          .json({
            success: false,

            error:
              "Die konkrete Modellsuche ist für diesen API-Endpunkt nicht verfügbar. Nutze alternativ HSN/TSN.",

            details:
              result.data
          });

      }


      return res
        .status(200)
        .json({
          success: true,
          data:
            result.data
        });

    }


    /* ======================================================
       UNBEKANNTE ACTION
    ======================================================= */

    return res
      .status(400)
      .json({
        success: false,

        error:
          `Unbekannte Aktion: ${action}`
      });


  } catch (error) {

    console.error(
      "CarAPI error:",
      error
    );


    return res
      .status(500)
      .json({
        success: false,

        error:
          "Fehler bei der Verbindung zur CarAPI.",

        details:
          process.env.NODE_ENV ===
          "development"
            ? error.message
            : undefined
      });

  }

}