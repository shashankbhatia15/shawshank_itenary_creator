import React, { useEffect, useRef } from 'react';
import type { ItineraryLocation } from '../types';

// Since we are loading Leaflet via a script tag, we need to declare the 'L' global.
declare var L: any;

interface InteractiveMapProps {
    locations: ItineraryLocation[];
    highlightedId: string | null;
    onMarkerClick: (id: string) => void;
    dayTitle: string;
}

const InteractiveMap: React.FC<InteractiveMapProps> = ({ locations, highlightedId, onMarkerClick, dayTitle }) => {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<any>(null);
    const markersRef = useRef<any>({});

    const defaultIcon = L.icon({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        shadowSize: [41, 41]
    });

    const highlightedIcon = L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        shadowSize: [41, 41]
    });

    // Initialize map
    useEffect(() => {
        if (mapContainerRef.current && !mapRef.current) {
            mapRef.current = L.map(mapContainerRef.current).setView([0, 0], 2);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(mapRef.current);
        }
        
        // Invalidate size on modal open to ensure it renders correctly
        setTimeout(() => {
            mapRef.current?.invalidateSize();
        }, 100);

    }, []);

    // Update markers and view
    useEffect(() => {
        if (!mapRef.current || locations.length === 0) return;

        // Clear existing markers
        Object.values(markersRef.current).forEach((marker: any) => marker.remove());
        markersRef.current = {};

        const validLocations = locations.filter(loc => loc.lat != null && loc.lng != null);
        if (validLocations.length === 0) return;

        const bounds = L.latLngBounds();

        validLocations.forEach(location => {
            const marker = L.marker([location.lat, location.lng], { icon: defaultIcon })
                .addTo(mapRef.current)
                .bindPopup(`<b>${location.name}</b>`)
                .on('click', () => onMarkerClick(location.id));
            
            markersRef.current[location.id] = marker;
            bounds.extend([location.lat, location.lng]);
        });
        
        // Fit map to markers
        if (bounds.isValid()) {
             mapRef.current.fitBounds(bounds, { padding: [50, 50] });
        }

    }, [locations, dayTitle]); // Rerun when locations or day changes

     // Handle highlighting
    useEffect(() => {
        if (!mapRef.current) return;
        
        Object.entries(markersRef.current).forEach(([id, marker]: [string, any]) => {
            if (id === highlightedId) {
                marker.setIcon(highlightedIcon);
                marker.openPopup();
            } else {
                marker.setIcon(defaultIcon);
            }
        });

    }, [highlightedId]);


    return (
      <div className="relative w-full h-full">
        <h3 className="absolute top-2 left-1/2 -translate-x-1/2 bg-slate-900/70 text-white text-lg font-bold p-2 px-4 rounded-lg z-[1000]">
            {dayTitle}
        </h3>
        <div ref={mapContainerRef} className="h-[60vh] md:h-[70vh] w-full rounded-lg" />
      </div>
    );
};

export default InteractiveMap;
