// Rankings Page - Country-based Leaderboard
// Uses backend API instead of direct Supabase connection for security

// Backend API URL
const API_BASE_URL = window.API_BASE_URL || 'http://localhost:3000';

// Normalize country names to handle variants
function normalizeCountryName(countryName) {
    if (!countryName) return null;

    const normalized = countryName.toLowerCase().trim();

    // Turkey variants
    if (['turkey', 'türkiye', 'turkiye', 'tr'].includes(normalized)) {
        return 'Turkey';
    }

    // USA variants
    if (['usa', 'united states', 'united states of america', 'amerika birleşik devletleri',
        'amerika birlesik devletleri', 'us', 'u.s.a.', 'u.s.'].includes(normalized)) {
        return 'United States';
    }

    // UK variants
    if (['uk', 'united kingdom', 'birleşik krallık', 'birlesik krallik',
        'great britain', 'england'].includes(normalized)) {
        return 'United Kingdom';
    }

    // Germany variants
    if (['germany', 'deutschland', 'almanya', 'de'].includes(normalized)) {
        return 'Germany';
    }

    // France variants
    if (['france', 'fransa', 'fr'].includes(normalized)) {
        return 'France';
    }

    // Spain variants
    if (['spain', 'españa', 'ispanya', 'es'].includes(normalized)) {
        return 'Spain';
    }

    // Italy variants
    if (['italy', 'italia', 'italya', 'it'].includes(normalized)) {
        return 'Italy';
    }

    // Netherlands variants
    if (['netherlands', 'holland', 'hollanda', 'nl'].includes(normalized)) {
        return 'Netherlands';
    }

    // Greece variants
    if (['greece', 'yunanistan', 'gr'].includes(normalized)) {
        return 'Greece';
    }

    // Canada variants
    if (['canada', 'kanada', 'ca'].includes(normalized)) {
        return 'Canada';
    }

    // Australia variants
    if (['australia', 'avustralya', 'au'].includes(normalized)) {
        return 'Australia';
    }

    // Brazil variants
    if (['brazil', 'brasil', 'brezilya', 'br'].includes(normalized)) {
        return 'Brazil';
    }

    // If no match found, return capitalized version
    return countryName.charAt(0).toUpperCase() + countryName.slice(1).toLowerCase();
}

// Current location data
let currentLocation = {
    latitude: null,
    longitude: null,
    country: null
};

// Update interval (2 hours = 7200000 ms)
const UPDATE_INTERVAL = 2 * 60 * 60 * 1000; // 2 hours

// Last update timestamp
let lastUpdateTime = null;
let updateTimer = null;

// Cache for leaderboard data (2 hours)
let leaderboardCache = {
    data: null,
    timestamp: null,
    country: null
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    // Get user location
    await getUserLocation();

    // Load initial leaderboard
    await loadLeaderboard();

    // Setup auto-refresh
    setupAutoRefresh();
});

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

                // Reverse geocode to get country
                await reverseGeocode(currentLocation.latitude, currentLocation.longitude);

                // Update location info display
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

// Reverse geocode coordinates to get country
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

        console.log('📍 Nominatim API response:', data);

        const address = data.address || {};

        // Extract and normalize country
        const countryName = address.country || 'Unknown';
        currentLocation.country = normalizeCountryName(countryName);

        console.log('✅ Detected country:', currentLocation.country);

        // Update location info display
        updateLocationInfo();
    } catch (error) {
        console.error('Reverse geocoding error:', error);
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

        // Normalize country name
        const countryName = data.country_name || 'Unknown';
        currentLocation.country = normalizeCountryName(countryName);

        console.log('✅ IP-based country:', currentLocation.country);

        // Update location info display
        updateLocationInfo();
    } catch (error) {
        console.error('IP geolocation error:', error);
        currentLocation.country = 'Unknown';
    }
}

// Update location info display
function updateLocationInfo() {
    const countryBtn = document.getElementById('countryBtn');

    if (countryBtn) {
        const countryNameSpan = countryBtn.querySelector('.btn-location-name');
        if (countryNameSpan) {
            if (currentLocation.country && currentLocation.country !== 'Unknown') {
                countryNameSpan.textContent = currentLocation.country;
            } else {
                countryNameSpan.textContent = 'Country';
            }
        }
    }
}

// Load leaderboard from backend API (with 2-hour cache)
async function loadLeaderboard(forceRefresh = false) {
    // Check if country is Unknown - show empty state immediately
    if (!currentLocation.country || currentLocation.country === 'Unknown') {
        console.log('⚠️  Country is Unknown, showing empty state');
        showEmpty();
        return;
    }

    // Check cache first (unless force refresh)
    const now = new Date();

    if (!forceRefresh && leaderboardCache.data &&
        leaderboardCache.country === currentLocation.country &&
        leaderboardCache.timestamp) {
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
        // Update title with country name
        const title = document.getElementById('leaderboardTitle');
        if (title) {
            const countryName = currentLocation.country && currentLocation.country !== 'Unknown'
                ? currentLocation.country
                : 'Country';
            title.textContent = `${countryName} Rankings`;
        }

        // Build API URL with query parameters
        const params = new URLSearchParams({
            country: currentLocation.country
        });

        // Add coordinates for better geocoding if available
        if (currentLocation.latitude && currentLocation.longitude) {
            params.append('lat', currentLocation.latitude);
            params.append('lng', currentLocation.longitude);
        }

        console.log(`🔍 Fetching leaderboard for country: ${currentLocation.country}`);

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
            country: currentLocation.country
        };

        // Update last update time based on cache status
        if (result.cached && result.cache_age_seconds) {
            // Data is from cache - calculate when it was originally fetched
            lastUpdateTime = new Date(now.getTime() - (result.cache_age_seconds * 1000));
            console.log(`📦 Using cached data (${result.cache_age_seconds}s old)`);
        } else {
            // Fresh data
            lastUpdateTime = now;
            console.log(`✅ Fresh data loaded`);
        }
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

    // Update every UPDATE_INTERVAL milliseconds (2 hours)
    updateTimer = setInterval(() => {
        console.log('🔄 Auto-refreshing leaderboard (2 hour interval)...');
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
