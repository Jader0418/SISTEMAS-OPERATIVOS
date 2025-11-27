// =========================================================
// 1. CONFIGURACIÓN INICIAL Y CLAVES
// =========================================================

// API 2: OpenWeatherMap (Clave: f2d870a345ba339f0837e7742677b287)
const WEATHER_API_KEY = 'f2d870a345ba339f0837e7742677b287'; 
// La clave de News API fue eliminada y reemplazada por la función de Países Vecinos.

// =========================================================
// 2. REFERENCIAS DEL DOM Y VARIABLES GLOBALES
// =========================================================

// Elementos de Interfaz
const countryInput = document.getElementById('country-input');
const searchButton = document.getElementById('search-button');
const messageArea = document.getElementById('message-area');
const resultsContainer = document.getElementById('results-container');

// Elementos donde se inyectarán los datos del PAÍS (API 1)
const countryName = document.getElementById('country-name');
const countryFlag = document.getElementById('country-flag');
const capitalElement = document.getElementById('capital');
const populationElement = document.getElementById('population');
const regionElement = document.getElementById('region');
const languagesElement = document.getElementById('languages');

// Elementos donde se inyectarán los datos del CLIMA (API 2)
const weatherInfoElement = document.getElementById('weather-info');

// Elementos donde se inyectarán los datos de FINANZAS (API 3)
const usdRateInfo = document.getElementById('usd-rate-info');
const eurRateInfo = document.getElementById('eur-rate-info');

// Elementos donde se inyectarán los PAÍSES VECINOS (API 4)
const neighborsListElement = document.getElementById('news-list'); 

// Variable global para almacenar datos clave
let currentCountryData = {}; 

// =========================================================
// 3. FUNCIÓN PRINCIPAL DE BÚSQUEDA (API 1: Rest Countries)
// =========================================================

async function fetchCountryData(countryName) {
    if (!countryName) {
        messageArea.textContent = 'Por favor, introduce el nombre de un país.';
        return;
    }

    messageArea.textContent = 'Cargando datos...';
    resultsContainer.classList.add('hidden');

    const url = `https://restcountries.com/v3.1/name/${countryName}?fullText=true`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            if (response.status === 404) {
                messageArea.textContent = `Error: No se encontró el país "${countryName}".`;
            } else {
                throw new Error(`Error HTTP: ${response.status}`);
            }
            return; 
        }

        const data = await response.json();
        const country = data[0]; 
        
        displayCountryData(country);
        
        messageArea.textContent = '';
        resultsContainer.classList.remove('hidden');

    } catch (error) {
        console.error('Error al obtener los datos del país:', error);
        messageArea.textContent = 'Ocurrió un error al procesar la solicitud.';
    }
}

function displayCountryData(country) {
    
    // 1. Procesamiento de Datos
    const population = country.population.toLocaleString('es-ES'); 
    const languages = Object.values(country.languages || {}).join(', ');
    
    // Extracción segura de la moneda
    const currencies = country.currencies ? Object.keys(country.currencies) : [];
    const currencyCode = currencies.length > 0 ? currencies[0] : 'N/A';
    const currencyName = currencies.length > 0 && country.currencies[currencyCode] ? country.currencies[currencyCode].name : 'N/A';
    
    // 2. Almacenar datos globales
    currentCountryData = {
        name: country.name.common,
        capital: country.capital ? country.capital[0] : 'N/A',
        currencyCode: currencyCode,
        currencyName: currencyName,
        countryCode: country.cca2, // Código de 2 letras (esencial para API 2)
        borders: country.borders || [] // Códigos de las fronteras (esencial para API 4)
    };

    // 3. Inyectar en el HTML (API 1)
    countryName.textContent = currentCountryData.name;
    countryFlag.src = country.flags.svg;
    countryFlag.alt = `Bandera de ${currentCountryData.name}`;

    capitalElement.textContent = currentCountryData.capital;
    populationElement.textContent = population;
    regionElement.textContent = country.region;
    languagesElement.textContent = languages;
    
    document.getElementById('local-currency').textContent = `${currencyName} (${currencyCode})`;

    // 4. Iniciar Llamadas a las OTRAS APIs
    
    // API 2: CLIMA 
    fetchWeather(currentCountryData.capital, currentCountryData.countryCode);
    
    // API 3: TASAS DE CAMBIO (Usando Exchangerate.host)
    fetchExchangeRate(currentCountryData.currencyCode); 

    // API 4: PAÍSES VECINOS
    fetchNeighbors(currentCountryData.borders); 
}

// =========================================================
// 4. FUNCIÓN DE CLIMA (API 2: OpenWeatherMap)
// =========================================================

