/* ==================================================
   MUSIC SESSION LOCATION
   location.js
   ================================================== */


/* ==================================================
   STATE
   ================================================== */

const locationState = {

  latitude:
    null,

  longitude:
    null,

  accuracy:
    null,

  locationName:
    "Current Location",

  address:
    null,

  timezone:
    Intl
      .DateTimeFormat()
      .resolvedOptions()
      .timeZone,

  selectedService:
    "Restaurants"
};


/* ==================================================
   API
   ================================================== */

const LOCATION_WEATHER_API =
  "https://api.open-meteo.com/v1/forecast";


const LOCATION_SEARCH_API =
  "https://geocoding-api.open-meteo.com/v1/search";


const REVERSE_GEOCODING_API =
  "https://nominatim.openstreetmap.org/reverse";


/* ==================================================
   HELPERS
   ================================================== */

function locationById(
  id
) {

  return document.getElementById(
    id
  );
}


function setLocationStatus(
  message
) {

  const element =
    locationById(
      "statusMessage"
    );


  if (
    element
  ) {

    element.textContent =
      message;
  }
}


function formatCoordinate(
  value
) {

  return Number(
    value
  ).toFixed(
    6
  );
}


function getAddressValue(
  address,
  keys
) {

  for (
    const key of keys
  ) {

    if (
      address &&
      address[key]
    ) {

      return address[key];
    }
  }


  return "--";
}


/* ==================================================
   WEATHER CODE
   ================================================== */

function locationWeatherInfo(
  code
) {

  const map = {

    0: [
      "Clear sky",
      "☀️"
    ],

    1: [
      "Mainly clear",
      "🌤️"
    ],

    2: [
      "Partly cloudy",
      "⛅"
    ],

    3: [
      "Overcast",
      "☁️"
    ],

    45: [
      "Fog",
      "🌫️"
    ],

    48: [
      "Rime fog",
      "🌫️"
    ],

    51: [
      "Light drizzle",
      "🌦️"
    ],

    53: [
      "Drizzle",
      "🌦️"
    ],

    55: [
      "Heavy drizzle",
      "🌧️"
    ],

    61: [
      "Light rain",
      "🌦️"
    ],

    63: [
      "Rain",
      "🌧️"
    ],

    65: [
      "Heavy rain",
      "🌧️"
    ],

    71: [
      "Light snow",
      "🌨️"
    ],

    73: [
      "Snow",
      "🌨️"
    ],

    75: [
      "Heavy snow",
      "❄️"
    ],

    80: [
      "Rain showers",
      "🌦️"
    ],

    81: [
      "Rain showers",
      "🌧️"
    ],

    82: [
      "Heavy showers",
      "⛈️"
    ],

    95: [
      "Thunderstorm",
      "⛈️"
    ],

    96: [
      "Thunderstorm with hail",
      "⛈️"
    ],

    99: [
      "Severe thunderstorm",
      "⛈️"
    ]
  };


  const result =
    map[
      Number(
        code
      )
    ] ||
    [
      "Current conditions",
      "🌤️"
    ];


  return {

    label:
      result[0],

    icon:
      result[1]
  };
}


/* ==================================================
   LOCAL STORAGE
   ================================================== */

function saveMusicSessionLocation() {

  if (
    !Number.isFinite(
      locationState.latitude
    ) ||
    !Number.isFinite(
      locationState.longitude
    )
  ) {

    return;
  }


  const payload = {

    latitude:
      locationState.latitude,

    longitude:
      locationState.longitude,

    accuracy:
      locationState.accuracy,

    locationName:
      locationState.locationName,

    address:
      locationState.address,

    timezone:
      locationState.timezone,

    savedAt:
      Date.now()
  };


  try {

    localStorage.setItem(
      "musicSessionLocation",
      JSON.stringify(
        payload
      )
    );

  } catch (
    error
  ) {

    console.warn(
      "Unable to save Music Session location:",
      error
    );
  }
}


