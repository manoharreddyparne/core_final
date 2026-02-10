// Geolocation hook for capturing browser location
import { useState, useEffect } from "react";

export interface GeolocationData {
    latitude: number;
    longitude: number;
    accuracy: number;
    timestamp: number;
}

export const useGeolocation = (enabled: boolean = true) => {
    const [location, setLocation] = useState<GeolocationData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!enabled || !navigator.geolocation) {
            setError("Geolocation not supported");
            return;
        }

        setLoading(true);

        const successHandler = (position: GeolocationPosition) => {
            setLocation({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy,
                timestamp: position.timestamp,
            });
            setError(null);
            setLoading(false);
        };

        const errorHandler = (err: GeolocationPositionError) => {
            setError(err.message);
            setLoading(false);
        };

        // Get current position
        navigator.geolocation.getCurrentPosition(successHandler, errorHandler, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0,
        });

        // Watch position for updates
        const watchId = navigator.geolocation.watchPosition(
            successHandler,
            errorHandler,
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 60000, // Cache for 1 minute
            }
        );

        return () => {
            navigator.geolocation.clearWatch(watchId);
        };
    }, [enabled]);

    return { location, error, loading };
};
