/* ==================================================
   MUSIC SESSION DASHBOARD
   script.js

   FEATURES:
   - Resource Viewer
   - Local Storage
   - Smooth Scrolling
   - Live 24-Hour Clock
   - DD/MM/YY Date
   - Dynamic Greeting + Emoji
   - Live Dashboard Weather
   - Browser Geolocation
   ================================================== */


/* ==================================================
   PAGE STORAGE KEY
   ================================================== */

function pageKey() {

  return (
    "musicSessionChartFlow_" +
    (
      document.body.dataset.page ||
      "default"
    )
  );
}


/* ==================================================
   ACTIVE RESOURCE STORAGE KEY
   ================================================== */

function activeResourceKey() {

  return (
    "musicSessionActiveResource"
  );
}


/* ==================================================
   SAVE
   ================================================== */

function saveAll() {

  const data = {};


  document
    .querySelectorAll(
      "[data-save]"
    )
    .forEach(
      element => {

        if (
          element.id
        ) {

          data[
            element.id
          ] =
            element.value;
        }
      }
    );


  localStorage.setItem(

    pageKey(),

    JSON.stringify(
      data
    )

  );
}


/* ==================================================
   LOAD
   ================================================== */

function loadAll() {

  const saved =
    localStorage.getItem(
      pageKey()
    );


  if (
    saved
  ) {

    try {

      const data =
        JSON.parse(
          saved
        );


      Object
        .keys(
          data
        )
        .forEach(
          id => {

            const element =
              document.getElementById(
                id
              );


            if (
              element
            ) {

              element.value =
                data[
                  id
                ];
            }
          }
        );

    } catch (
      error
    ) {

      console.error(
        "Unable to load saved Music Session data:",
        error
      );
    }
  }


  applyColors();
}


/* ==================================================
   APPLY COLORS
   ================================================== */

function applyColors() {

  document
    .querySelectorAll(
      "[data-color-target]"
    )
    .forEach(
      picker => {

        const targetId =
          picker.dataset.colorTarget;


        const target =
          document.getElementById(
            targetId
          );


        if (
          target
        ) {

          target.style.backgroundColor =
            picker.value;
        }
      }
    );
}


/* ==================================================
   RESET
   ================================================== */

function resetPage() {

  const confirmDelete =
    confirm(
      "Hapus semua data di halaman ini?"
    );


  if (
    !confirmDelete
  ) {

    return;
  }


  localStorage.removeItem(
    pageKey()
  );


  document
    .querySelectorAll(
      "[data-save]"
    )
    .forEach(
      element => {

        if (
          element.type !==
          "color"
        ) {

          element.value =
            "";
        }
      }
    );


  saveAll();


  location.reload();
}


/* ==================================================
   ACTIVE RESOURCE
   ================================================== */

function setActiveResource(
  card,
  shouldScroll = true
) {

  const resourceCards =
    document.querySelectorAll(
      ".resource-card"
    );


  const viewerTitle =
    document.getElementById(
      "viewer-title"
    );


  const viewerType =
    document.getElementById(
      "viewer-type"
    );


  const viewerDescription =
    document.getElementById(
      "viewer-description"
    );


  const viewerIcon =
    document.getElementById(
      "viewer-icon"
    );


  const resourceFrame =
    document.getElementById(
      "resource-frame"
    );


  const frameContainer =
    document.getElementById(
      "resource-frame-container"
    );


  const openButton =
    document.getElementById(
      "viewer-open-button"
    );


  const viewerSection =
    document.getElementById(
      "resource-viewer"
    );


  if (
    !card ||
    !viewerTitle ||
    !viewerType ||
    !viewerDescription ||
    !viewerIcon ||
    !resourceFrame ||
    !frameContainer ||
    !openButton
  ) {

    return;
  }


  const title =
    card.dataset.resourceTitle ||
    "Music Session Resource";


  const type =
    card.dataset.resourceType ||
    "Resource";


  const description =
    card.dataset.resourceDescription ||
    "";


  const icon =
    card.dataset.resourceIcon ||
    "📄";


  const previewUrl =
    card.dataset.resourceUrl ||
    "";


  const newTabUrl =
    card.dataset.resourceNewTab ||
    previewUrl;


  resourceCards.forEach(
    resourceCard => {

      const isSelected =
        resourceCard ===
        card;


      resourceCard.classList.toggle(

        "is-active",

        isSelected

      );


      resourceCard.setAttribute(

        "aria-pressed",

        String(
          isSelected
        )

      );
    }
  );


  viewerTitle.textContent =
    title;


  viewerType.textContent =
    type;


  viewerDescription.textContent =
    description;


  viewerIcon.textContent =
    icon;


  resourceFrame.title =
    title +
    " read-only preview";


  openButton.href =
    newTabUrl;


  if (
    resourceFrame.src !==
    previewUrl
  ) {

    frameContainer.classList.add(
      "is-loading"
    );


    resourceFrame.src =
      previewUrl;
  }


  localStorage.setItem(

    activeResourceKey(),

    previewUrl

  );


  if (
    shouldScroll &&
    viewerSection
  ) {

    viewerSection.scrollIntoView({

      behavior:
        "smooth",

      block:
        "start"

    });
  }
}


