// Rankings Page - Location-based Leaderboard
// Uses backend API instead of direct Supabase connection for security

// Backend API URL
const API_BASE_URL = window.API_BASE_URL || 'http://localhost:3000';

// Map English country names to Turkish (database uses Turkish)
function mapCountryToTurkish(countryName) {
    const countryMap = {
        'Turkey': 'Turkiye',
        'United States': 'Amerika Birleşik Devletleri',
        'United Kingdom': 'Birleşik Krallık',
        'Germany': 'Almanya',
        'France': 'Fransa',
        'Italy': 'İtalya',
        'Spain': 'İspanya',
        'Netherlands': 'Hollanda',
        'Belgium': 'Belçika',
        'Greece': 'Yunanistan',
        'Bulgaria': 'Bulgaristan',
        'Romania': 'Romanya',
        'Russia': 'Rusya',
        'Ukraine': 'Ukrayna',
        'Poland': 'Polonya',
        'Czech Republic': 'Çek Cumhuriyeti',
        'Austria': 'Avusturya',
        'Switzerland': 'İsviçre',
        'Sweden': 'İsveç',
        'Norway': 'Norveç',
        'Denmark': 'Danimarka',
        'Finland': 'Finlandiya',
        'Portugal': 'Portekiz',
        'Ireland': 'İrlanda',
        'Canada': 'Kanada',
        'Australia': 'Avustralya',
        'New Zealand': 'Yeni Zelanda',
        'Japan': 'Japonya',
        'China': 'Çin',
        'India': 'Hindistan',
        'Brazil': 'Brezilya',
        'Argentina': 'Arjantin',
        'Mexico': 'Meksika',
        'South Africa': 'Güney Afrika',
        'Egypt': 'Mısır',
        'Saudi Arabia': 'Suudi Arabistan',
        'United Arab Emirates': 'Birleşik Arap Emirlikleri',
        'Israel': 'İsrail',
        'Iran': 'İran',
        'Iraq': 'Irak',
        'Syria': 'Suriye',
        'Lebanon': 'Lübnan',
        'Jordan': 'Ürdün',
        'Cyprus': 'Kıbrıs',
        'Azerbaijan': 'Azerbaycan',
        'Georgia': 'Gürcistan',
        'Armenia': 'Ermenistan'
    };
    
    // Check exact match first
    if (countryMap[countryName]) {
        return countryMap[countryName];
    }
    
    // Check case-insensitive match
    const lowerCountry = countryName.toLowerCase();
    for (const [en, tr] of Object.entries(countryMap)) {
        if (en.toLowerCase() === lowerCountry) {
            return tr;
        }
    }
    
    // If no mapping found, return original (might already be Turkish)
    return countryName;
}

// Current location data
let currentLocation = {
    latitude: null,
    longitude: null,
    district: null,
    city: null,
    country: null
};

// Current leaderboard level
let currentLevel = 'district'; // 'district', 'city', 'country'

// Update interval (15 minutes = 900000 ms, 1 hour = 3600000 ms)
const UPDATE_INTERVAL = 15 * 60 * 1000; // 15 minutes

// Last update timestamp
let lastUpdateTime = null;
let updateTimer = null;

// Cache for leaderboard data (15 minutes)
let leaderboardCache = {
    data: null,
    timestamp: null,
    level: null,
    location: null
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    // Setup location selector buttons
    setupLocationSelector();

    // Get user location
    await getUserLocation();

    // Load initial leaderboard
    await loadLeaderboard();

    // Setup auto-refresh
    setupAutoRefresh();
});

// Setup location selector buttons
function setupLocationSelector() {
    const buttons = document.querySelectorAll('.location-btn');
    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active class from all buttons
            buttons.forEach(b => b.classList.remove('active'));
            // Add active class to clicked button
            btn.classList.add('active');
            // Update current level
            currentLevel = btn.dataset.level;
            // Reload leaderboard (force refresh when switching levels)
            loadLeaderboard(true);
        });
    });
}