function loadMusicSessionLocation() {

  try {

    const raw =
      localStorage.getItem(
        "musicSessionLocation"
      );


    if (
      !raw
    ) {

      return null;
    }


    const data =
      JSON.parse(
        raw
      );


    if (
      !Number.isFinite(
        Number(
          data.latitude
        )
      ) ||
      !Number.isFinite(
        Number(
          data.longitude
        )
      )
    ) {

      return null;
    }


    return data;

  } catch (
    error
  ) {

    return null;
  }
}


/* ==================================================
   GOOGLE MAPS
   ================================================== */

function googleMapsCoordinateQuery(
  latitude,
  longitude
) {

  return (
    `${encodeURIComponent(latitude)},` +
    `${encodeURIComponent(longitude)}`
  );
}


function updateGoogleMaps(
  latitude,
  longitude,
  zoom = 15
) {

  const query =
    googleMapsCoordinateQuery(
      latitude,
      longitude
    );


  const mapFrame =
    locationById(
      "locationMapFrame"
    );


  if (
    mapFrame
  ) {

    mapFrame.src =
      `https://www.google.com/maps?q=${query}&z=${zoom}&output=embed`;
  }


  const openMap =
    `https://www.google.com/maps/search/?api=1&query=${query}`;


  const directions =
    `https://www.google.com/maps/dir/?api=1&destination=${query}`;


  const googleMapsButton =
    locationById(
      "googleMapsButton"
    );


  const googleMapSearchLink =
    locationById(
      "googleMapSearchLink"
    );


  const directionsLink =
    locationById(
      "directionsLink"
    );


  if (
    googleMapsButton
  ) {

    googleMapsButton.href =
      openMap;
  }


  if (
    googleMapSearchLink
  ) {

    googleMapSearchLink.href =
      openMap;
  }


  if (
    directionsLink
  ) {

    directionsLink.href =
      directions;
  }
}


/* ==================================================
   REVERSE GEOCODING
   ================================================== */

async function reverseGeocodeLocation(
  latitude,
  longitude
) {

  const params =
    new URLSearchParams({

      format:
        "jsonv2",

      lat:
        latitude,

      lon:
        longitude,

      zoom:
        "18",

      addressdetails:
        "1"
    });


  const response =
    await fetch(
      `${REVERSE_GEOCODING_API}?${params}`,
      {

        headers: {

          Accept:
            "application/json"
        }
      }
    );


  if (
    !response.ok
  ) {

    throw new Error(
      "Reverse geocoding unavailable"
    );
  }


  return response.json();
}


function applyReverseGeocoding(
  data
) {

  const address =
    data?.address ||
    {};


  locationState.address =
    address;


  const district =
    getAddressValue(
      address,
      [
        "suburb",
        "neighbourhood",
        "city_district",
        "district",
        "quarter"
      ]
    );


  const city =
    getAddressValue(
      address,
      [
        "city",
        "municipality",
        "town",
        "county",
        "village"
      ]
    );


  const region =
    getAddressValue(
      address,
      [
        "state",
        "region"
      ]
    );


  const country =
    getAddressValue(
      address,
      [
        "country"
      ]
    );


  const postal =
    getAddressValue(
      address,
      [
        "postcode"
      ]
    );


  const primary =
    district !== "--"

      ? district

      : (
        city !== "--"

          ? city

          : (
            data?.name ||
            "Selected location"
          )
      );


  const secondaryParts =
    [
      city,
      region,
      country
    ]
      .filter(
        (
          value,
          index,
          array
        ) =>
          value !== "--" &&
          array.indexOf(
            value
          ) ===
            index &&
          value !==
            primary
      );


  const secondary =
    secondaryParts.join(
      ", "
    );


  locationState.locationName =
    primary;


  locationById(
    "glanceLocation"
  ).textContent =
    primary;


  locationById(
    "glanceRegion"
  ).textContent =
    secondary ||
    "Location detected";


  locationById(
    "primaryLocation"
  ).textContent =
    primary;


  locationById(
    "primaryAddress"
  ).textContent =
    data?.display_name ||
    secondary ||
    "Address details detected";


  locationById(
    "districtValue"
  ).textContent =
    district;


  locationById(
    "cityValue"
  ).textContent =
    city;


  locationById(
    "regionValue"
  ).textContent =
    region;


  locationById(
    "countryValue"
  ).textContent =
    country;


  locationById(
    "postalValue"
  ).textContent =
    postal;


  locationById(
    "timezoneValue"
  ).textContent =
    locationState.timezone;


  saveMusicSessionLocation();
}