async function fetchWeather(capital, countryCode) {
    if (capital === 'N/A') {
        weatherInfoElement.innerHTML = '<p>Clima no disponible (capital no definida).</p>';
        return;
    }

    const query = `${capital},${countryCode}`; 
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${query}&appid=${WEATHER_API_KEY}&units=metric&lang=es`;

    weatherInfoElement.innerHTML = 'Cargando clima...';

    try {
        const response = await fetch(url);
        if (!response.ok) {
            if (response.status === 401) {
                 weatherInfoElement.innerHTML = '<p style="color:orange;">⚠️ **Error 401**: Clave de API Inválida o Inactiva. Revisa tu clave de OpenWeatherMap.</p>';
                 return;
            }
            if (response.status === 404) {
                 weatherInfoElement.innerHTML = `<p>Clima no encontrado para ${capital}.</p>`;
                 return;
            }
            throw new Error(`Error HTTP: ${response.status}`);
        }
        const data = await response.json();
        
        displayWeather(data);

    } catch (error) {
        console.error('Error al obtener el clima:', error);
        weatherInfoElement.innerHTML = `<p>Error al cargar el clima. (${error.message})</p>`;
    }
}

function displayWeather(data) {
    const iconCode = data.weather[0].icon;
    const iconUrl = `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
    const description = data.weather[0].description.charAt(0).toUpperCase() + data.weather[0].description.slice(1);
    
    const weatherHTML = `
        <div class="weather-result">
            <img src="${iconUrl}" alt="${data.weather[0].description}" width="50">
            <p><strong>Condición:</strong> ${description}</p>
            <p><strong>Temperatura:</strong> ${Math.round(data.main.temp)}°C</p>
            <p><strong>Máx/Mín:</strong> ${Math.round(data.main.temp_max)}°C / ${Math.round(data.main.temp_min)}°C</p>
            <p><strong>Humedad:</strong> ${data.main.humidity}%</p>
        </div>
    `;
    weatherInfoElement.innerHTML = weatherHTML;
}

// =========================================================
// 5. FUNCIÓN DE FINANZAS (API 3: Exchangerate.host)
// =========================================================

async function fetchExchangeRate(baseCurrencyCode) {
    usdRateInfo.textContent = 'Cargando tasas...';
    eurRateInfo.textContent = '';

    if (!baseCurrencyCode || baseCurrencyCode === 'N/A') {
        usdRateInfo.textContent = 'Moneda local no definida por Rest Countries API.';
        eurRateInfo.textContent = '';
        return;
    }
    
    // API de Exchangerate.host (Permite http/localhost)
    const url = `https://api.exchangerate.host/latest?base=${baseCurrencyCode}&symbols=USD,EUR`;

    try {
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        
        const data = await response.json();

        if (!data.rates || !data.rates.USD || !data.rates.EUR) {
             usdRateInfo.textContent = `Error: La API no soporta la moneda base ${baseCurrencyCode}.`;
             eurRateInfo.textContent = '';
             return;
        }

        displayExchangeRates(data);

    } catch (error) {
        console.error('Error al obtener la tasa de cambio:', error);
        usdRateInfo.textContent = `Error al cargar la tasa para ${baseCurrencyCode}. (${error.message})`;
        eurRateInfo.textContent = '';
    }
}

function displayExchangeRates(data) {
    const rates = data.rates;
    
    const rateToUSD = rates.USD;
    const rateToEUR = rates.EUR;

    if (rateToUSD && rateToEUR) {
        usdRateInfo.innerHTML = `1 ${data.base} = <strong>$${rateToUSD.toFixed(2)} USD</strong>`;
        eurRateInfo.innerHTML = `1 ${data.base} = <strong>€${rateToEUR.toFixed(2)} EUR</strong>`;
    } else {
        usdRateInfo.textContent = 'Tasas USD/EUR no disponibles.';
        eurRateInfo.textContent = '';
    }
}


// =========================================================
// 6. FUNCIÓN DE PAÍSES VECINOS (API 4: Rest Countries API - Fronteras)
// =========================================================

async function fetchNeighbors(borders) {
    neighborsListElement.innerHTML = '';
    
    if (!borders || borders.length === 0) {
        neighborsListElement.innerHTML = '<li>Este país no tiene fronteras terrestres.</li>';
        return;
    }

    const borderCodes = borders.join(',');
    const url = `https://restcountries.com/v3.1/alpha?codes=${borderCodes}`;

    neighborsListElement.innerHTML = '<li>Cargando países vecinos...</li>';

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        
        displayNeighbors(data);

    } catch (error) {
        console.error('Error al obtener países vecinos:', error);
        neighborsListElement.innerHTML = `<li>Error al cargar la lista de vecinos.</li>`;
    }
}

function displayNeighbors(neighborCountries) {
    neighborsListElement.innerHTML = ''; 

    neighborCountries.forEach(country => {
        const listItem = document.createElement('li');
        listItem.textContent = country.name.common;
        neighborsListElement.appendChild(listItem);
    });
}

// =========================================================
// 7. EVENT LISTENERS
// =========================================================

searchButton.addEventListener('click', () => {
    const country = countryInput.value.trim(); 
    fetchCountryData(country);
});

countryInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        const country = countryInput.value.trim();
        fetchCountryData(country);
    }
});