// Get user's location using Geolocation API
async function getUserLocation() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            showError('Geolocation is not supported by your browser.');
            reject(new Error('Geolocation not supported'));
            return;
        }

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                currentLocation.latitude = position.coords.latitude;
                currentLocation.longitude = position.coords.longitude;

                // Reverse geocode to get location names
                await reverseGeocode(currentLocation.latitude, currentLocation.longitude);
                
                // Update location info display and buttons
                updateLocationInfo();
                
                resolve();
            },
            (error) => {
                console.error('Error getting location:', error);
                // Try to get location from IP as fallback
                getLocationFromIP().then(resolve).catch(reject);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 3600000 // 1 hour
            }
        );
    });
}

// Reverse geocode coordinates to get district, city, country
async function reverseGeocode(lat, lng) {
    try {
        // Using OpenStreetMap Nominatim API (free, no API key required)
        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
            {
                headers: {
                    'User-Agent': 'RacketRank/1.0'
                }
            }
        );

        if (!response.ok) {
            throw new Error('Reverse geocoding failed');
        }

        const data = await response.json();
        
        // Log the full Nominatim API response
        console.log('📍 Full Nominatim API response:', JSON.stringify(data, null, 2));
        
        const address = data.address || {};

        // Extract location information
        // Türkiye için hiyerarşi: ilçe (district) → il (city) → ülke (country)
        // Nominatim API'den: town = ilçe, province = il, country = ülke
        // district = ilçe (örn: Marmaris)
        currentLocation.district = address.town || 'Unknown';
        // city = il (örn: Muğla)
        currentLocation.city = address.province || 'Unknown';
        // country = ülke (örn: Türkiye)
        const countryName = address.country || 'Unknown';
        currentLocation.country = mapCountryToTurkish(countryName);
        
        console.log('✅ Parsed location:', {
            district: currentLocation.district,
            city: currentLocation.city,
            country: currentLocation.country
        });

        // Update location info display and buttons
        updateLocationInfo();
    } catch (error) {
        console.error('Reverse geocoding error:', error);
        // Set default values
        currentLocation.district = 'Unknown';
        currentLocation.city = 'Unknown';
        currentLocation.country = 'Unknown';
    }
}

// Get location from IP as fallback
async function getLocationFromIP() {
    try {
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();

        if (data.error) {
            throw new Error('IP geolocation failed');
        }

        // IP-based geolocation: city = ilçe, region = il, country_name = ülke
        // district = ilçe (IP'den tam bilgi yok, city kullanıyoruz)
        currentLocation.district = data.city || 'Unknown';
        // city = il (region)
        currentLocation.city = data.region || data.region_code || 'Unknown';
        // country = ülke
        const countryName = data.country_name || 'Unknown';
        currentLocation.country = mapCountryToTurkish(countryName);

        // Update location info display and buttons
        updateLocationInfo();
    } catch (error) {
        console.error('IP geolocation error:', error);
        currentLocation.district = 'Unknown';
        currentLocation.city = 'Unknown';
        currentLocation.country = 'Unknown';
    }
}

// Update location info display
function updateLocationInfo() {
    const locationInfo = document.getElementById('locationInfo');
    const locationName = document.getElementById('locationName');

    if (!locationInfo || !locationName) return;

    let locationText = '';
    switch (currentLevel) {
        case 'district':
            locationText = currentLocation.district;
            break;
        case 'city':
            locationText = currentLocation.city;
            break;
        case 'country':
            locationText = currentLocation.country;
            break;
    }

    locationName.textContent = locationText;
    locationInfo.style.display = 'block';

    // Update button labels with actual location names
    updateLocationButtons();
}

