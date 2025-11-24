// Lightweight background rankings prefetcher
// Kicks off on any page load to warm up the rankings cache so the actual
// rankings page can render instantly.
(function () {
    const PREFETCH_STORAGE_KEY = 'rr_rankings_prefetch_v1';
    const PREFETCH_COUNTRY_KEY = 'rr_rankings_country_v1';
    const LOCATION_CACHE_KEY = 'rr_location_cache_v1';
    const PREFETCH_COOLDOWN = 30 * 60 * 1000; // 30 minutes
    const COUNTRY_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
    const LOCATION_TTL = 60 * 60 * 1000; // 1 hour

    if (window.__disableRankingsPrefetch) {
        console.info('🏓 Rankings prefetch dev override aktif, prefetch iptal.');
        return;
    }

    function resolveApiBaseUrl() {
        if (window.API_BASE_URL) {
            return window.API_BASE_URL;
        }
        const hostname = window.location.hostname;
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return 'http://localhost:3000';
        }
        return window.location.origin;
    }

    function getStoredPrefetch() {
        try {
            const raw = localStorage.getItem(PREFETCH_STORAGE_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch (error) {
            console.warn('Unable to read rankings prefetch cache:', error);
            return null;
        }
    }

    function storePrefetch(payload) {
        try {
            localStorage.setItem(PREFETCH_STORAGE_KEY, JSON.stringify(payload));
        } catch (error) {
            console.warn('Unable to persist rankings prefetch cache:', error);
        }
        window.__prefetchedLeaderboard = payload;
    }

    function getCachedCountry() {
        try {
            const raw = localStorage.getItem(PREFETCH_COUNTRY_KEY);
            if (!raw) {
                return null;
            }
            const parsed = JSON.parse(raw);
            if (!parsed || !parsed.country || !parsed.timestamp) {
                return null;
            }
            if (Date.now() - parsed.timestamp > COUNTRY_CACHE_TTL) {
                return null;
            }
            return parsed.country;
        } catch (error) {
            console.warn('Unable to read cached country:', error);
            return null;
        }
    }

    function storeCountry(country) {
        try {
            localStorage.setItem(
                PREFETCH_COUNTRY_KEY,
                JSON.stringify({ country, timestamp: Date.now() })
            );
        } catch (error) {
            console.warn('Unable to cache country:', error);
        }
    }

    function getCachedLocation() {
        if (window.__prefetchedLocation) {
            return window.__prefetchedLocation;
        }
        try {
            const raw = localStorage.getItem(LOCATION_CACHE_KEY);
            if (!raw) {
                return null;
            }
            const parsed = JSON.parse(raw);
            if (!parsed || !parsed.timestamp) {
                return null;
            }
            if (Date.now() - parsed.timestamp > LOCATION_TTL) {
                return null;
            }
            window.__prefetchedLocation = parsed;
            return parsed;
        } catch (error) {
            console.warn('Unable to read cached location:', error);
            return null;
        }
    }

    function storeLocation(payload) {
        const extended = {
            ...payload,
            timestamp: Date.now()
        };
        try {
            localStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify(extended));
        } catch (error) {
            console.warn('Unable to cache location:', error);
        }
        window.__prefetchedLocation = extended;
        if (extended.country) {
            storeCountry(extended.country);
        }
    }

    async function detectCountry() {
        const cachedCountry = getCachedCountry();
        if (cachedCountry) {
            return cachedCountry;
        }

        const cachedLocation = getCachedLocation();
        if (cachedLocation && cachedLocation.country) {
            return cachedLocation.country;
        }

        try {
            const response = await fetch('https://ipapi.co/json/');
            const data = await response.json();
            if (data && data.country_name) {
                storeCountry(data.country_name);
                return data.country_name;
            }
        } catch (error) {
            console.warn('Rankings prefetch: country lookup failed', error);
        }
        return null;
    }

    function recentlyPrefetched() {
        const payload = getStoredPrefetch();
        if (!payload || !payload.fetchedAt) {
            return false;
        }
        return Date.now() - payload.fetchedAt < PREFETCH_COOLDOWN;
    }

    async function prefetchRankings() {
        if (!navigator.onLine) {
            console.info('🏓 Rankings prefetch: çevrimdışı, istek atılmadı.');
            return;
        }
        if (recentlyPrefetched()) {
            console.info('🏓 Rankings prefetch: sıcak cache mevcut, tekrar istek atılmadı.');
            return;
        }
        const country = await detectCountry();
        if (!country) {
            console.warn('🏓 Rankings prefetch: ülke belirlenemedi.');
            return;
        }

        const apiBase = resolveApiBaseUrl();
        const params = new URLSearchParams({ country });

        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 10000);
            console.info(`🏓 Rankings prefetch: ${country} için istek atılıyor...`);
            const response = await fetch(`${apiBase}/api/rankings?${params.toString()}`, {
                signal: controller.signal
            });
            clearTimeout(timeout);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const result = await response.json();
            if (!result || result.success === false || !Array.isArray(result.data)) {
                throw new Error(result && (result.error || result.message) || 'Malformed response');
            }

            const payload = {
                country,
                data: result.data,
                fetchedAt: Date.now(),
                cacheAgeSeconds: result.cache_age_seconds || 0
            };

            storePrefetch(payload);
            console.info(`✅ Rankings prefetch tamamlandı (${country}, kayıt: ${result.data.length})`);
        } catch (error) {
            console.warn('🏓 Rankings prefetch başarısız:', error);
        }
    }

    async function prefetchGeolocation() {
        if (!navigator.geolocation) {
            console.info('🏓 Rankings location prefetch: geolocation desteklenmiyor.');
            return;
        }

        if (getCachedLocation()) {
            console.info('🏓 Rankings location prefetch: güncel konum cache\'i mevcut.');
            return;
        }

        const run = () => {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const { latitude, longitude } = position.coords;
                    console.info('🏓 Rankings location prefetch: koordinatlar alındı.');

                    let country = null;
                    try {
                        country = await reverseGeocodeCountry(latitude, longitude);
                    } catch (error) {
                        console.warn('🏓 Rankings location prefetch: reverse geocode başarısız.', error);
                    }

                    if (!country) {
                        country = await detectCountry();
                    }

                    storeLocation({ latitude, longitude, country });
                    console.info('✅ Rankings location prefetch tamamlandı.');
                },
                (error) => {
                    console.warn('🏓 Rankings location prefetch başarısız:', error);
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: LOCATION_TTL
                }
            );
        };

        if (document.visibilityState === 'hidden') {
            document.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'visible') {
                    run();
                }
            }, { once: true });
            return;
        }

        if ('requestIdleCallback' in window) {
            window.requestIdleCallback(run, { timeout: 2000 });
        } else {
            setTimeout(run, 1500);
        }
    }

    async function reverseGeocodeCountry(lat, lng) {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
            {
                headers: { 'User-Agent': 'RacketRank/1.0' }
            }
        );

        if (!response.ok) {
            throw new Error('Reverse geocoding failed');
        }

        const data = await response.json();
        const country = data?.address?.country;
        return country || null;
    }

    function schedulePrefetch() {
        if (document.visibilityState === 'hidden') {
            document.addEventListener(
                'visibilitychange',
                () => document.visibilityState === 'visible' && prefetchRankings(),
                { once: true }
            );
            return;
        }

        if ('requestIdleCallback' in window) {
            window.requestIdleCallback(() => {
                console.info('🏓 Rankings prefetch: idle callback tetiklendi.');
                prefetchRankings();
            }, { timeout: 2000 });
        } else {
            setTimeout(() => {
                console.info('🏓 Rankings prefetch: timeout tetiklendi.');
                prefetchRankings();
            }, 1500);
        }
    }

    function scheduleAll() {
        schedulePrefetch();
        prefetchGeolocation();
    }

    if (document.readyState === 'complete') {
        scheduleAll();
    } else {
        window.addEventListener('load', scheduleAll, { once: true });
    }
})();


