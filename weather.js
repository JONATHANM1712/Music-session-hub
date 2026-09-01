/* ==================================================
   MUSIC SESSION WEATHER
   weather.js

   FEATURES:
   - Live Weather
   - Browser Geolocation
   - City Search
   - 7-Day Forecast
   - 24-Hour Forecast
   - 24 / 48 / 72-Hour History
   - Precipitation Charts
   - Wind Charts
   - RainViewer Radar
   - 24-Hour Clock
   - Full Date Format
   - Dynamic Greeting + Emoji
   ================================================== */


/* ==================================================
   STATE
   ================================================== */

const state = {

  latitude: null,

  longitude: null,

  locationName:
    "Current Location",

  timezone:
    Intl.DateTimeFormat()
      .resolvedOptions()
      .timeZone,

  weatherData:
    null,

  radarFrames:
    [],

  radarLayer:
    null,

  radarMap:
    null,

  radarMarker:
    null,

  radarPlayTimer:
    null,

  radarHost:
    null,

  historyChart:
    null,

  precipitationChart:
    null,

  windChart:
    null
};


/* ==================================================
   API ENDPOINTS

   These work directly from GitHub Pages.

   No Spring Boot.
   No Controller.
   No API key.
   ================================================== */

const WEATHER_API =
  "https://api.open-meteo.com/v1/forecast";

const GEOCODING_API =
  "https://geocoding-api.open-meteo.com/v1/search";

const RAINVIEWER_API =
  "https://api.rainviewer.com/public/weather-maps.json";


/* ==================================================
   HELPERS
   ================================================== */

function byId(id) {

  return document.getElementById(
    id
  );
}


function setStatus(message) {

  const element =
    byId(
      "statusMessage"
    );


  if (
    element
  ) {

    element.textContent =
      message;
  }
}


/* ==================================================
   LIVE CLOCK
   ================================================== */

function updateClock() {

  const now =
    new Date();


  let hour24;

  let formattedTime;

  let formattedDate;


  try {

    /*
    ================================================
    DETERMINE HOUR USING WEATHER LOCATION TIMEZONE
    ================================================
    */

    const timeParts =
      new Intl.DateTimeFormat(
        "en-GB",
        {

          timeZone:
            state.timezone,

          hour:
            "2-digit",

          minute:
            "2-digit",

          second:
            "2-digit",

          hourCycle:
            "h23"

        }
      ).formatToParts(
        now
      );


    const hourPart =
      timeParts.find(
        part =>
          part.type ===
          "hour"
      );


    hour24 =
      Number(
        hourPart?.value ?? 0
      );


    /*
    ================================================
    24-HOUR CLOCK

    Example:
    16:51:48
    ================================================
    */

    formattedTime =
      new Intl.DateTimeFormat(
        "en-GB",
        {

          timeZone:
            state.timezone,

          hour:
            "2-digit",

          minute:
            "2-digit",

          second:
            "2-digit",

          hourCycle:
            "h23"

        }
      ).format(
        now
      );


    /*
    ================================================
    FULL DATE

    Example:
    1 September 2026
    ================================================
    */

    formattedDate =
      new Intl.DateTimeFormat(
        "en-GB",
        {

          timeZone:
            state.timezone,

          day:
            "numeric",

          month:
            "long",

          year:
            "numeric"

        }
      ).format(
        now
      );

  } catch (
    error
  ) {

    /*
    ================================================
    FALLBACK TO BROWSER TIMEZONE
    ================================================
    */

    state.timezone =
      Intl.DateTimeFormat()
        .resolvedOptions()
        .timeZone;


    hour24 =
      now.getHours();


    formattedTime =
      new Intl.DateTimeFormat(
        "en-GB",
        {

          hour:
            "2-digit",

          minute:
            "2-digit",

          second:
            "2-digit",

          hourCycle:
            "h23"

        }
      ).format(
        now
      );


    formattedDate =
      new Intl.DateTimeFormat(
        "en-GB",
        {

          day:
            "numeric",

          month:
            "long",

          year:
            "numeric"

        }
      ).format(
        now
      );
  }


  /* ==================================================
     DYNAMIC GREETING + EMOJI

     05:00 - 11:59
     🌅 Good Morning!

     12:00 - 17:59
     ☀️ Good Afternoon!

     18:00 - 04:59
     🌙 Good Evening!
     ================================================== */

  let greeting =
    "🌙 Good Evening!";


  if (
    hour24 >= 5 &&
    hour24 < 12
  ) {

    greeting =
      "🌅 Good Morning!";

  } else if (
    hour24 >= 12 &&
    hour24 < 18
  ) {

    greeting =
      "☀️ Good Afternoon!";
  }


  const greetingElement =
    byId(
      "greetingText"
    );


  if (
    greetingElement
  ) {

    greetingElement.textContent =
      greeting;
  }


  const timeElement =
    byId(
      "timeText"
    );


  if (
    timeElement
  ) {

    timeElement.textContent =
      formattedTime;
  }


  const dateElement =
    byId(
      "dateText"
    );


  if (
    dateElement
  ) {

    dateElement.textContent =
      formattedDate;
  }


  const timezoneElement =
    byId(
      "timezoneText"
    );


  if (
    timezoneElement
  ) {

    timezoneElement.textContent =
      state.timezone ||
      "Local time";
  }
}


