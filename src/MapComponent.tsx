import React, { useRef, useEffect, useState } from 'react';
import maplibregl from 'maplibre-gl';

const MapComponent: React.FC = () => {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const [isAddingElement, setIsAddingElement] = useState<'point' | 'line' | null>(null)
  const [lineCoordinates, setLineCoordinates] = useState<Array<[number, number]>>([])

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

      mapRef.current!.addSource('lines', {
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
          'circle-radius': 9,
          'circle-color': '#bc5bec'
        }
      })

      mapRef.current!.addLayer({
        id: 'lines',
        type: 'line',
        source: 'lines',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#6600ff',
          'line-width': 5
        }
      })
    })

    return () => mapRef.current?.remove()
  }, [])

  // Отдельный useEffect для обработки кликов на карте
  useEffect(() => {
    const onClick = async (event: maplibregl.MapMouseEvent) => {
      const features = mapRef.current!.queryRenderedFeatures(event.point, { layers: ['points', 'lines'] })

      if (features.length) {
        // Клик по существующей точке или линии
        const geometry = features[0].geometry as GeoJSON.Geometry
        const description = features[0].properties?.creationDate || 'Дата не указана'
        let coordinates

        if (geometry.type === 'Point') {
          coordinates = geometry.coordinates.slice()
        } else if (geometry.type === 'LineString') {
          coordinates = geometry.coordinates[0].slice() // показываем попап у первой точки линии
        }

        if (coordinates) {
          while (Math.abs(event.lngLat.lng - coordinates[0]) > 180) {
            coordinates[0] += coordinates[0] > event.lngLat.lng ? -360 : 360
          }

          new maplibregl.Popup()
          .setLngLat(coordinates as [number, number])
          .setHTML(`Дата создания: ${description}`)
          .addTo(mapRef.current!)
        }
      } else if (isAddingElement === 'point') {
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
        };

        data.features.push(newFeature)
        source.setData(data)
        setIsAddingElement(null) // Сбросить режим добавления
      } else if (isAddingElement === 'line') {
        // Добавление новой линии
        const newCoord = [event.lngLat.lng, event.lngLat.lat] as [number, number]
        const newCoords = [...lineCoordinates, newCoord]
        setLineCoordinates(newCoords)
        if (newCoords.length > 1) {
          const source = mapRef.current!.getSource('lines') as maplibregl.GeoJSONSource
          const data = await source.getData() as GeoJSON.FeatureCollection<GeoJSON.Geometry>
          const creationDate = new Date().toLocaleDateString('ru-RU')

          const newFeature: GeoJSON.Feature<GeoJSON.Geometry> = {
            type: 'Feature',
            properties: {
              creationDate: creationDate
            },
            geometry: {
              type: 'LineString',
              coordinates: newCoords
            }
          }

          data.features.push(newFeature)
          source.setData(data)
          setIsAddingElement(null) // Сбросить режим добавления
          setLineCoordinates([]) // Очистка координат линии
        }
      }
    }

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
  }, [isAddingElement, lineCoordinates])

  return <div>
    <button onClick={() => setIsAddingElement('point')}>Добавить точку</button>
    <button onClick={() => setIsAddingElement('line')}>Добавить линию</button>
    <div ref={mapContainerRef} style={{ width: '100vw', height: '100vh' }} />
  </div>
}

export default MapComponent;