// Update location button labels with actual location names
function updateLocationButtons() {
    const districtBtn = document.getElementById('districtBtn');
    const cityBtn = document.getElementById('cityBtn');
    const countryBtn = document.getElementById('countryBtn');

    console.log('Updating buttons with location:', currentLocation);

    if (districtBtn) {
        const districtName = districtBtn.querySelector('.btn-location-name');
        if (districtName) {
            if (currentLocation.district && currentLocation.district !== 'Unknown') {
                districtName.textContent = currentLocation.district;
            } else {
                districtName.textContent = 'District';
            }
        }
    }

    if (cityBtn) {
        const cityName = cityBtn.querySelector('.btn-location-name');
        if (cityName) {
            if (currentLocation.city && currentLocation.city !== 'Unknown') {
                cityName.textContent = currentLocation.city;
            } else {
                cityName.textContent = 'City';
            }
        }
    }

    if (countryBtn) {
        const countryName = countryBtn.querySelector('.btn-location-name');
        if (countryName) {
            if (currentLocation.country && currentLocation.country !== 'Unknown') {
                countryName.textContent = currentLocation.country;
            } else {
                countryName.textContent = 'Country';
            }
        }
    }
}

// Load leaderboard from backend API (with 15-minute cache)
async function loadLeaderboard(forceRefresh = false) {
    // Check if location is Unknown - show empty state immediately
    const locationKey = currentLevel === 'district' ? currentLocation.district :
                       currentLevel === 'city' ? currentLocation.city :
                       currentLocation.country;
    
    if (!locationKey || locationKey === 'Unknown') {
        console.log('⚠️  Location is Unknown, showing empty state');
        showEmpty();
        return;
    }

    // Check cache first (unless force refresh)
    const cacheKey = `${currentLevel}-${currentLocation.district}-${currentLocation.city}-${currentLocation.country}`;
    const now = new Date();
    
    if (!forceRefresh && leaderboardCache.data && leaderboardCache.level === currentLevel && 
        leaderboardCache.location === cacheKey && leaderboardCache.timestamp) {
        const cacheAge = now - leaderboardCache.timestamp;
        if (cacheAge < UPDATE_INTERVAL) {
            // Use cached data
            console.log(`📦 Using cached leaderboard data (${Math.round(cacheAge / 1000)}s old)`);
            displayLeaderboard(leaderboardCache.data);
            updateLastUpdateDisplay();
            return;
        }
    }

    // Show loading state
    showLoading();

    try {
        // Update title with actual location name
        const title = document.getElementById('leaderboardTitle');
        if (title) {
            let locationName = '';
            switch (currentLevel) {
                case 'district':
                    locationName = currentLocation.district && currentLocation.district !== 'Unknown' 
                        ? currentLocation.district 
                        : 'District';
                    break;
                case 'city':
                    locationName = currentLocation.city && currentLocation.city !== 'Unknown' 
                        ? currentLocation.city 
                        : 'City';
                    break;
                case 'country':
                    locationName = currentLocation.country && currentLocation.country !== 'Unknown' 
                        ? currentLocation.country 
                        : 'Country';
                    break;
            }
            title.textContent = `${locationName} Rankings`;
        }

        // Build API URL with query parameters (include lat/lng for cache lookup)
        const params = new URLSearchParams({
            level: currentLevel,
            district: currentLocation.district || '',
            city: currentLocation.city || '',
            country: currentLocation.country || ''
        });
        
        // Add coordinates for cache lookup if available
        if (currentLocation.latitude && currentLocation.longitude) {
            params.append('lat', currentLocation.latitude);
            params.append('lng', currentLocation.longitude);
        }

        console.log(`🔍 Fetching leaderboard for ${currentLevel}:`, {
            district: currentLocation.district,
            city: currentLocation.city,
            country: currentLocation.country
        });

        // Call backend API
        const response = await fetch(`${API_BASE_URL}/api/rankings?${params.toString()}`);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.error || 'Failed to load rankings');
        }

        // Update cache
        leaderboardCache = {
            data: result.data,
            timestamp: now,
            level: currentLevel,
            location: cacheKey
        };

        // Update last update time
        lastUpdateTime = now;
        updateLastUpdateDisplay();

        // Display leaderboard
        if (result.data && result.data.length > 0) {
            displayLeaderboard(result.data);
        } else {
            showEmpty();
        }
    } catch (error) {
        console.error('Error loading leaderboard:', error);
        showError(`Failed to load rankings: ${error.message}. Make sure the backend API is running.`);
    }
}