/* ==================================================
   WEATHER
   ================================================== */

async function loadLocationWeather(
  latitude,
  longitude
) {

  const params =
    new URLSearchParams({

      latitude:
        latitude,

      longitude:
        longitude,

      current:
        [
          "temperature_2m",
          "apparent_temperature",
          "relative_humidity_2m",
          "precipitation",
          "weather_code",
          "wind_speed_10m"
        ].join(
          ","
        ),

      temperature_unit:
        "celsius",

      wind_speed_unit:
        "kmh",

      timezone:
        "auto"
    });


  try {

    const response =
      await fetch(
        `${LOCATION_WEATHER_API}?${params}`
      );


    if (
      !response.ok
    ) {

      throw new Error(
        "Weather unavailable"
      );
    }


    const data =
      await response.json();


    const current =
      data.current ||
      {};


    locationState.timezone =
      data.timezone ||
      locationState.timezone;


    locationById(
      "timezoneValue"
    ).textContent =
      locationState.timezone;


    const info =
      locationWeatherInfo(
        current.weather_code
      );


    const temperature =
      Number.isFinite(
        Number(
          current.temperature_2m
        )
      )

        ? `${Math.round(
            Number(
              current.temperature_2m
            )
          )}°C`

        : "--°C";


    locationById(
      "glanceWeather"
    ).textContent =
      `${info.icon} ${temperature}`;


    locationById(
      "glanceWeatherCondition"
    ).textContent =
      info.label;


    locationById(
      "weatherIcon"
    ).textContent =
      info.icon;


    locationById(
      "weatherTemperature"
    ).textContent =
      temperature;


    locationById(
      "weatherCondition"
    ).textContent =
      info.label;


    locationById(
      "feelsLikeValue"
    ).textContent =
      Number.isFinite(
        Number(
          current.apparent_temperature
        )
      )

        ? `${Math.round(
            Number(
              current.apparent_temperature
            )
          )}°C`

        : "--°C";


    locationById(
      "humidityValue"
    ).textContent =
      Number.isFinite(
        Number(
          current.relative_humidity_2m
        )
      )

        ? `${Math.round(
            Number(
              current.relative_humidity_2m
            )
          )}%`

        : "--%";


    locationById(
      "precipitationValue"
    ).textContent =
      Number.isFinite(
        Number(
          current.precipitation
        )
      )

        ? `${Number(
            current.precipitation
          ).toFixed(
            1
          )} mm`

        : "-- mm";


    locationById(
      "windValue"
    ).textContent =
      Number.isFinite(
        Number(
          current.wind_speed_10m
        )
      )

        ? `${Math.round(
            Number(
              current.wind_speed_10m
            )
          )} km/h`

        : "-- km/h";


    saveMusicSessionLocation();

  } catch (
    error
  ) {

    console.error(
      "Location weather error:",
      error
    );


    locationById(
      "glanceWeather"
    ).textContent =
      "Weather unavailable";


    locationById(
      "glanceWeatherCondition"
    ).textContent =
      "Open Weather Center for more details";


    locationById(
      "weatherCondition"
    ).textContent =
      "Weather data could not be loaded.";
  }
}


/* ==================================================
   NEARBY GOOGLE MAPS SEARCH
   ================================================== */

