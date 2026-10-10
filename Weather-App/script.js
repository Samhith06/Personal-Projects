async function citysearch(event) {
    const city = document.getElementById('search-input').value.trim();
    if (!city) {
        console.error('Please enter a city name in the search input');
        return;
    }
    await fetchWeather(city);
}

async function fetchWeather(city) {
    const apiKey = 'a5f754ce7f8271964d278bd4371cf629';
    const apiUrl = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`;

    try {
        const response = await fetch(apiUrl);
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const data = await response.json();

        const weather = {
            city: data.name,
            country: data.sys.country,
            feels_like: data.main.feels_like,
            temperature: data.main.temp,
            description: data.weather[0].description,
            humidity: data.main.humidity,
            windSpeed: data.wind.speed,
            pressure: data.main.pressure,
            visibility: data.visibility,
            cloudCover: data.clouds.all,
            sunrise: data.sys.sunrise,
            sunset: data.sys.sunset,
        };
        weatherdata(weather);
    } catch (error) {
        console.error(`Error fetching weather data for ${city}:`, error.message);
    }
}

function getWeatherSVG(description) {
    // Map weather descriptions to SVG filenames
    const map = {
        'clear sky': 'sunny_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg',
        'few clouds': 'partly_cloudy_day_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg',
        'scattered clouds': 'cloud_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg',
        'broken clouds': 'cloud_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg',
        'overcast clouds': 'cloud_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg',
        'light rain': 'rainy_light_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg',
        'moderate rain': 'rainy_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg',
        'heavy intensity rain': 'rainy_heavy_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg',
        'very heavy rain': 'rainy_heavy_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg',
        'extreme rain': 'rainy_heavy_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg',
        'shower rain': 'rainy_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg',
        'ragged shower rain': 'rainy_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg',
        'freezing rain': 'rainy_snow_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg',
        'rain': 'rainy_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg',
        'thunderstorm': 'thunderstorm_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg',
        'thunderstorm with light rain': 'thunderstorm_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg',
        'thunderstorm with rain': 'thunderstorm_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg',
        'thunderstorm with heavy rain': 'thunderstorm_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg',
        'light thunderstorm': 'thunderstorm_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg',
        'heavy thunderstorm': 'thunderstorm_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg',
        'ragged thunderstorm': 'thunderstorm_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg',
        'thunderstorm with drizzle': 'thunderstorm_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg',
        'thunderstorm with heavy drizzle': 'thunderstorm_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg',
        'snow': 'weather_hail_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg',
        'light snow': 'weather_hail_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg',
        'heavy snow': 'weather_hail_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg',
        'sleet': 'rainy_snow_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg',
        'light shower sleet': 'rainy_snow_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg',
        'shower sleet': 'rainy_snow_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg',
        'light rain and snow': 'rainy_snow_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg',
        'rain and snow': 'rainy_snow_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg',
        'light shower snow': 'weather_hail_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg',
        'shower snow': 'weather_hail_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg',
        'heavy shower snow': 'weather_hail_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg',
        'mist': 'foggy_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg',
        'haze': 'foggy_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg',
        'fog': 'foggy_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg',
    };
    const file = map[description] || 'cloud_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg';
    const req = new XMLHttpRequest();
    req.open('GET', `./svg/${file}`, false); // synchronous
    req.send(null);
    return req.status === 200 ? req.responseText : '';
}

function weatherdata(weather) {
    const card = document.querySelector('.card');
    card.classList.remove('hidden');
    // Set city and country in the main card
    const citySpan = document.getElementById('City');
    const countrySpan = document.getElementById('Country');
    if (citySpan) citySpan.textContent = weather.city;
    if (countrySpan) countrySpan.textContent = weather.country;
    const cardSubtitle = document.querySelector('#Temperature');
    cardSubtitle.textContent = `${weather.temperature}°C`;
    const cardfeeksLike = document.querySelector('#Feels-like');
    cardfeeksLike.textContent = `Feels like: ${weather.feels_like}°C`;
    const cardhumidity = document.querySelector('#Humidity');
    cardhumidity.textContent = `Humidity: ${weather.humidity}%`;
    const cardwindSpeed = document.querySelector('#Wind_Speed');
    cardwindSpeed.textContent = `Wind: ${weather.windSpeed} m/s`;
    const cardDescription = document.querySelector('#Description');
    cardDescription.textContent = weather.description;
    const iconContainer = document.querySelector('.weather-icon-bg');
    if (iconContainer) iconContainer.innerHTML = getWeatherSVG(weather.description);
    console.log('Weather description:', weather.description);
    const cardpressure = document.querySelector('#Pressure');
    cardpressure.textContent = `Pressure: ${weather.pressure} hPa`;
    const cardvisibility = document.querySelector('#Visibility');
    cardvisibility.textContent = `Visibility: ${(weather.visibility / 1000)} km`;
    const cardcloudCover = document.querySelector('#Cloud_Cover');
    cardcloudCover.textContent = `Cloud: ${weather.cloudCover}%`;
    const cardsunrise = document.querySelector('#Sunrise');
    cardsunrise.textContent = `Sunrise: ${formatTime(weather.sunrise)}`;
    const cardsunset = document.querySelector('#Sunset');
    cardsunset.textContent = `Sunset: ${formatTime(weather.sunset)}`;
    

    const forecasr =document.querySelector('.forecast-section');
    forecasr.classList.remove('hidden');
}

async function hourlyForecast(city) {
    const apiKey = 'a5f754ce7f8271964d278bd4371cf629';
    if (!city) {
        console.error('No city provided for hourly forecast');
        return;
    }
    const units = 'metric';
    const url = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(city)}&appid=${apiKey}&units=${units}`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }
        const data = await response.json();
        const hourlyData = data.list.slice(0, 8); 

        const hourlyForecastContainer = document.getElementById('hourly-forecast-data');
        hourlyForecastContainer.innerHTML = ''; 

        for (const forecast of hourlyData) {
            const date = new Date(forecast.dt * 1000);
            const time = formatTime(forecast.dt);
            const temperature = `${Math.round(forecast.main.temp)}°C`;
            const description = forecast.weather[0].description;

            let iconSrc = '';
            switch(description) {
                case 'clear sky':
                    iconSrc = './images/sunny.png';
                    break;
                case 'few clouds':
                case 'scattered clouds':
                case 'broken clouds':
                case 'overcast clouds':
                    iconSrc = './images/partly_cloudy.png';
                    break;
                case 'light rain':
                case 'moderate rain':
                case 'heavy intensity rain':
                case 'very heavy rain':
                case 'extreme rain':
                case 'shower rain':
                case 'ragged shower rain':
                case 'freezing rain':
                case 'rain':
                    iconSrc = './images/rain.png';
                    break;
                case 'thunderstorm':
                case 'thunderstorm with light rain':
                case 'thunderstorm with rain':
                case 'thunderstorm with heavy rain':
                case 'light thunderstorm':
                case 'heavy thunderstorm':
                case 'ragged thunderstorm':
                case 'thunderstorm with drizzle':
                case 'thunderstorm with heavy drizzle':
                    iconSrc = './images/Thunderstorms.png';
                    break;
                case 'snow':
                case 'light snow':
                case 'heavy snow':
                case 'sleet':
                case 'light shower sleet':
                case 'shower sleet':
                case 'light rain and snow':
                case 'rain and snow':
                case 'light shower snow':
                case 'shower snow':
                case 'heavy shower snow':
                    iconSrc = './images/snow.png';
                    break;
                case 'mist':    
                case 'haze':
                case 'fog':
                    iconSrc = './images/fog.png';
                    break;
                default:
                    iconSrc = '';
            }

            const hourlyCard = `
                <div class="hourly-card">
                    <div class="hourly-time">${time}</div>
                    <img src="${iconSrc}" alt="${description}" class="hourly-icon">
                    <div class="hourly-temp">${temperature}</div>
                </div>
            `;
            hourlyForecastContainer.innerHTML += hourlyCard;
        }
        document.querySelector('.hourly-forecast-section').classList.remove('hidden');
    } catch (error) {
        console.error(`Error fetching hourly forecast for ${city}:`, error.message);
    }
}