// Display leaderboard data in card list
function displayLeaderboard(data) {
    const content = document.getElementById('leaderboardContent');
    if (!content) return;

    let html = '<div class="leaderboard-list">';

    data.forEach((player, index) => {
        const rank = index + 1;
        const rankClass = rank === 1 ? 'rank-1' : rank === 2 ? 'rank-2' : rank === 3 ? 'rank-3' : 'rank-other';
        
        // Format player name: first_name + last_name (first letter only, rest ***)
        const firstName = player.first_name || '';
        let lastName = '';
        if (player.last_name && player.last_name.length > 0) {
            lastName = player.last_name.charAt(0) + '***';
        }
        const playerName = `${firstName} ${lastName}`.trim() || 'Anonymous';
        
        // Get avatar URL or use default
        const avatarUrl = player.avatar_url || '';
        const rating = player.rating || 0;
        
        // Get initials for default avatar
        const initials = (firstName.charAt(0) || '').toUpperCase() + ((player.last_name && player.last_name.length > 0) ? player.last_name.charAt(0).toUpperCase() : '');

        html += '<div class="leaderboard-item">';
        html += `<div class="rank-number ${rankClass}">${rank}</div>`;
        html += '<div class="player-info">';
        if (avatarUrl) {
            html += `<img src="${escapeHtml(avatarUrl)}" alt="${escapeHtml(firstName)}" class="player-avatar" onerror="this.onerror=null; this.style.display='none'; this.nextElementSibling.style.display='flex';">`;
        }
        html += `<div class="player-avatar-default" ${avatarUrl ? 'style="display:none;"' : ''}>${initials || '?'}</div>`;
        html += `<span class="player-name">${escapeHtml(playerName)}</span>`;
        html += '</div>';
        html += `<div class="player-rating">${rating}</div>`;
        html += '</div>';
    });

    html += '</div>';
    content.innerHTML = html;
}

// Show loading state
function showLoading() {
    const content = document.getElementById('leaderboardContent');
    if (content) {
        content.innerHTML = `
            <div class="loading-state">
                <i class="fa-solid fa-spinner fa-spin"></i>
                <p>Loading rankings...</p>
            </div>
        `;
    }
}

// Show error state
function showError(message) {
    const content = document.getElementById('leaderboardContent');
    if (content) {
        content.innerHTML = `
            <div class="error-state">
                <i class="fa-solid fa-exclamation-triangle"></i>
                <p>${escapeHtml(message)}</p>
                <button class="retry-btn" onclick="loadLeaderboard()">Retry</button>
            </div>
        `;
    }
}

// Show empty state
function showEmpty() {
    const content = document.getElementById('leaderboardContent');
    if (content) {
        content.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-trophy"></i>
                <p>No rankings available for this location yet.</p>
            </div>
        `;
    }
}

// Update last update display
function updateLastUpdateDisplay() {
    const lastUpdate = document.getElementById('lastUpdate');
    if (!lastUpdate || !lastUpdateTime) return;

    const now = new Date();
    const diffMs = now - lastUpdateTime;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) {
        lastUpdate.textContent = 'Just now';
    } else if (diffMins === 1) {
        lastUpdate.textContent = '1 minute ago';
    } else if (diffMins < 60) {
        lastUpdate.textContent = `${diffMins} minutes ago`;
    } else {
        const diffHours = Math.floor(diffMins / 60);
        lastUpdate.textContent = diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
    }
}

// Setup auto-refresh
function setupAutoRefresh() {
    // Clear existing timer
    if (updateTimer) {
        clearInterval(updateTimer);
    }

    // Update every UPDATE_INTERVAL milliseconds (force refresh to bypass cache)
    updateTimer = setInterval(() => {
        console.log('🔄 Auto-refreshing leaderboard (15 min interval)...');
        loadLeaderboard(true); // Force refresh to bypass cache
    }, UPDATE_INTERVAL);

    // Also update the "last update" text every minute
    setInterval(() => {
        if (lastUpdateTime) {
            updateLastUpdateDisplay();
        }
    }, 60000);
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Make loadLeaderboard available globally for retry button
window.loadLeaderboard = loadLeaderboard;