/* ==================================================
   WEATHER CODE TRANSLATOR
   ================================================== */

function weatherInfo(
  code,
  isDay = 1
) {

  const night =
    Number(
      isDay
    ) === 0;


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
    map[
      Number(
        code
      )
    ] ||
    [
      "Weather unavailable",
      "🌡️"
    ];


  return {

    label:
      result[0],

    icon:
      result[1]

  };
}


/* ==================================================
   WIND DIRECTION
   ================================================== */

function compassDirection(
  degrees
) {

  if (
    !Number.isFinite(
      Number(
        degrees
      )
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
        Number(
          degrees
        ) %
        360
      ) /
      45
    ) %
    8;


  return (
    `${labels[index]} ` +
    `${Math.round(
      Number(
        degrees
      )
    )}°`
  );
}


/* ==================================================
   VISIBILITY
   ================================================== */

function formatVisibility(
  meters
) {

  const value =
    Number(
      meters
    );


  if (
    !Number.isFinite(
      value
    )
  ) {

    return "-- km";
  }


  return (
    `${(
      value /
      1000
    ).toFixed(
      value < 10000
        ? 1
        : 0
    )} km`
  );
}


/* ==================================================
   LOCAL DATE / TIME FORMATTER

   Uses 24-hour formatting.
   ================================================== */

function formatLocalDateTime(
  value,
  options = {}
) {

  if (
    !value
  ) {

    return "--";
  }


  const date =
    new Date(
      value
    );


  return new Intl.DateTimeFormat(
    "en-GB",
    {

      timeZone:
        state.timezone,

      ...options

    }
  ).format(
    date
  );
}


/* ==================================================
   FIND NEAREST HOURLY DATA
   ================================================== */

