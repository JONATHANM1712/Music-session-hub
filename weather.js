const state = {
  latitude: null,
  longitude: null,
  locationName: "Current Location",
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  weatherData: null,

  radarFrames: [],
  radarLayer: null,
  radarMap: null,
  radarMarker: null,
  radarPlayTimer: null,
  radarHost: null,

  historyChart: null,
  precipitationChart: null,
  windChart: null
};


/*
==================================================
API ENDPOINTS

These work directly from GitHub Pages.

No Spring Boot.
No Controller.
No API key.
==================================================
*/

const WEATHER_API =
  "https://api.open-meteo.com/v1/forecast";

const GEOCODING_API =
  "https://geocoding-api.open-meteo.com/v1/search";

const RAINVIEWER_API =
  "https://api.rainviewer.com/public/weather-maps.json";


/*
==================================================
HELPERS
==================================================
*/

function byId(id) {
  return document.getElementById(id);
}


function setStatus(message) {
  const element = byId("statusMessage");

  if (element) {
    element.textContent = message;
  }
}


function updateClock() {
  const now = new Date();

  let parts;

  try {
    parts = new Intl.DateTimeFormat(
      "en-US",
      {
        timeZone: state.timezone,
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
        hour12: true
      }
    ).formatToParts(now);

  } catch (error) {

    state.timezone =
      Intl.DateTimeFormat()
        .resolvedOptions()
        .timeZone;

    parts = new Intl.DateTimeFormat(
      "en-US",
      {
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
        hour12: true
      }
    ).formatToParts(now);
  }


  const hourPart =
    parts.find(
      part => part.type === "hour"
    );

  const dayPeriodPart =
    parts.find(
      part => part.type === "dayPeriod"
    );


  const hour12 =
    Number(hourPart?.value || 12);

  const dayPeriod =
    dayPeriodPart?.value || "AM";


  let hour24 =
    hour12 % 12;

  if (
    dayPeriod.toUpperCase() === "PM"
  ) {
    hour24 += 12;
  }


  let greeting =
    "Good Evening!";


  if (
    hour24 >= 5 &&
    hour24 < 12
  ) {

    greeting =
      "Good Morning!";

  } else if (
    hour24 >= 12 &&
    hour24 < 18
  ) {

    greeting =
      "Good Afternoon!";
  }


  const greetingElement =
    byId("greetingText");

  if (greetingElement) {
    greetingElement.textContent =
      greeting;
  }


  const timeElement =
    byId("timeText");

  if (timeElement) {

    timeElement.textContent =
      new Intl.DateTimeFormat(
        "en-US",
        {
          timeZone: state.timezone,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true
        }
      ).format(now);
  }


  const dateElement =
    byId("dateText");

  if (dateElement) {

    dateElement.textContent =
      new Intl.DateTimeFormat(
        "en-US",
        {
          timeZone: state.timezone,
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric"
        }
      ).format(now);
  }


  const timezoneElement =
    byId("timezoneText");

  if (timezoneElement) {

    timezoneElement.textContent =
      state.timezone ||
      "Local time";
  }
}


/*
==================================================
WEATHER CODE TRANSLATOR
==================================================
*/

function weatherInfo(
  code,
  isDay = 1
) {

  const night =
    Number(isDay) === 0;


  const map = {

    0: [
      night
        ? "Clear night"
        : "Clear sky",

      night
        ? "🌙"
        : "☀️"
    ],


    1: [
      night
        ? "Mainly clear night"
        : "Mainly clear",

      night
        ? "🌙"
        : "🌤️"
    ],


    2: [
      "Partly cloudy",
      night
        ? "☁️"
        : "⛅"
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
      "Depositing rime fog",
      "🌫️"
    ],


    51: [
      "Light drizzle",
      "🌦️"
    ],


    53: [
      "Moderate drizzle",
      "🌦️"
    ],


    55: [
      "Dense drizzle",
      "🌧️"
    ],


    56: [
      "Light freezing drizzle",
      "🌧️"
    ],


    57: [
      "Dense freezing drizzle",
      "🌧️"
    ],


    61: [
      "Slight rain",
      "🌦️"
    ],


    63: [
      "Moderate rain",
      "🌧️"
    ],


    65: [
      "Heavy rain",
      "🌧️"
    ],


    66: [
      "Light freezing rain",
      "🌧️"
    ],


    67: [
      "Heavy freezing rain",
      "🌧️"
    ],


    71: [
      "Slight snowfall",
      "🌨️"
    ],


    73: [
      "Moderate snowfall",
      "🌨️"
    ],


    75: [
      "Heavy snowfall",
      "❄️"
    ],


    77: [
      "Snow grains",
      "❄️"
    ],


    80: [
      "Slight rain showers",
      "🌦️"
    ],


    81: [
      "Moderate rain showers",
      "🌧️"
    ],


    82: [
      "Violent rain showers",
      "⛈️"
    ],


    85: [
      "Slight snow showers",
      "🌨️"
    ],


    86: [
      "Heavy snow showers",
      "❄️"
    ],


    95: [
      "Thunderstorm",
      "⛈️"
    ],


    96: [
      "Thunderstorm with slight hail",
      "⛈️"
    ],


    99: [
      "Thunderstorm with heavy hail",
      "⛈️"
    ]
  };


  const result =
    map[Number(code)] ||
    [
      "Weather unavailable",
      "🌡️"
    ];


  return {
    label: result[0],
    icon: result[1]
  };
}


