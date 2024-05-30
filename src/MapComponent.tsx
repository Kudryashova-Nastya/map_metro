import React, { useRef, useEffect, useState } from 'react';
import maplibregl from 'maplibre-gl';

const MapComponent: React.FC = () => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [isAddingPoint, setIsAddingPoint] = useState(false); // Управление возможностью добавления точки

  useEffect(() => {
    mapRef.current = new maplibregl.Map({
      container: mapContainerRef.current!,
      style: 'https://api.maptiler.com/maps/streets/style.json?key=8JG1p3uOcXYC9VOVTSC2', // todo env
      center: [37.618423, 55.751244],
      zoom: 10
    });

    mapRef.current.on('load', () => {
      mapRef.current!.addSource('points', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: []
        }
      });

      mapRef.current!.addLayer({
        id: 'points',
        type: 'circle',
        source: 'points',
        paint: {
          'circle-radius': 10,
          'circle-color': '#007cbf'
        }
      });
    });

    return () => mapRef.current?.remove();
  }, []);

  // Отдельный useEffect для обработки кликов на карте
  useEffect(() => {
    if (!isAddingPoint) return;

    const onClick = async (event: maplibregl.MapMouseEvent) => {
      console.log('click')
      const source = mapRef.current!.getSource('points') as maplibregl.GeoJSONSource;
      const data = await source.getData() as GeoJSON.FeatureCollection<GeoJSON.Geometry>;

      const newFeature: GeoJSON.Feature<GeoJSON.Geometry> = {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Point',
          coordinates: [event.lngLat.lng, event.lngLat.lat]
        }
      };

      data.features.push(newFeature);
      source.setData(data);
      setIsAddingPoint(false); // Сбросить разрешение на добавление точки
    };

    if (mapRef.current) {
      mapRef.current.on('click', onClick);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.off('click', onClick);
      }
    };
  }, [isAddingPoint])

  return <div>
    <button onClick={() => setIsAddingPoint(true)}>Добавить точку</button>
    <div ref={mapContainerRef} style={{ width: '100vw', height: '100vh' }} />
  </div>;
};

export default MapComponent;