function nearestHourlyIndex(
  hourlyTimes
) {

  const now =
    Date.now();


  let bestIndex =
    0;


  let bestDifference =
    Infinity;


  hourlyTimes.forEach(
    (
      time,
      index
    ) => {

      const difference =
        Math.abs(
          new Date(
            time
          ).getTime() -
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


/* ==================================================
   LOAD WEATHER
   ================================================== */

async function loadWeather(
  latitude,
  longitude,
  locationName =
    "Current Location"
) {

  state.latitude =
    Number(
      latitude
    );


  state.longitude =
    Number(
      longitude
    );


  state.locationName =
    locationName;


  const locationElement =
    byId(
      "locationText"
    );


  if (
    locationElement
  ) {

    locationElement.textContent =
      locationName;
  }


  const coordinateElement =
    byId(
      "coordinateText"
    );


  if (
    coordinateElement
  ) {

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


      past_hours:
        "72",


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


    if (
      !response.ok
    ) {

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


    renderCurrent(
      data
    );


    renderDaily(
      data
    );


    renderHourly(
      data
    );


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


    /*
    ================================================
    UPDATE CLOCK AGAIN AFTER OPEN-METEO PROVIDES
    THE LOCATION TIMEZONE
    ================================================
    */

    updateClock();


    setStatus(
      `Updated for ${locationName}.`
    );

  } catch (
    error
  ) {

    console.error(
      "Weather error:",
      error
    );


    setStatus(
      "Unable to load weather data. Please try again."
    );
  }
}


/* ==================================================
   CURRENT CONDITIONS
   ================================================== */

function renderCurrent(
  data
) {

  const current =
    data.current ||
    {};


  const hourly =
    data.hourly ||
    {};


  const hourlyIndex =
    nearestHourlyIndex(
      hourly.time ||
      []
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


  if (
    conditionElement
  ) {

    conditionElement.textContent =
      info.label;
  }


  const iconElement =
    byId(
      "currentWeatherIcon"
    );


  if (
    iconElement
  ) {

    iconElement.textContent =
      info.icon;
  }


  const temperatureElement =
    byId(
      "currentTemperature"
    );


  if (
    temperatureElement
  ) {

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


  if (
    feelsLikeElement
  ) {

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


  if (
    observationElement
  ) {

    observationElement.textContent =
      current.time

        ? `Weather time: ${formatLocalDateTime(
            current.time,
            {

              hour:
                "2-digit",

              minute:
                "2-digit",

              hourCycle:
                "h23"

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


  if (
    summaryElement
  ) {

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


  if (
    humidityElement
  ) {

    humidityElement.textContent =
      `${humidity}%`;
  }


  const visibilityElement =
    byId(
      "visibilityValue"
    );


  if (
    visibilityElement
  ) {

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


  if (
    cloudElement
  ) {

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


  if (
    pressureElement
  ) {

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


  if (
    precipElement
  ) {

    precipElement.textContent =
      `${precipitation.toFixed(
        1
      )} mm`;
  }


  const windElement =
    byId(
      "currentWindValue"
    );


  if (
    windElement
  ) {

    windElement.textContent =
      `${windSpeed} km/h`;
  }


  const gustElement =
    byId(
      "currentGustValue"
    );


  if (
    gustElement
  ) {

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


  if (
    directionElement
  ) {

    directionElement.textContent =
      compassDirection(
        current
          .wind_direction_10m
      );
  }
}


/* ==================================================
   DAILY FORECAST
   ================================================== */

function renderDaily(
  data
) {

  const daily =
    data.daily ||
    {};


  const container =
    byId(
      "dailyForecast"
    );


  if (
    !container
  ) {

    return;
  }


  container.innerHTML =
    "";


  (
    daily.time ||
    []
  ).forEach(
    (
      time,
      index
    ) => {

      const info =
        weatherInfo(
          daily
            .weather_code
            ?.[index],
          1
        );


      const card =
        document.createElement(
          "article"
        );


      card.className =
        "day-card";


      card.innerHTML =
        `
          <div class="day-name">
            ${formatLocalDateTime(
              time,
              {
                weekday:
                  "short"
              }
            )}
          </div>

          <div class="day-date">
            ${formatLocalDateTime(
              time,
              {
                day:
                  "numeric",
                month:
                  "short"
              }
            )}
          </div>

          <div
            class="day-icon"
            aria-hidden="true"
          >
            ${info.icon}
          </div>

          <div class="day-temp">
            ${Math.round(
              daily
                .temperature_2m_max
                ?.[index]
            )}°
            /
            ${Math.round(
              daily
                .temperature_2m_min
                ?.[index]
            )}°
          </div>

          <div class="day-details">

            ${info.label}
            <br>

            Rain:
            ${Math.round(
              daily
                .precipitation_probability_max
                ?.[index] ??
              0
            )}%

            •
            ${Number(
              daily
                .precipitation_sum
                ?.[index] ??
              0
            ).toFixed(1)}
            mm

            <br>

            Wind:
            ${Math.round(
              daily
                .wind_speed_10m_max
                ?.[index] ??
              0
            )}
            km/h

            <br>

            Gust:
            ${Math.round(
              daily
                .wind_gusts_10m_max
                ?.[index] ??
              0
            )}
            km/h

            <br>

            UV max:
            ${Number(
              daily
                .uv_index_max
                ?.[index] ??
              0
            ).toFixed(1)}

            <br>

            ↑
            ${formatLocalDateTime(
              daily
                .sunrise
                ?.[index],
              {
                hour:
                  "2-digit",

                minute:
                  "2-digit",

                hourCycle:
                  "h23"
              }
            )}

            <br>

            ↓
            ${formatLocalDateTime(
              daily
                .sunset
                ?.[index],
              {
                hour:
                  "2-digit",

                minute:
                  "2-digit",

                hourCycle:
                  "h23"
              }
            )}

          </div>
        `;


      container.appendChild(
        card
      );
    }
  );
}


/* ==================================================
   FUTURE HOURLY INDEXES
   ================================================== */

function futureHourlyIndexes(
  data,
  count = 24
) {

  const times =
    data.hourly?.time ||
    [];


  const now =
    Date.now();


  const start =
    times.findIndex(
      time =>
        new Date(
          time
        ).getTime() >=
        now -
        30 *
        60 *
        1000
    );


  const actualStart =
    start >= 0

      ? start

      : Math.max(
          0,
          times.length -
          count
        );


  return Array.from(

    {
      length:
        Math.min(
          count,
          times.length -
          actualStart
        )
    },

    (
      _,
      offset
    ) =>
      actualStart +
      offset

  );
}


/* ==================================================
   HOURLY FORECAST
   ================================================== */

function renderHourly(
  data
) {

  const hourly =
    data.hourly ||
    {};


  const indexes =
    futureHourlyIndexes(
      data,
      24
    );


  const container =
    byId(
      "hourlyForecast"
    );


  if (
    !container
  ) {

    return;
  }


  container.innerHTML =
    "";


  indexes.forEach(
    index => {

      const info =
        weatherInfo(

          hourly
            .weather_code
            ?.[index],

          hourly
            .is_day
            ?.[index]

        );


      const card =
        document.createElement(
          "article"
        );


      card.className =
        "hour-card";


      card.innerHTML =
        `
          <div class="hour-time">

            ${formatLocalDateTime(
              hourly
                .time
                ?.[index],
              {

                hour:
                  "2-digit",

                hourCycle:
                  "h23"

              }
            )}

          </div>

          <div
            class="hour-icon"
            aria-hidden="true"
          >
            ${info.icon}
          </div>

          <div class="hour-temp">

            ${Math.round(
              hourly
                .temperature_2m
                ?.[index]
            )}°

          </div>

          <div class="hour-sub">

            ${info.label}

            <br>

            Rain
            ${Math.round(
              hourly
                .precipitation_probability
                ?.[index] ??
              0
            )}%

            <br>

            ${Number(
              hourly
                .precipitation
                ?.[index] ??
              0
            ).toFixed(1)}
            mm

            <br>

            Wind
            ${Math.round(
              hourly
                .wind_speed_10m
                ?.[index] ??
              0
            )}
            km/h

          </div>
        `;


      container.appendChild(
        card
      );
    }
  );
}


/* ==================================================
   CHART HELPERS
   ================================================== */

function destroyChart(
  chart
) {

  if (
    chart
  ) {

    chart.destroy();
  }
}


function chartTextColor() {

  return (
    "rgba(255,255,255,0.78)"
  );
}


function chartGridColor() {

  return (
    "rgba(255,255,255,0.10)"
  );
}


function commonChartOptions() {

  return {

    responsive:
      true,

    maintainAspectRatio:
      false,


    interaction: {

      mode:
        "index",

      intersect:
        false
    },


    plugins: {

      legend: {

        labels: {

          color:
            chartTextColor(),

          font: {

            family:
              "Rubik, Arial, sans-serif",

            weight:
              "700"
          }
        }
      }
    },


    scales: {

      x: {

        ticks: {

          color:
            chartTextColor(),

          maxRotation:
            0,

          autoSkip:
            true,

          maxTicksLimit:
            12
        },


        grid: {

          color:
            chartGridColor()
        }
      },


      y: {

        ticks: {

          color:
            chartTextColor()
        },


        grid: {

          color:
            chartGridColor()
        }
      }
    }
  };
}


/* ==================================================
   WEATHER HISTORY
   ================================================== */

function renderHistory(
  hours
) {

  const data =
    state.weatherData;


  if (
    !data?.hourly
  ) {

    return;
  }


  const hourly =
    data.hourly;


  const now =
    Date.now();


  const indexes =
    (
      hourly.time ||
      []
    )

      .map(
        (
          time,
          index
        ) => ({

          time:
            new Date(
              time
            ).getTime(),

          index:
            index

        })
      )

      .filter(
        item =>
          item.time <=
            now &&
          item.time >=
            now -
            hours *
            60 *
            60 *
            1000
      )

      .map(
        item =>
          item.index
      );


  const labels =
    indexes.map(
      index =>
        formatLocalDateTime(
          hourly
            .time[index],
          {

            month:
              "short",

            day:
              "numeric",

            hour:
              "2-digit",

            hourCycle:
              "h23"

          }
        )
    );


  destroyChart(
    state.historyChart
  );


  state.historyChart =
    new Chart(

      byId(
        "historyTemperatureChart"
      ),

      {

        type:
          "line",


        data: {

          labels:
            labels,


          datasets: [

            {

              label:
                "Temperature °C",

              data:
                indexes.map(
                  index =>
                    hourly
                      .temperature_2m
                      ?.[index]
                )
            },


            {

              label:
                "Feels Like °C",

              data:
                indexes.map(
                  index =>
                    hourly
                      .apparent_temperature
                      ?.[index]
                )
            }

          ]
        },


        options:
          commonChartOptions()

      }
    );


  const tbody =
    byId(
      "historyTableBody"
    );


  if (
    !tbody
  ) {

    return;
  }


  tbody.innerHTML =
    "";


  [
    ...indexes
  ]
    .reverse()
    .forEach(
      index => {

        const info =
          weatherInfo(

            hourly
              .weather_code
              ?.[index],

            hourly
              .is_day
              ?.[index]

          );


        const row =
          document.createElement(
            "tr"
          );


        row.innerHTML =
          `
            <td>

              ${formatLocalDateTime(
                hourly
                  .time
                  ?.[index],
                {

                  day:
                    "numeric",

                  month:
                    "short",

                  hour:
                    "2-digit",

                  minute:
                    "2-digit",

                  hourCycle:
                    "h23"

                }
              )}

            </td>


            <td>

              ${info.icon}
              ${info.label}

            </td>


            <td>

              ${Math.round(
                hourly
                  .temperature_2m
                  ?.[index]
              )}°C

            </td>


            <td>

              ${Math.round(
                hourly
                  .apparent_temperature
                  ?.[index]
              )}°C

            </td>


            <td>

              ${Math.round(
                hourly
                  .relative_humidity_2m
                  ?.[index] ??
                0
              )}%

            </td>


            <td>

              ${Number(
                hourly
                  .precipitation
                  ?.[index] ??
                0
              ).toFixed(1)}
              mm

            </td>


            <td>

              ${Math.round(
                hourly
                  .wind_speed_10m
                  ?.[index] ??
                0
              )}
              km/h

              ${compassDirection(
                hourly
                  .wind_direction_10m
                  ?.[index]
              )}

            </td>


            <td>

              ${Math.round(
                hourly
                  .wind_gusts_10m
                  ?.[index] ??
                0
              )}
              km/h

            </td>
          `;


        tbody.appendChild(
          row
        );
      }
    );
}


/* ==================================================
   PRECIPITATION
   ================================================== */

function renderPrecipitation(
  data
) {

  const hourly =
    data.hourly ||
    {};


  const indexes =
    futureHourlyIndexes(
      data,
      24
    );


  const probabilities =
    indexes.map(
      index =>
        Number(
          hourly
            .precipitation_probability
            ?.[index] ??
          0
        )
    );


  const precipitation =
    indexes.map(
      index =>
        Number(
          hourly
            .precipitation
            ?.[index] ??
          0
        )
    );


  const maxRainChance =
    byId(
      "maxRainChance"
    );


  if (
    maxRainChance
  ) {

    maxRainChance.textContent =
      `${Math.round(
        Math.max(
          0,
          ...probabilities
        )
      )}%`;
  }


  const next24Precip =
    byId(
      "next24Precip"
    );


  if (
    next24Precip
  ) {

    next24Precip.textContent =
      `${precipitation
        .reduce(
          (
            sum,
            value
          ) =>
            sum +
            value,
          0
        )
        .toFixed(
          1
        )} mm`;
  }


  destroyChart(
    state.precipitationChart
  );


  state.precipitationChart =
    new Chart(

      byId(
        "precipitationChart"
      ),

      {

        type:
          "bar",


        data: {

          labels:
            indexes.map(
              index =>
                formatLocalDateTime(
                  hourly
                    .time
                    ?.[index],
                  {

                    hour:
                      "2-digit",

                    hourCycle:
                      "h23"

                  }
                )
            ),


          datasets: [

            {

              label:
                "Precipitation mm",

              data:
                precipitation,

              yAxisID:
                "y"

            },


            {

              type:
                "line",

              label:
                "Probability %",

              data:
                probabilities,

              yAxisID:
                "y1"

            }

          ]
        },


        options: {

          ...commonChartOptions(),


          scales: {

            x: {

              ticks: {

                color:
                  chartTextColor(),

                autoSkip:
                  true,

                maxTicksLimit:
                  12
              },


              grid: {

                color:
                  chartGridColor()
              }
            },


            y: {

              beginAtZero:
                true,

              position:
                "left",

              ticks: {

                color:
                  chartTextColor()
              },


              grid: {

                color:
                  chartGridColor()
              },


              title: {

                display:
                  true,

                text:
                  "mm",

                color:
                  chartTextColor()
              }
            },


            y1: {

              beginAtZero:
                true,

              suggestedMax:
                100,

              position:
                "right",


              ticks: {

                color:
                  chartTextColor(),

                callback:
                  value =>
                    `${value}%`
              },


              grid: {

                drawOnChartArea:
                  false
              }
            }
          }
        }
      }
    );
}


/* ==================================================
   WIND
   ================================================== */

function renderWind(
  data
) {

  const hourly =
    data.hourly ||
    {};


  const indexes =
    futureHourlyIndexes(
      data,
      24
    );


  const wind =
    indexes.map(
      index =>
        Number(
          hourly
            .wind_speed_10m
            ?.[index] ??
          0
        )
    );


  const gusts =
    indexes.map(
      index =>
        Number(
          hourly
            .wind_gusts_10m
            ?.[index] ??
          0
        )
    );


  const peakWind =
    byId(
      "peakWind"
    );


  if (
    peakWind
  ) {

    peakWind.textContent =
      `${Math.round(
        Math.max(
          0,
          ...wind
        )
      )} km/h`;
  }


  const peakGust =
    byId(
      "peakGust"
    );


  if (
    peakGust
  ) {

    peakGust.textContent =
      `${Math.round(
        Math.max(
          0,
          ...gusts
        )
      )} km/h`;
  }


  destroyChart(
    state.windChart
  );


  state.windChart =
    new Chart(

      byId(
        "windChart"
      ),

      {

        type:
          "line",


        data: {

          labels:
            indexes.map(
              index =>
                formatLocalDateTime(
                  hourly
                    .time
                    ?.[index],
                  {

                    hour:
                      "2-digit",

                    hourCycle:
                      "h23"

                  }
                )
            ),


          datasets: [

            {

              label:
                "Wind km/h",

              data:
                wind

            },


            {

              label:
                "Gust km/h",

              data:
                gusts

            }

          ]
        },


        options:
          commonChartOptions()
      }
    );
}


/* ==================================================
   RADAR MAP
   ================================================== */

function initializeMap() {

  if (
    state.radarMap
  ) {

    return;
  }


  state.radarMap =
    L.map(
      "radarMap",
      {

        zoomControl:
          true,

        minZoom:
          2,

        maxZoom:
          12

      }
    ).setView(
      [
        0,
        0
      ],
      3
    );


  L.tileLayer(

    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",

    {

      maxZoom:
        19,

      attribution:
        "&copy; OpenStreetMap contributors"

    }

  ).addTo(
    state.radarMap
  );
}


/* ==================================================
   LOAD / MOVE RADAR
   ================================================== */

async function initializeOrMoveRadar() {

  initializeMap();


  if (
    Number.isFinite(
      state.latitude
    ) &&
    Number.isFinite(
      state.longitude
    )
  ) {

    state.radarMap.setView(

      [
        state.latitude,
        state.longitude
      ],

      7
    );


    if (
      state.radarMarker
    ) {

      state.radarMarker.setLatLng(

        [
          state.latitude,
          state.longitude
        ]

      );

    } else {

      state.radarMarker =
        L.marker(

          [
            state.latitude,
            state.longitude
          ]

        )
          .addTo(
            state.radarMap
          )
          .bindPopup(
            "Selected weather location"
          );
    }
  }


  try {

    const response =
      await fetch(
        RAINVIEWER_API
      );


    if (
      !response.ok
    ) {

      throw new Error(
        "Radar feed unavailable"
      );
    }


    const metadata =
      await response.json();


    state.radarFrames =
      metadata.radar?.past ||
      [];


    if (
      !state.radarFrames.length
    ) {

      const timestamp =
        byId(
          "radarTimestamp"
        );


      if (
        timestamp
      ) {

        timestamp.textContent =
          "No radar frames available";
      }


      return;
    }


    const slider =
      byId(
        "radarFrameSlider"
      );


    if (
      slider
    ) {

      slider.min =
        "0";


      slider.max =
        String(
          state.radarFrames.length -
          1
        );


      slider.value =
        String(
          state.radarFrames.length -
          1
        );
    }


    state.radarHost =
      metadata.host;


    renderRadarFrame(

      Number(
        slider?.value ??
        0
      ),

      metadata.host

    );

  } catch (
    error
  ) {

    console.error(
      "Radar error:",
      error
    );


    const timestamp =
      byId(
        "radarTimestamp"
      );


    if (
      timestamp
    ) {

      timestamp.textContent =
        "Radar temporarily unavailable";
    }
  }
}


/* ==================================================
   RENDER RADAR FRAME
   ================================================== */

function renderRadarFrame(
  index,
  host =
    state.radarHost
) {

  const frame =
    state.radarFrames[
      index
    ];


  if (
    !frame ||
    !host ||
    !state.radarMap
  ) {

    return;
  }


  if (
    state.radarLayer
  ) {

    state.radarMap.removeLayer(
      state.radarLayer
    );
  }


  state.radarLayer =
    L.tileLayer(

      `${host}${frame.path}/256/{z}/{x}/{y}/2/1_1.png`,

      {

        opacity:
          0.72,

        zIndex:
          10,

        maxNativeZoom:
          7,

        maxZoom:
          12,

        attribution:
          "Radar &copy; RainViewer"

      }

    ).addTo(
      state.radarMap
    );


  const timestamp =
    byId(
      "radarTimestamp"
    );


  if (
    timestamp
  ) {

    timestamp.textContent =
      new Intl.DateTimeFormat(
        "en-GB",
        {

          timeZone:
            state.timezone,

          weekday:
            "short",

          day:
            "numeric",

          month:
            "short",

          hour:
            "2-digit",

          minute:
            "2-digit",

          hourCycle:
            "h23"

        }
      ).format(
        new Date(
          frame.time *
          1000
        )
      );
  }
}


/* ==================================================
   RADAR PLAYBACK
   ================================================== */

function toggleRadarPlayback() {

  const button =
    byId(
      "radarPlayButton"
    );


  const slider =
    byId(
      "radarFrameSlider"
    );


  if (
    !button ||
    !slider
  ) {

    return;
  }


  if (
    state.radarPlayTimer
  ) {

    clearInterval(
      state.radarPlayTimer
    );


    state.radarPlayTimer =
      null;


    button.textContent =
      "▶ Play Radar";


    return;
  }


  if (
    !state.radarFrames.length
  ) {

    return;
  }


  button.textContent =
    "■ Stop Radar";


  state.radarPlayTimer =
    setInterval(
      () => {

        let next =
          Number(
            slider.value
          ) +
          1;


        if (
          next >
          Number(
            slider.max
          )
        ) {

          next =
            0;
        }


        slider.value =
          String(
            next
          );


        renderRadarFrame(
          next
        );

      },

      650
    );
}


/* ==================================================
   CITY SEARCH
   ================================================== */

async function searchCity(
  query
) {

  const searchResults =
    byId(
      "searchResults"
    );


  if (
    !searchResults
  ) {

    return;
  }


  if (
    !query.trim()
  ) {

    searchResults.hidden =
      true;


    return;
  }


  setStatus(
    `Searching for “${query}”…`
  );


  try {

    const params =
      new URLSearchParams({

        name:
          query.trim(),

        count:
          "6",

        language:
          "en",

        format:
          "json"

      });


    const response =
      await fetch(

        `${GEOCODING_API}?${params.toString()}`

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


    searchResults.innerHTML =
      "";


    if (
      !results.length
    ) {

      searchResults.hidden =
        false;


      searchResults.innerHTML =
        `
          <div class="search-result-button">
            No matching places found.
          </div>
        `;


      setStatus(
        "No matching places found."
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


        button.innerHTML =
          `
            <span>

              <strong>
                ${result.name}
              </strong>

              <br>

              <small>
                ${details}
              </small>

            </span>

            <small>

              ${result.latitude.toFixed(2)},
              ${result.longitude.toFixed(2)}

            </small>
          `;


        button.addEventListener(
          "click",
          () => {

            searchResults.hidden =
              true;


            const searchInput =
              byId(
                "citySearchInput"
              );


            if (
              searchInput
            ) {

              searchInput.value =
                result.name;
            }


            const label =
              details

                ? `${result.name}, ${details}`

                : result.name;


            loadWeather(

              result.latitude,

              result.longitude,

              label

            );
          }
        );


        searchResults.appendChild(
          button
        );

      }
    );


    searchResults.hidden =
      false;


    setStatus(
      "Choose a place from the search results."
    );

  } catch (
    error
  ) {

    console.error(
      "City search error:",
      error
    );


    setStatus(
      "City search is temporarily unavailable."
    );
  }
}


/* ==================================================
   BROWSER LOCATION
   ================================================== */

function useBrowserLocation() {

  if (
    !navigator.geolocation
  ) {

    setStatus(
      "This browser does not support geolocation. Search for a city instead."
    );


    return;
  }


  setStatus(
    "Requesting your device location…"
  );


  navigator.geolocation.getCurrentPosition(

    position => {

      loadWeather(

        position.coords.latitude,

        position.coords.longitude,

        "My Current Location"

      );

    },


    error => {

      console.warn(
        "Geolocation error:",
        error
      );


      setStatus(
        "Location permission was not granted. Search for a city instead."
      );

    },


    {

      enableHighAccuracy:
        true,

      timeout:
        12000,

      maximumAge:
        5 *
        60 *
        1000

    }

  );
}


/* ==================================================
   INITIALIZE EVENTS
   ================================================== */

function initializeEvents() {

  const useLocationButton =
    byId(
      "useLocationButton"
    );


  if (
    useLocationButton
  ) {

    useLocationButton.addEventListener(

      "click",

      useBrowserLocation

    );
  }


  const citySearchForm =
    byId(
      "citySearchForm"
    );


  if (
    citySearchForm
  ) {

    citySearchForm.addEventListener(
      "submit",
      event => {

        event.preventDefault();


        const input =
          byId(
            "citySearchInput"
          );


        searchCity(
          input?.value ||
          ""
        );

      }
    );
  }


  const historyHoursSelect =
    byId(
      "historyHoursSelect"
    );


  if (
    historyHoursSelect
  ) {

    historyHoursSelect.addEventListener(
      "change",
      event => {

        renderHistory(
          Number(
            event.target.value
          )
        );

      }
    );
  }


  const radarFrameSlider =
    byId(
      "radarFrameSlider"
    );


  if (
    radarFrameSlider
  ) {

    radarFrameSlider.addEventListener(
      "input",
      event => {

        renderRadarFrame(
          Number(
            event.target.value
          )
        );

      }
    );
  }


  const radarPlayButton =
    byId(
      "radarPlayButton"
    );


  if (
    radarPlayButton
  ) {

    radarPlayButton.addEventListener(

      "click",

      toggleRadarPlayback

    );
  }
}


/* ==================================================
   PAGE INITIALIZATION
   ================================================== */

document.addEventListener(
  "DOMContentLoaded",
  () => {


    /* ==================================================
       START CLOCK IMMEDIATELY

       Example:

       ☀️ Good Afternoon!
       16:51:48
       1 September 2026
       ================================================== */

    updateClock();


    setInterval(
      updateClock,
      1000
    );


    /* ==================================================
       EVENTS
       ================================================== */

    initializeEvents();


    /* ==================================================
       RADAR MAP
       ================================================== */

    initializeMap();


    /* ==================================================
       REQUEST CURRENT LOCATION

       GitHub Pages uses HTTPS, so browser
       geolocation can work after permission.

       If permission is denied, city search
       remains available.
       ================================================== */

    useBrowserLocation();

  }
);