/*
==================================================
WIND DIRECTION
==================================================
*/

function compassDirection(
  degrees
) {

  if (
    !Number.isFinite(
      Number(degrees)
    )
  ) {
    return "--";
  }


  const labels = [
    "N",
    "NE",
    "E",
    "SE",
    "S",
    "SW",
    "W",
    "NW"
  ];


  const index =
    Math.round(
      (
        Number(degrees) %
        360
      ) / 45
    ) % 8;


  return (
    `${labels[index]} ` +
    `${Math.round(
      Number(degrees)
    )}°`
  );
}


/*
==================================================
VISIBILITY
==================================================
*/

function formatVisibility(
  meters
) {

  const value =
    Number(meters);


  if (
    !Number.isFinite(value)
  ) {

    return "-- km";
  }


  return (
    `${(
      value / 1000
    ).toFixed(
      value < 10000
        ? 1
        : 0
    )} km`
  );
}


/*
==================================================
LOCAL DATE / TIME FORMATTER
==================================================
*/

function formatLocalDateTime(
  value,
  options = {}
) {

  if (!value) {
    return "--";
  }


  const date =
    new Date(value);


  return new Intl.DateTimeFormat(
    "en-US",
    {
      timeZone:
        state.timezone,

      ...options
    }
  ).format(date);
}


/*
==================================================
FIND NEAREST HOURLY DATA
==================================================
*/

function nearestHourlyIndex(
  hourlyTimes
) {

  const now =
    Date.now();


  let bestIndex = 0;

  let bestDifference =
    Infinity;


  hourlyTimes.forEach(
    (
      time,
      index
    ) => {

      const difference =
        Math.abs(
          new Date(time)
            .getTime() -
          now
        );


      if (
        difference <
        bestDifference
      ) {

        bestDifference =
          difference;

        bestIndex =
          index;
      }
    }
  );


  return bestIndex;
}


/*
==================================================
LOAD WEATHER
==================================================
*/

async function loadWeather(
  latitude,
  longitude,
  locationName =
    "Current Location"
) {

  state.latitude =
    Number(latitude);

  state.longitude =
    Number(longitude);

  state.locationName =
    locationName;


  const locationElement =
    byId("locationText");

  if (locationElement) {

    locationElement.textContent =
      locationName;
  }


  const coordinateElement =
    byId("coordinateText");

  if (coordinateElement) {

    coordinateElement.textContent =
      `${state.latitude.toFixed(4)}, ` +
      `${state.longitude.toFixed(4)}`;
  }


  setStatus(
    "Loading current weather, forecasts, and recent history…"
  );


  const params =
    new URLSearchParams({

      latitude:
        state.latitude,

      longitude:
        state.longitude,


      current: [

        "temperature_2m",

        "apparent_temperature",

        "is_day",

        "precipitation",

        "rain",

        "showers",

        "weather_code",

        "cloud_cover",

        "pressure_msl",

        "surface_pressure",

        "wind_speed_10m",

        "wind_direction_10m",

        "wind_gusts_10m"

      ].join(","),


      hourly: [

        "temperature_2m",

        "apparent_temperature",

        "relative_humidity_2m",

        "dew_point_2m",

        "precipitation_probability",

        "precipitation",

        "rain",

        "showers",

        "weather_code",

        "cloud_cover",

        "visibility",

        "pressure_msl",

        "surface_pressure",

        "wind_speed_10m",

        "wind_direction_10m",

        "wind_gusts_10m",

        "is_day"

      ].join(","),


      daily: [

        "weather_code",

        "temperature_2m_max",

        "temperature_2m_min",

        "apparent_temperature_max",

        "apparent_temperature_min",

        "precipitation_sum",

        "precipitation_probability_max",

        "wind_speed_10m_max",

        "wind_gusts_10m_max",

        "sunrise",

        "sunset",

        "uv_index_max"

      ].join(","),


      timezone:
        "auto",


      /*
      ==============================================
      Past weather available to our page.

      User can choose:
      24 hours
      48 hours
      72 hours
      ==============================================
      */

      past_hours:
        "72",


      /*
      ==============================================
      Future hourly weather.

      168 hours = 7 days.
      ==============================================
      */

      forecast_hours:
        "168",


      forecast_days:
        "7"
    });


  try {

    const response =
      await fetch(
        `${WEATHER_API}?${params.toString()}`
      );


    if (!response.ok) {

      throw new Error(
        `Weather request failed (${response.status})`
      );
    }


    const data =
      await response.json();


    state.weatherData =
      data;


    state.timezone =
      data.timezone ||
      state.timezone;


    /*
    ==============================================
    UPDATE EVERY WEATHER SECTION
    ==============================================
    */

    renderCurrent(data);

    renderDaily(data);

    renderHourly(data);


    const historySelector =
      byId(
        "historyHoursSelect"
      );


    const selectedHistory =
      historySelector
        ? Number(
            historySelector.value
          )
        : 24;


    renderHistory(
      selectedHistory
    );


    renderPrecipitation(
      data
    );


    renderWind(
      data
    );


    await initializeOrMoveRadar();


    updateClock();


    setStatus(
      `Updated for ${locationName}.`
    );


  } catch (error) {

    console.error(
      "Weather error:",
      error
    );


    setStatus(
      "Unable to load weather data. Please try again."
    );
  }
}