function createNearbyGoogleMapsCards() {

  const grid =
    locationById(
      "nearbyGrid"
    );


  const status =
    locationById(
      "nearbyStatus"
    );


  if (
    !Number.isFinite(
      locationState.latitude
    ) ||
    !Number.isFinite(
      locationState.longitude
    )
  ) {

    status.textContent =
      "Detect or select a location first.";


    grid.innerHTML =
      `
        <div class="empty-state">
          Nearby Google Maps searches will appear here after a location is selected.
        </div>
      `;


    return;
  }


  const categories = [

    {
      label:
        "Restaurants",

      icon:
        "🍽️"
    },

    {
      label:
        "Cafes",

      icon:
        "☕"
    },

    {
      label:
        "Hospitals",

      icon:
        "🏥"
    },

    {
      label:
        "Pharmacies",

      icon:
        "💊"
    },

    {
      label:
        "ATMs",

      icon:
        "🏧"
    },

    {
      label:
        "Supermarkets",

      icon:
        "🛒"
    },

    {
      label:
        "Gas stations",

      icon:
        "⛽"
    },

    {
      label:
        "Public transport",

      icon:
        "🚌"
    }
  ];


  grid.innerHTML =
    "";


  categories.forEach(
    category => {

      const card =
        document.createElement(
          "article"
        );


      card.className =
        "nearby-card";


      const title =
        document.createElement(
          "strong"
        );


      title.textContent =
        `${category.icon} ${category.label}`;


      const description =
        document.createElement(
          "p"
        );


      description.textContent =
        `Search Google Maps for ${category.label.toLowerCase()} around the selected position.`;


      const link =
        document.createElement(
          "a"
        );


      link.className =
        "map-link";


      link.target =
        "_blank";


      link.rel =
        "noopener noreferrer";


      const query =
        encodeURIComponent(
          `${category.label} near ${locationState.latitude},${locationState.longitude}`
        );


      link.href =
        `https://www.google.com/maps/search/?api=1&query=${query}`;


      link.textContent =
        "Search Google Maps ↗";


      card.append(
        title,
        description,
        link
      );


      grid.appendChild(
        card
      );
    }
  );


  status.textContent =
    "Google Maps nearby shortcuts are ready.";
}


function openGoogleMapsService(
  service
) {

  if (
    !Number.isFinite(
      locationState.latitude
    ) ||
    !Number.isFinite(
      locationState.longitude
    )
  ) {

    setLocationStatus(
      "Detect or select a location before searching nearby places."
    );


    return;
  }


  locationState.selectedService =
    service;


  document
    .querySelectorAll(
      ".service-button"
    )
    .forEach(
      button => {

        button.classList.toggle(
          "is-active",
          button.dataset.service ===
            service
        );
      }
    );


  const query =
    encodeURIComponent(
      `${service} near ${locationState.latitude},${locationState.longitude}`
    );


  window.open(
    `https://www.google.com/maps/search/?api=1&query=${query}`,
    "_blank",
    "noopener,noreferrer"
  );
}


/* ==================================================
   SET LOCATION
   ================================================== */

async function setLocationPosition(
  latitude,
  longitude,
  accuracy = null,
  source = "selected",
  knownName = null
) {

  locationState.latitude =
    Number(
      latitude
    );


  locationState.longitude =
    Number(
      longitude
    );


  locationState.accuracy =
    accuracy == null

      ? null

      : Number(
        accuracy
      );


  locationById(
    "glanceCoordinates"
  ).textContent =
    `${formatCoordinate(
      locationState.latitude
    )}, ${formatCoordinate(
      locationState.longitude
    )}`;


  locationById(
    "glanceAccuracy"
  ).textContent =
    Number.isFinite(
      locationState.accuracy
    )

      ? `Accuracy ±${Math.round(
          locationState.accuracy
        )} m`

      : source ===
          "search"

        ? "Selected from search"

        : "Accuracy unavailable";


  if (
    knownName
  ) {

    locationState.locationName =
      knownName;


    locationById(
      "glanceLocation"
    ).textContent =
      knownName;


    locationById(
      "primaryLocation"
    ).textContent =
      knownName;
  }


  updateGoogleMaps(
    locationState.latitude,
    locationState.longitude
  );


  setLocationStatus(
    "Position selected. Loading local details..."
  );


  const tasks = [

    reverseGeocodeLocation(
      locationState.latitude,
      locationState.longitude
    )
      .then(
        applyReverseGeocoding
      )
      .catch(
        error => {

          console.warn(
            "Address lookup:",
            error
          );


          const fallback =
            knownName ||
            "Selected position";


          locationById(
            "primaryLocation"
          ).textContent =
            fallback;


          locationById(
            "primaryAddress"
          ).textContent =
            `${formatCoordinate(
              locationState.latitude
            )}, ${formatCoordinate(
              locationState.longitude
            )}`;


          locationById(
            "glanceLocation"
          ).textContent =
            fallback;


          locationById(
            "glanceRegion"
          ).textContent =
            "Address lookup unavailable";


          saveMusicSessionLocation();
        }
      ),

    loadLocationWeather(
      locationState.latitude,
      locationState.longitude
    )
  ];


  await Promise.allSettled(
    tasks
  );


  createNearbyGoogleMapsCards();


  setLocationStatus(
    "Location ready."
  );
}


