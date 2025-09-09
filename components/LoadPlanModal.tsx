import React, { useEffect, useRef, useMemo } from 'react';
import type { DailyPlan, CityAccommodationCost, CurrencyInfo } from '../types';

declare var L: any;

interface TripOverviewMapProps {
    itinerary: DailyPlan[];
    cityAccommodationCosts: CityAccommodationCost[];
    currencyInfo: CurrencyInfo;
}

const CostDisplayHTML = (usd: number, currencyInfo: CurrencyInfo, className: string = ''): string => {
    if (!currencyInfo || usd <= 0) return `<span class="${className}">N/A</span>`;

    const inr = usd * currencyInfo.usdToInrRate;
    const local = usd * currencyInfo.usdToLocalRate;

    return (
        `<span class="${className}">
            ₹${inr.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            <span style="color: #94a3b8; font-size: 0.8rem; margin-left: 0.25rem; font-weight: 400;">
                (${currencyInfo.symbol}${local.toLocaleString(undefined, { maximumFractionDigits: 0 })})
            </span>
        </span>`
    );
};


const TripOverviewMap: React.FC<TripOverviewMapProps> = ({ itinerary, cityAccommodationCosts, currencyInfo }) => {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<any>(null);

    const citiesWithCoords = useMemo(() => {
        const citySet = new Set<string>();
        itinerary.forEach(day => {
            day.activities.forEach(activity => {
                if (activity.city && activity.lat != null && activity.lng != null) {
                    citySet.add(activity.city);
                }
            });
        });
        return Array.from(citySet);
    }, [itinerary]);

    useEffect(() => {
        const cityData: { [key: string]: { lat?: number; lng?: number; accommodationCost: number; activitiesCost: number } } = {};

        cityAccommodationCosts.forEach(cost => {
            if (!cityData[cost.city]) {
                cityData[cost.city] = { accommodationCost: 0, activitiesCost: 0 };
            }
            cityData[cost.city].accommodationCost += cost.estimatedCost;
        });

        itinerary.forEach(day => {
            day.activities.forEach(activity => {
                if (!cityData[activity.city]) {
                    cityData[activity.city] = { accommodationCost: 0, activitiesCost: 0 };
                }
                const city = cityData[activity.city];
                city.activitiesCost += activity.averageCost;
                if ((!city.lat || !city.lng) && activity.lat != null && activity.lng != null) {
                    city.lat = activity.lat;
                    city.lng = activity.lng;
                }
            });
        });

        const validCities = Object.entries(cityData).filter(([, data]) => data.lat != null && data.lng != null);
        
        if (!mapContainerRef.current || validCities.length === 0) return;

        if (!mapRef.current) {
            mapRef.current = L.map(mapContainerRef.current).setView([0, 0], 2);
            L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            }).addTo(mapRef.current);
        }
        
        mapRef.current.eachLayer((layer: any) => {
            if (layer instanceof L.Marker) {
                mapRef.current.removeLayer(layer);
            }
        });

        const bounds = L.latLngBounds();

        validCities.forEach(([cityName, data]) => {
            if (data.lat && data.lng) {
                const totalCost = data.accommodationCost + data.activitiesCost;
                const popupContent = `
                    <div style="font-family: sans-serif; color: #1e293b;">
                        <h4 style="font-weight: bold; font-size: 1.1rem; margin: 0 0 8px 0; color: #0891b2;">${cityName}</h4>
                        <p style="margin: 0; font-size: 0.9rem;">
                            <strong>Total Est. Cost:</strong><br/>
                            ${CostDisplayHTML(totalCost, currencyInfo)}
                        </p>
                    </div>
                `;
                const marker = L.marker([data.lat, data.lng]).addTo(mapRef.current);
                marker.bindPopup(popupContent);
                marker.bindTooltip(cityName, {
                    permanent: true,
                    direction: 'top',
                    offset: [0, -10],
                    className: 'city-label'
                }).openTooltip();

                bounds.extend([data.lat, data.lng]);
            }
        });

        setTimeout(() => {
            mapRef.current?.invalidateSize();
            if (bounds.isValid()) {
                 mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 10 });
            }
        }, 100);

    }, [itinerary, cityAccommodationCosts, currencyInfo]);
    
    if (citiesWithCoords.length === 0) {
        return null;
    }

    return (
        <div className="mb-10 p-6 bg-slate-800 rounded-xl border border-slate-700">
             <h3 className="text-xl font-bold text-cyan-300 mb-4 text-center">Trip Cost Overview Map</h3>
             <div ref={mapContainerRef} className="h-[400px] w-full rounded-lg z-0" />
        </div>
    );
};

export default TripOverviewMap;