/* ==================================================
   INITIALIZE RESOURCE CARDS
   ================================================== */

function initializeResourceCards() {

  const resourceCards =
    document.querySelectorAll(
      ".resource-card"
    );


  resourceCards.forEach(
    card => {

      card.addEventListener(
        "click",
        () => {

          setActiveResource(
            card,
            true
          );

        }
      );
    }
  );


  const savedResourceUrl =
    localStorage.getItem(
      activeResourceKey()
    );


  if (
    savedResourceUrl
  ) {

    const savedCard =
      Array
        .from(
          resourceCards
        )
        .find(
          card =>
            card.dataset.resourceUrl ===
            savedResourceUrl
        );


    if (
      savedCard
    ) {

      setActiveResource(
        savedCard,
        false
      );


      return;
    }
  }


  const firstCard =
    document.querySelector(
      ".resource-card"
    );


  if (
    firstCard
  ) {

    setActiveResource(
      firstCard,
      false
    );
  }
}


/* ==================================================
   VIEWER LOADING
   ================================================== */

function initializeViewerLoading() {

  const resourceFrame =
    document.getElementById(
      "resource-frame"
    );


  const frameContainer =
    document.getElementById(
      "resource-frame-container"
    );


  if (
    !resourceFrame ||
    !frameContainer
  ) {

    return;
  }


  frameContainer.classList.add(
    "is-loading"
  );


  resourceFrame.addEventListener(
    "load",
    () => {

      frameContainer.classList.remove(
        "is-loading"
      );

    }
  );
}


/* ==================================================
   VIEWER TOGGLE
   ================================================== */

function initializeViewerToggle() {

  const toggleButton =
    document.getElementById(
      "toggle-viewer-button"
    );


  const frameContainer =
    document.getElementById(
      "resource-frame-container"
    );


  const viewerCard =
    document.querySelector(
      ".viewer-card"
    );


  if (
    !toggleButton ||
    !frameContainer ||
    !viewerCard
  ) {

    return;
  }


  toggleButton.addEventListener(
    "click",
    () => {

      const isExpanded =
        toggleButton.getAttribute(
          "aria-expanded"
        ) ===
        "true";


      const nextExpandedState =
        !isExpanded;


      toggleButton.setAttribute(

        "aria-expanded",

        String(
          nextExpandedState
        )

      );


      toggleButton.textContent =

        nextExpandedState
          ? "Hide Preview"
          : "Show Preview";


      frameContainer.classList.toggle(

        "is-collapsed",

        !nextExpandedState

      );


      viewerCard.classList.toggle(

        "preview-collapsed",

        !nextExpandedState

      );

    }
  );
}


/* ==================================================
   SMOOTH SCROLLING
   ================================================== */

function initializeSmoothAnchorScrolling() {

  document
    .querySelectorAll(
      'a[href^="#"]'
    )
    .forEach(
      link => {

        link.addEventListener(
          "click",
          event => {

            const targetId =
              link.getAttribute(
                "href"
              );


            if (
              !targetId ||
              targetId ===
              "#"
            ) {

              return;
            }


            const target =
              document.querySelector(
                targetId
              );


            if (
              !target
            ) {

              return;
            }


            event.preventDefault();


            target.scrollIntoView({

              behavior:
                "smooth",

              block:
                "start"

            });


            history.pushState(

              null,

              "",

              targetId

            );

          }
        );
      }
    );
}


/* ==================================================
   DASHBOARD CLOCK
   ================================================== */