/* ==================================================
   GEOLOCATION
   ================================================== */

function detectCurrentLocation() {

  if (
    !navigator.geolocation
  ) {

    setLocationStatus(
      "This browser does not support geolocation. Search for a city instead."
    );


    return;
  }


  setLocationStatus(
    "Requesting your current position..."
  );


  locationById(
    "primaryLocation"
  ).textContent =
    "Detecting your position...";


  locationById(
    "primaryAddress"
  ).textContent =
    "Waiting for the browser geolocation result.";


  navigator.geolocation.getCurrentPosition(

    position => {

      setLocationPosition(

        position.coords.latitude,

        position.coords.longitude,

        position.coords.accuracy,

        "device"
      );
    },


    error => {

      const messages = {

        1:
          "Location permission was denied. Allow location access or search for a city.",

        2:
          "Your current position is unavailable. Try again or use location search.",

        3:
          "Location detection timed out. Try again or use location search."
      };


      setLocationStatus(
        messages[
          error.code
        ] ||
        "Unable to detect the current position."
      );


      locationById(
        "primaryLocation"
      ).textContent =
        "Location access needed";


      locationById(
        "primaryAddress"
      ).textContent =
        "You can still search for a city or place below.";
    },


    {

      enableHighAccuracy:
        true,

      timeout:
        12000,

      maximumAge:
        120000
    }
  );
}


/* ==================================================
   LOCATION SEARCH
   ================================================== */

async function searchLocation(
  query
) {

  const trimmed =
    query.trim();


  const container =
    locationById(
      "searchResults"
    );


  if (
    !trimmed
  ) {

    container.hidden =
      true;


    return;
  }


  container.hidden =
    false;


  container.innerHTML =
    `
      <div class="search-result">
        Searching locations...
      </div>
    `;


  setLocationStatus(
    `Searching for ${trimmed}...`
  );


  try {

    const params =
      new URLSearchParams({

        name:
          trimmed,

        count:
          "6",

        language:
          "en",

        format:
          "json"
      });


    const response =
      await fetch(
        `${LOCATION_SEARCH_API}?${params}`
      );


    if (
      !response.ok
    ) {

      throw new Error(
        "Search unavailable"
      );
    }


    const data =
      await response.json();


    const results =
      data.results ||
      [];


    container.innerHTML =
      "";


    if (
      !results.length
    ) {

      container.innerHTML =
        `
          <div class="search-result">
            No matching location.
          </div>
        `;


      setLocationStatus(
        "No matching location was found."
      );


      return;
    }


    results.forEach(
      result => {

        const button =
          document.createElement(
            "button"
          );


        button.type =
          "button";


        button.className =
          "search-result-button";


        const details =
          [
            result.admin1,
            result.country
          ]
            .filter(
              Boolean
            )
            .join(
              ", "
            );


        const name =
          details

            ? `${result.name}, ${details}`

            : result.name;


        button.innerHTML =
          `
            <span>

              <strong>
                ${escapeLocationHtml(
                  result.name
                )}
              </strong>

              <br>

              <small>
                ${escapeLocationHtml(
                  details
                )}
              </small>

            </span>

            <small>
              ${Number(
                result.latitude
              ).toFixed(
                2
              )},
              ${Number(
                result.longitude
              ).toFixed(
                2
              )}
            </small>
          `;


        button.addEventListener(
          "click",
          () => {

            container.hidden =
              true;


            locationById(
              "locationSearchInput"
            ).value =
              name;


            setLocationPosition(

              result.latitude,

              result.longitude,

              null,

              "search",

              name
            );
          }
        );


        container.appendChild(
          button
        );
      }
    );


    setLocationStatus(
      "Select a location."
    );

  } catch (
    error
  ) {

    console.error(
      "Location search error:",
      error
    );


    container.innerHTML =
      `
        <div class="search-result">
          Location search could not be loaded.
        </div>
      `;


    setLocationStatus(
      "Unable to search locations."
    );
  }
}


