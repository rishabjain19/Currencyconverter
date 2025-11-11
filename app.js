// CDN + fallback base URLs (EUR-based rates)
const CDN_BASE =
  "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/";
const FALLBACK_BASE = "https://latest.currency-api.pages.dev/v1/";

let RATES_EUR = null; // cache of rates where keys are lowercase currency codes

async function fetchEurRates() {
  const endpoint = "currencies/eur.json";
  // try CDN first, then fallback
  try {
    const res = await fetch(CDN_BASE + endpoint);
    if (!res.ok) throw new Error("CDN fetch failed");
    const json = await res.json();
    if (!json || !json.eur) throw new Error("Unexpected JSON from CDN");
    return json.eur;
  } catch (err) {
    console.warn("CDN failed, trying fallback:", err.message);
    const res = await fetch(FALLBACK_BASE + endpoint);
    if (!res.ok) throw new Error("Fallback fetch failed");
    const json = await res.json();
    if (!json || !json.eur) throw new Error("Unexpected JSON from fallback");
    return json.eur;
  }
}

function convertAmount(amount, fromCode, toCode) {
  // rates are expressed as: 1 EUR = rates[currency]
  // To convert amount in FROM to TO:
  // amount_in_eur = amount / rates[FROM]
  // amount_in_to = amount_in_eur * rates[TO]
  const from = fromCode.toLowerCase();
  const to = toCode.toLowerCase();
  if (!RATES_EUR) throw new Error("Rates not loaded");
  if (!(from in RATES_EUR) || !(to in RATES_EUR)) {
    throw new Error(`Missing rate for ${fromCode} or ${toCode}`);
  }
  const rateFrom = RATES_EUR[from];
  const rateTo = RATES_EUR[to];
  const result = (amount / rateFrom) * rateTo;
  return result;
}

function formatNumber(n, currencyCode) {
  try {
    return new Intl.NumberFormat(undefined, {
      maximumFractionDigits: 6,
    }).format(n);
  } catch {
    return n.toFixed(4);
  }
}

// UI wiring
document.addEventListener("DOMContentLoaded", async () => {
  const fromSelect = document.querySelector('select[name="from"]');
  const toSelect = document.querySelector('select[name="to"]');
  const amountInput = document.querySelector(".amount input");
  const msg = document.querySelector(".msg");
  const form = document.querySelector("form");

  const fromImg = document.querySelector(".from .select-container img");
  const toImg = document.querySelector(".to .select-container img");

  // best-effort mapping from currency code -> country code for flags
  const CURRENCY_TO_COUNTRY = {
    USD: "US",
    EUR: "EU",
    GBP: "GB",
    INR: "IN",
    AUD: "AU",
    CAD: "CA",
    JPY: "JP",
    CNY: "CN",
    CHF: "CH",
    SEK: "SE",
    NOK: "NO",
    DKK: "DK",
    RUB: "RU",
    BRL: "BR",
    ZAR: "ZA",
    NZD: "NZ",
    SGD: "SG",
    HKD: "HK",
    MXN: "MX",
    KRW: "KR",
    TRY: "TR",
    ILS: "IL",
    SAR: "SA",
    AED: "AE",
    KWD: "KW",
    THB: "TH",
    VND: "VN",
    PKR: "PK",
    NGN: "NG",
    EGP: "EG",
    IDR: "ID",
    MYR: "MY",
    PHP: "PH",
    PLN: "PL",
    HUF: "HU",
    CZK: "CZ",
    RON: "RO",
    CLP: "CL",
    ARS: "AR",
    ILS: "IL",
  };

  function setFlagImage(imgEl, currencyCode) {
    if (!imgEl) return;
    const up = (currencyCode || "").toUpperCase();
    const country = CURRENCY_TO_COUNTRY[up] || up.slice(0, 2);
    if (!country) {
      imgEl.style.display = "none";
      return;
    }
    imgEl.style.display = "block";
    imgEl.src = `https://flagsapi.com/${country}/flat/64.png`;
    imgEl.alt = `${country} flag`;
  }

  try {
    RATES_EUR = await fetchEurRates();
  } catch (err) {
    msg.textContent = "Failed to load exchange rates.";
    console.error(err);
    return;
  }

  // populate selects
  const codes = Object.keys(RATES_EUR).filter(
    (k) => typeof RATES_EUR[k] === "number"
  );
  codes.sort();
  for (const code of codes) {
    const up = code.toUpperCase();
    const o1 = document.createElement("option");
    o1.value = up;
    o1.textContent = up;
    // attach a country code if we can - used for flags
    o1.dataset.country = (CURRENCY_TO_COUNTRY && CURRENCY_TO_COUNTRY[up]) || "";
    fromSelect.appendChild(o1);
    const o2 = o1.cloneNode(true);
    toSelect.appendChild(o2);
  }

  // sensible defaults if present
  if ([...fromSelect.options].some((o) => o.value === "USD"))
    fromSelect.value = "USD";
  if ([...toSelect.options].some((o) => o.value === "INR"))
    toSelect.value = "INR";

  // initial display
  function showConversion() {
    const amount = parseFloat(amountInput.value) || 0;
    const from = fromSelect.value || "USD";
    const to = toSelect.value || "INR";
    try {
      const converted = convertAmount(amount, from, to);
      msg.textContent = `${formatNumber(amount)} ${from} = ${formatNumber(
        converted
      )} ${to}`;
    } catch (err) {
      msg.textContent = err.message;
    }
  }

  // update flags when a select changes
  function updateFlags() {
    setFlagImage(fromImg, fromSelect.value || "");
    setFlagImage(toImg, toSelect.value || "");
  }

  fromSelect.addEventListener("change", () => {
    updateFlags();
  });
  toSelect.addEventListener("change", () => {
    updateFlags();
  });

  // form submit
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    showConversion();
  });

  // immediate initial conversion
  updateFlags();
  showConversion();
});
