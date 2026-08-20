const API_BASE =
  "https://api4cars.com/wp-json/carapi/v1";


export default async function handler(req, res) {

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


  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }


  if (req.method !== "GET") {

    return res.status(405).json({
      error: "Method not allowed"
    });

  }


  const {

    action = "vehicle",

    hsn,
    tsn,

    brand,
    model,
    series,
    generation,

    page = "1",
    per_page = "50",

    onlyWithFitments = "0"

  } = req.query;


  const apiKey =
    process.env.CARAPI_KEY;


  const apiSecret =
    process.env.CARAPI_SECRET;


  if (!apiKey || !apiSecret) {

    return res.status(500).json({

      error:
        "CARAPI_KEY oder CARAPI_SECRET ist in Vercel nicht konfiguriert."

    });

  }


  const params =
    new URLSearchParams();


  let endpoint;


  /* -----------------------------------------
     HSN + TSN
  ----------------------------------------- */

  if (action === "vehicle") {

    if (!hsn || !tsn) {

      return res.status(400).json({

        error:
          "HSN und TSN werden benötigt."

      });

    }


    endpoint =
      "/vehicle";


    params.set(
      "hsn",
      hsn
    );


    params.set(
      "tsn",
      tsn
    );

  }


  /* -----------------------------------------
     Fahrzeuge
  ----------------------------------------- */

  else if (action === "vehicles") {

    endpoint =
      "/vehicles";


    if (brand)
      params.set(
        "brand",
        brand
      );


    if (model)
      params.set(
        "model",
        model
      );


    params.set(
      "page",
      page
    );


    params.set(
      "per_page",
      per_page
    );

  }


  /* -----------------------------------------
     Marken
  ----------------------------------------- */

  else if (action === "brands") {

    endpoint =
      "/brands";


    params.set(
      "onlyWithFitments",
      onlyWithFitments
    );

  }


  /* -----------------------------------------
     Modelle
  ----------------------------------------- */

  else if (action === "models") {

    if (!brand) {

      return res.status(400).json({

        error:
          "brand wird benötigt."

      });

    }


    endpoint =
      "/models";


    params.set(
      "brand",
      brand
    );

  }


  /* -----------------------------------------
     Serien
  ----------------------------------------- */

  else if (action === "series") {

    if (!brand) {

      return res.status(400).json({

        error:
          "brand wird benötigt."

      });

    }


    endpoint =
      "/series";


    params.set(
      "brand",
      brand
    );


    params.set(
      "onlyWithFitments",
      onlyWithFitments
    );

  }


  /* -----------------------------------------
     Varianten
  ----------------------------------------- */

  else if (action === "variants") {

    if (!brand || !series) {

      return res.status(400).json({

        error:
          "brand und series werden benötigt."

      });

    }


    endpoint =
      "/variants";


    params.set(
      "brand",
      brand
    );


    params.set(
      "series",
      series
    );


    params.set(
      "onlyWithFitments",
      onlyWithFitments
    );

  }


  /* -----------------------------------------
     Generationen
  ----------------------------------------- */

  else if (action === "generations") {

    if (!brand || !model) {

      return res.status(400).json({

        error:
          "brand und model werden benötigt."

      });

    }


    endpoint =
      "/generations";


    params.set(
      "brand",
      brand
    );


    params.set(
      "model",
      model
    );

  }


  /* -----------------------------------------
     Motoren
  ----------------------------------------- */

  else if (action === "engines") {

    if (
      !brand ||
      !model ||
      !generation
    ) {

      return res.status(400).json({

        error:
          "brand, model und generation werden benötigt."

      });

    }


    endpoint =
      "/engines";


    params.set(
      "brand",
      brand
    );


    params.set(
      "model",
      model
    );


    params.set(
      "generation",
      generation
    );

  }


  /* -----------------------------------------
     Fahrzeugtypen
  ----------------------------------------- */

  else if (action === "types") {

    if (!brand || !model) {

      return res.status(400).json({

        error:
          "brand und model werden benötigt."

      });

    }


    endpoint =
      "/types";


    params.set(
      "brand",
      brand
    );


    params.set(
      "model",
      model
    );

  }


  /* -----------------------------------------
     Motoren
  ----------------------------------------- */

  else if (action === "motors") {

    if (!brand || !model) {

      return res.status(400).json({

        error:
          "brand und model werden benötigt."

      });

    }


    endpoint =
      "/motors";


    params.set(
      "brand",
      brand
    );


    params.set(
      "model",
      model
    );

  }


  /* -----------------------------------------
     Versicherung / Typklassen
  ----------------------------------------- */

  else if (action === "insurance") {

    endpoint =
      "/insurance";


    if (hsn)
      params.set(
        "hsn",
        hsn
      );


    if (tsn)
      params.set(
        "tsn",
        tsn
      );


    if (brand)
      params.set(
        "brand",
        brand
      );


    if (model)
      params.set(
        "model",
        model
      );

  }


  /* -----------------------------------------
     Katalog
  ----------------------------------------- */

  else if (action === "catalog") {

    endpoint =
      "/catalog";


    if (brand)
      params.set(
        "brand",
        brand
      );


    if (model)
      params.set(
        "model",
        model
      );


    if (generation)
      params.set(
        "generation",
        generation
      );


    params.set(
      "page",
      page
    );


    params.set(
      "per_page",
      per_page
    );

  }


  else {

    return res.status(400).json({

      error:
        "Unbekannte API-Aktion.",

      availableActions: [

        "vehicle",
        "vehicles",
        "brands",
        "models",
        "series",
        "variants",
        "generations",
        "engines",
        "types",
        "motors",
        "insurance",
        "catalog"

      ]

    });

  }


  try {

    const url =
      `${API_BASE}${endpoint}?${params.toString()}`;


    const response =
      await fetch(
        url,
        {
          method: "GET",

          headers: {

            "X-API-Key":
              apiKey,

            "X-API-Secret":
              apiSecret,

            "Accept":
              "application/json"

          }

        }
      );


    const text =
      await response.text();


    let data;


    try {

      data =
        JSON.parse(text);

    } catch {

      data = {
        raw: text
      };

    }


    if (!response.ok) {

      return res.status(
        response.status
      ).json({

        error:
          "Die CarAPI-Anfrage ist fehlgeschlagen.",

        status:
          response.status,

        data

      });

    }


    return res.status(200).json({

      success:
        true,

      action,

      data

    });


  } catch (error) {

    console.error(
      "CarAPI error:",
      error
    );


    return res.status(500).json({

      error:
        "Verbindung zur Fahrzeug-API fehlgeschlagen.",

      message:
        error.message

    });

  }

}