function escapeLocationHtml(
  value
) {

  return String(
    value ??
    ""
  )
    .replaceAll(
      "&",
      "&amp;"
    )
    .replaceAll(
      "<",
      "&lt;"
    )
    .replaceAll(
      ">",
      "&gt;"
    )
    .replaceAll(
      '"',
      "&quot;"
    )
    .replaceAll(
      "'",
      "&#039;"
    );
}


/* ==================================================
   RESTORE SAVED LOCATION
   ================================================== */

function restoreSavedLocation(
  saved
) {

  if (
    !saved
  ) {

    return;
  }


  locationState.latitude =
    Number(
      saved.latitude
    );


  locationState.longitude =
    Number(
      saved.longitude
    );


  locationState.accuracy =
    saved.accuracy == null

      ? null

      : Number(
        saved.accuracy
      );


  locationState.locationName =
    saved.locationName ||
    "Last detected location";


  locationState.address =
    saved.address ||
    null;


  locationState.timezone =
    saved.timezone ||
    locationState.timezone;


  locationById(
    "glanceLocation"
  ).textContent =
    locationState.locationName;


  locationById(
    "primaryLocation"
  ).textContent =
    locationState.locationName;


  locationById(
    "glanceCoordinates"
  ).textContent =
    `${formatCoordinate(
      locationState.latitude
    )}, ${formatCoordinate(
      locationState.longitude
    )}`;


  locationById(
    "glanceAccuracy"
  ).textContent =
    Number.isFinite(
      locationState.accuracy
    )

      ? `Last accuracy ±${Math.round(
          locationState.accuracy
        )} m`

      : "Saved location";


  locationById(
    "timezoneValue"
  ).textContent =
    locationState.timezone;


  updateGoogleMaps(
    locationState.latitude,
    locationState.longitude
  );


  createNearbyGoogleMapsCards();


  loadLocationWeather(
    locationState.latitude,
    locationState.longitude
  );
}


/* ==================================================
   EVENTS
   ================================================== */

function initializeLocationEvents() {

  locationById(
    "detectButton"
  ).addEventListener(
    "click",
    detectCurrentLocation
  );


  locationById(
    "refreshButton"
  ).addEventListener(
    "click",
    detectCurrentLocation
  );


  locationById(
    "locationSearchForm"
  ).addEventListener(
    "submit",
    event => {

      event.preventDefault();


      searchLocation(
        locationById(
          "locationSearchInput"
        ).value
      );
    }
  );


  document
    .querySelectorAll(
      ".service-button"
    )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          () => {

            openGoogleMapsService(
              button.dataset.service
            );
          }
        );
      }
    );
}


/* ==================================================
   START
   ================================================== */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    initializeLocationEvents();


    const saved =
      loadMusicSessionLocation();


    if (
      saved
    ) {

      restoreSavedLocation(
        saved
      );
    }


    detectCurrentLocation();
  }
);