function formatTime(unixTimestamp) {
    const date = new Date(unixTimestamp * 1000);
    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; 
    return `${hours}:${minutes} ${ampm}`;
}

async function getUserCity() {
    try {
        const response = await fetch('http://ip-api.com/json/');
        const data = await response.json();
        if (data.status === 'success') {
            const city = data.city || 'Unknown city';
            document.getElementById('search-input').value = city;
            await fetchWeather(city);
            await hourlyForecast(city);
            await day5forecast(city);
            console.log('User city:', city);
            return city;
        } else {
            console.error('Error fetching location:', data.message);
            return null;
        }
    } catch (error) {
        console.error('Error with IP-API request:', error.message);
        return null;
    }
}

async function day5forecast(city) {
    const apiKey = 'a5f754ce7f8271964d278bd4371cf629';
    if (!city) {
        console.error('No city provided for forecast');
        return;
    }
    const units = 'metric';
    const url = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(city)}&appid=${apiKey}&units=${units}`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }
        const data = await response.json();

        const country = data.city && data.city.country ? data.city.country : '';

        const dailyForecasts = [];
        const forecastList = data.list;
        const seenDates = new Set();
        for (const forecast of forecastList) {
            const date = new Date(forecast.dt * 1000);
            const dateString = date.toISOString().split('T')[0]; 

            if (!seenDates.has(dateString)) {
                seenDates.add(dateString);
                dailyForecasts.push({
                    date: dateString,
                    temperature: forecast.main.temp,
                    description: forecast.weather[0].description,
                    humidity: forecast.main.humidity,
                    windSpeed: forecast.wind.speed,
                    icon: forecast.weather[0].description 
                });
            }
            if (dailyForecasts.length === 5) break;
        }
        for (let i = 0; i < 5; i++) {
            const dayCard = document.querySelector(`.day${i+1}`);
            if (!dayCard) continue;
            const forecast = dailyForecasts[i];
            if (!forecast) continue;
            // Format date as 'Day, date Month'
            dayCard.querySelector('.forecast-date').textContent = formatForecastDate(forecast.date);
            dayCard.querySelector('.forecast-city').textContent = `${city}, ${country}`;
            dayCard.querySelector('.forecast-description').textContent = forecast.description;
            dayCard.querySelector('.forecast-temperature').textContent = `Temp: ${forecast.temperature}°C`;
            dayCard.querySelector('.forecast-humidity').textContent = `Humidity: ${forecast.humidity}%`;
            dayCard.querySelector('.forecast-wind').textContent = `Wind: ${forecast.windSpeed} m/s`;
            // Inject SVG icon
            const iconContainer = dayCard.querySelector('.forecast-icon');
            if (iconContainer) iconContainer.outerHTML = getWeatherSVG(forecast.icon);
        }
        document.querySelector('.forecast-section').classList.remove('hidden');
    } catch (error) {
        console.error(`Error fetching forecast for ${city}:`, error.message);
    }
}

function formatForecastDate(dateString) {
    const date = new Date(dateString);
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const day = days[date.getDay()];
    const dayNum = date.getDate();
    const month = months[date.getMonth()];
    return `${day}, ${dayNum} ${month}`;
}

document.getElementById('location-button').addEventListener('click', getUserCity);
document.getElementById('search-button').addEventListener('click', async () => {
    await citysearch();
    const city = document.getElementById('search-input').value.trim();
    await hourlyForecast(city);
    await day5forecast(city);
});
document.addEventListener('keypress', async function(event) {
    if (event.key === 'Enter') {
        await citysearch();
        const city = document.getElementById('search-input').value.trim();
        await hourlyForecast(city);
        await day5forecast(city);
    }
});
