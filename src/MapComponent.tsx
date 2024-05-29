import React, { useRef, useEffect } from 'react';
import maplibregl from 'maplibre-gl';

const MapComponent: React.FC = () => {
  const mapContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: 'https://api.maptiler.com/maps/streets/style.json?key=8JG1p3uOcXYC9VOVTSC2',
      center: [37.618423, 55.751244],
      zoom: 10
    });

    map.on('load', () => {
      map.addSource('points', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: []
        }
      });

      map.addLayer({
        id: 'points',
        type: 'circle',
        source: 'points',
        paint: {
          'circle-radius': 10,
          'circle-color': '#007cbf'
        }
      });

      // Слушатель для создания точек
      map.on('click', (e) => {

      });
    });

  }, []);

  return <div ref={mapContainerRef} style={{ width: '100vw', height: '100vh' }} />;
};

export default MapComponent;