/*
==================================================
CURRENT CONDITIONS
==================================================
*/

function renderCurrent(
  data
) {

  const current =
    data.current || {};


  const hourly =
    data.hourly || {};


  const hourlyIndex =
    nearestHourlyIndex(
      hourly.time || []
    );


  const info =
    weatherInfo(
      current.weather_code,
      current.is_day
    );


  const conditionElement =
    byId(
      "currentCondition"
    );


  if (conditionElement) {

    conditionElement.textContent =
      info.label;
  }


  const iconElement =
    byId(
      "currentWeatherIcon"
    );


  if (iconElement) {

    iconElement.textContent =
      info.icon;
  }


  const temperatureElement =
    byId(
      "currentTemperature"
    );


  if (temperatureElement) {

    temperatureElement.textContent =
      Number.isFinite(
        Number(
          current.temperature_2m
        )
      )

        ? `${Math.round(
            current.temperature_2m
          )}°`

        : "--°";
  }


  const feelsLikeElement =
    byId(
      "feelsLike"
    );


  if (feelsLikeElement) {

    feelsLikeElement.textContent =
      Number.isFinite(
        Number(
          current.apparent_temperature
        )
      )

        ? `Feels like ${Math.round(
            current.apparent_temperature
          )}°`

        : "Feels like --°";
  }


  const observationElement =
    byId(
      "observationTime"
    );


  if (observationElement) {

    observationElement.textContent =
      current.time

        ? `Weather time: ${formatLocalDateTime(
            current.time,
            {
              hour:
                "2-digit",

              minute:
                "2-digit"
            }
          )}`

        : "Updated recently";
  }


  const humidity =
    Math.round(
      hourly
        .relative_humidity_2m
        ?.[hourlyIndex] ??
      0
    );


  const windSpeed =
    Math.round(
      current
        .wind_speed_10m ??
      0
    );


  const precipitation =
    Number(
      current
        .precipitation ??
      0
    );


  const summaryElement =
    byId(
      "weatherSummary"
    );


  if (summaryElement) {

    summaryElement.textContent =

      `${info.label}. ` +

      `Humidity ${humidity}%, ` +

      `wind ${windSpeed} km/h ` +

      `${compassDirection(
        current.wind_direction_10m
      )}, ` +

      `with ${precipitation.toFixed(1)} mm ` +

      `precipitation at the current weather timestep.`;
  }


  const humidityElement =
    byId(
      "humidityValue"
    );


  if (humidityElement) {

    humidityElement.textContent =
      `${humidity}%`;
  }


  const visibilityElement =
    byId(
      "visibilityValue"
    );


  if (visibilityElement) {

    visibilityElement.textContent =
      formatVisibility(
        hourly
          .visibility
          ?.[hourlyIndex]
      );
  }


  const cloudElement =
    byId(
      "cloudValue"
    );


  if (cloudElement) {

    cloudElement.textContent =
      `${Math.round(
        current.cloud_cover ??
        hourly
          .cloud_cover
          ?.[hourlyIndex] ??
        0
      )}%`;
  }


  const pressureElement =
    byId(
      "pressureValue"
    );


  if (pressureElement) {

    pressureElement.textContent =
      `${Math.round(
        current.pressure_msl ??
        hourly
          .pressure_msl
          ?.[hourlyIndex] ??
        0
      )} hPa`;
  }


  const precipElement =
    byId(
      "currentPrecipValue"
    );


  if (precipElement) {

    precipElement.textContent =
      `${precipitation.toFixed(
        1
      )} mm`;
  }


  const windElement =
    byId(
      "currentWindValue"
    );


  if (windElement) {

    windElement.textContent =
      `${windSpeed} km/h`;
  }


  const gustElement =
    byId(
      "currentGustValue"
    );


  if (gustElement) {

    gustElement.textContent =
      `${Math.round(
        current
          .wind_gusts_10m ??
        0
      )} km/h`;
  }


  const directionElement =
    byId(
      "windDirectionValue"
    );


  if (directionElement) {

    directionElement.textContent =
      compassDirection(
        current
          .wind_direction_10m
      );
  }
}