function initializeDashboardClock() {

  const greeting =
    document.getElementById(
      "dashboardGreeting"
    );


  const time =
    document.getElementById(
      "dashboardTime"
    );


  const date =
    document.getElementById(
      "dashboardDate"
    );


  if (
    !greeting ||
    !time ||
    !date
  ) {

    return;
  }


  function updateDashboardClock() {

    const now =
      new Date();


    const hour =
      now.getHours();


    /* ==================================================
       DYNAMIC GREETING + EMOJI

       05:00 - 11:59 = Morning
       12:00 - 17:59 = Afternoon
       18:00 - 04:59 = Evening
       ================================================== */

    if (
      hour >= 5 &&
      hour < 12
    ) {

      greeting.textContent =
        "🌅 Good Morning!";

    } else if (
      hour >= 12 &&
      hour < 18
    ) {

      greeting.textContent =
        "☀️ Good Afternoon!";

    } else {

      greeting.textContent =
        "🌙 Good Evening!";
    }


    /* ==================================================
       24-HOUR CLOCK

       Examples:
       08:15:32
       14:37:09
       23:58:41
       ================================================== */

    const hours =
      String(
        now.getHours()
      ).padStart(
        2,
        "0"
      );


    const minutes =
      String(
        now.getMinutes()
      ).padStart(
        2,
        "0"
      );


    const seconds =
      String(
        now.getSeconds()
      ).padStart(
        2,
        "0"
      );


    time.textContent =
      `${hours}:${minutes}:${seconds}`;


    /* ==================================================
       DATE FORMAT — D MONTH YYYY

       Examples:
       1 September 2026
       25 December 2026
       ================================================== */

    const day =
      now.getDate();


    const months = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December"
    ];


    const month =
      months[
        now.getMonth()
      ];


    const year =
      now.getFullYear();


    date.textContent =
      `${day} ${month} ${year}`;

  } // ← THIS CLOSING BRACE WAS MISSING


  /*
    Display immediately.
  */

  updateDashboardClock();


  /*
    Refresh every second.
  */

  setInterval(
    updateDashboardClock,
    1000
  );

} // ← closes initializeDashboardClock()



/* ==================================================
   DASHBOARD WEATHER CODE
   ================================================== */

