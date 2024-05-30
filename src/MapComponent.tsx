import React, { useRef, useEffect, useState } from 'react';
import maplibregl from 'maplibre-gl';

const MapComponent: React.FC = () => {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const [isAddingPoint, setIsAddingPoint] = useState<boolean>(false) // Управление возможностью добавления точки

  useEffect(() => {
    mapRef.current = new maplibregl.Map({
      container: mapContainerRef.current!,
      style: 'https://api.maptiler.com/maps/streets/style.json?key=8JG1p3uOcXYC9VOVTSC2', // todo env
      center: [37.618423, 55.751244],
      zoom: 10
    })

    mapRef.current.on('load', () => {
      mapRef.current!.addSource('points', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: []
        }
      })

      mapRef.current!.addLayer({
        id: 'points',
        type: 'circle',
        source: 'points',
        paint: {
          'circle-radius': 10,
          'circle-color': '#007cbf'
        }
      })
    })

    return () => mapRef.current?.remove();
  }, [])

  // Отдельный useEffect для обработки кликов на карте
  useEffect(() => {
    const onClick = async (event: maplibregl.MapMouseEvent) => {
      const features = mapRef.current!.queryRenderedFeatures(event.point, { layers: ['points'] })

      if (features.length && !isAddingPoint) {
        // Клик по существующей точке
        const geometry = features[0].geometry as GeoJSON.Point
        const coordinates = geometry.coordinates.slice()
        const description = features[0].properties?.creationDate || 'Дата не указана'

        while (Math.abs(event.lngLat.lng - coordinates[0]) > 180) {
          coordinates[0] += coordinates[0] > event.lngLat.lng ? -360 : 360
        }

        new maplibregl.Popup()
        .setLngLat(coordinates as [number, number])
        .setHTML(`Дата создания: ${description}`)
        .addTo(mapRef.current!);
      } else if (isAddingPoint) {
        // Добавление новой точки
        const source = mapRef.current!.getSource('points') as maplibregl.GeoJSONSource
        const data = await source.getData() as GeoJSON.FeatureCollection<GeoJSON.Geometry>
        const creationDate = new Date().toLocaleDateString('ru-RU')

        const newFeature: GeoJSON.Feature<GeoJSON.Geometry> = {
          type: 'Feature',
          properties: {
            creationDate: creationDate
          },
          geometry: {
            type: 'Point',
            coordinates: [event.lngLat.lng, event.lngLat.lat]
          }
        }

        data.features.push(newFeature)
        source.setData(data)
        setIsAddingPoint(false) // Сбросить разрешение на добавление точки
      }
    };

    if (mapRef.current) {
      mapRef.current.on('click', onClick)
      // Меням курсор на точках
      mapRef.current.on('mouseenter', 'points', () => {
        mapRef.current!.getCanvas().style.cursor = 'pointer'
      })
      mapRef.current.on('mouseleave', 'points', () => {
        mapRef.current!.getCanvas().style.cursor = ''
      })
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.off('click', onClick)
      }
    }
  }, [isAddingPoint])

  return <div>
    <button onClick={() => setIsAddingPoint(true)}>Добавить точку</button>
    <div ref={mapContainerRef} style={{ width: '100vw', height: '100vh' }} />
  </div>
}

export default MapComponent;