function dashboardWeatherInfo(
  code,
  isDay
) {

  const night =
    Number(
      isDay
    ) === 0;


  const codes = {

    0: [
      "Clear sky",
      night
        ? "🌙"
        : "☀️"
    ],


    1: [
      "Mainly clear",
      night
        ? "🌙"
        : "🌤️"
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
      "Fog",
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


    56: [
      "Freezing drizzle",
      "🌧️"
    ],


    57: [
      "Heavy freezing drizzle",
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


    66: [
      "Freezing rain",
      "🌧️"
    ],


    67: [
      "Heavy freezing rain",
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


    77: [
      "Snow grains",
      "🌨️"
    ],


    80: [
      "Light rain showers",
      "🌦️"
    ],


    81: [
      "Rain showers",
      "🌧️"
    ],


    82: [
      "Heavy rain showers",
      "🌧️"
    ],


    85: [
      "Snow showers",
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
      "Thunderstorm with hail",
      "⛈️"
    ],


    99: [
      "Severe thunderstorm with hail",
      "⛈️"
    ]

  };


  const result =
    codes[
      Number(
        code
      )
    ] ||
    [
      "Current weather",
      "🌡️"
    ];


  return {

    condition:
      result[0],

    icon:
      result[1]

  };
}


/* ==================================================
   LOAD DASHBOARD WEATHER
   ================================================== */

async function loadDashboardWeather(
  latitude,
  longitude
) {

  const temperature =
    document.getElementById(
      "dashboardWeatherTemperature"
    );


  const condition =
    document.getElementById(
      "dashboardWeatherCondition"
    );


  const icon =
    document.getElementById(
      "dashboardWeatherIcon"
    );


  if (
    !temperature ||
    !condition ||
    !icon
  ) {

    return;
  }


  /* ==================================================
     BUILD OPEN-METEO REQUEST
     ================================================== */

  const parameters =
    new URLSearchParams({

      latitude:
        latitude,

      longitude:
        longitude,

      current:
        [
          "temperature_2m",
          "weather_code",
          "is_day"
        ].join(","),

      timezone:
        "auto"

    });


  const url =

    "https://api.open-meteo.com/v1/forecast?" +

    parameters.toString();


  try {

    const response =
      await fetch(
        url
      );


    if (
      !response.ok
    ) {

      throw new Error(
        "Weather request failed."
      );
    }


    const data =
      await response.json();


    const current =
      data.current;


    if (
      !current
    ) {

      throw new Error(
        "No current weather data."
      );
    }


    /* ==================================================
       WEATHER CONDITION
       ================================================== */

    const weather =
      dashboardWeatherInfo(

        current.weather_code,

        current.is_day

      );


    /* ==================================================
       TEMPERATURE
       ================================================== */

    temperature.textContent =

      Math.round(
        current.temperature_2m
      ) +

      "°C";


    /* ==================================================
       CONDITION
       ================================================== */

    condition.textContent =

      weather.condition +

      " • Open detailed weather →";


    /* ==================================================
       ICON
       ================================================== */

    icon.textContent =
      weather.icon;

  } catch (
    error
  ) {

    console.error(
      "Dashboard weather error:",
      error
    );


    temperature.textContent =
      "--°C";


    condition.textContent =
      "Weather unavailable • Open details →";


    icon.textContent =
      "🌤️";
  }
}


/* ==================================================
   INITIALIZE DASHBOARD WEATHER
   ================================================== */

function initializeDashboardWeather() {

  const temperature =
    document.getElementById(
      "dashboardWeatherTemperature"
    );


  const condition =
    document.getElementById(
      "dashboardWeatherCondition"
    );


  const icon =
    document.getElementById(
      "dashboardWeatherIcon"
    );


  if (
    !temperature ||
    !condition ||
    !icon
  ) {

    return;
  }


  /* ==================================================
     LOCAL FILE MODE

     Example:

     file:///D:/Documents/.../index.html

     The date and clock work normally in local
     file mode because they only use JavaScript.

     Automatic location-based weather should be
     tested through GitHub Pages or localhost.
     ================================================== */

  if (
    window.location.protocol ===
    "file:"
  ) {

    temperature.textContent =
      "--°C";


    condition.textContent =
      "Open detailed weather • GitHub Pages / localhost →";


    icon.textContent =
      "🌤️";


    return;
  }


  /* ==================================================
     CHECK GEOLOCATION SUPPORT
     ================================================== */

  if (
    !navigator.geolocation
  ) {

    temperature.textContent =
      "--°C";


    condition.textContent =
      "Location unavailable • Open details →";


    icon.textContent =
      "🌤️";


    return;
  }


  /* ==================================================
     DETECTING
     ================================================== */

  condition.textContent =
    "Detecting weather...";


  /* ==================================================
     REQUEST CURRENT LOCATION
     ================================================== */

  navigator.geolocation.getCurrentPosition(

    position => {

      loadDashboardWeather(

        position.coords.latitude,

        position.coords.longitude

      );

    },


    error => {

      console.warn(
        "Dashboard geolocation:",
        error
      );


      temperature.textContent =
        "--°C";


      condition.textContent =
        "Location unavailable • Open details →";


      icon.textContent =
        "🌤️";

    },


    {

      enableHighAccuracy:
        false,

      timeout:
        10000,

      maximumAge:
        600000

    }

  );
}


/* ==================================================
   PAGE INITIALIZATION
   ================================================== */

document.addEventListener(
  "DOMContentLoaded",
  () => {


    /* ==================================================
       LOAD SAVED MUSIC SESSION DATA
       ================================================== */

    loadAll();


    /* ==================================================
       RESOURCE VIEWER
       ================================================== */

    initializeViewerLoading();


    initializeResourceCards();


    initializeViewerToggle();


    /* ==================================================
       SMOOTH NAVIGATION
       ================================================== */

    initializeSmoothAnchorScrolling();


    /* ==================================================
       LIVE DATE + TIME

       Example:

       ☀️ Good Afternoon!
       15:42:18
       01/09/26
       ================================================== */

    initializeDashboardClock();


    /* ==================================================
       LIVE WEATHER
       ================================================== */

    initializeDashboardWeather();


    /* ==================================================
       SAVED FIELD LISTENERS
       ================================================== */

    document
      .querySelectorAll(
        "[data-save]"
      )
      .forEach(
        element => {

          element.addEventListener(
            "input",
            () => {

              applyColors();

              saveAll();

            }
          );


          element.addEventListener(
            "change",
            () => {

              applyColors();

              saveAll();

            }
          );

        }
      );

  }
);
