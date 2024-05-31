import React, { useRef, useEffect, useState, useCallback } from 'react';
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

      mapRef.current!.addSource('previewLine', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: []
          }
        }
      })

      mapRef.current!.addLayer({
        id: 'points',
        type: 'circle',
        source: 'points',
        paint: {
          'circle-radius': 9,
          'circle-color': '#ff81f4'
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
          'line-color': '#a56bff',
          'line-width': 5
        }
      })

      mapRef.current!.addLayer({
        id: 'previewLine',
        type: 'line',
        source: 'previewLine',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': 'rgba(154,92,253,0.4)',
          'line-width': 3,
          'line-dasharray': [3, 3]
        }
      })
    })

    return () => mapRef.current?.remove()
  }, [])

  const onMouseMove = useCallback((e: maplibregl.MapMouseEvent) => {
    const previewLineSource = mapRef.current!.getSource('previewLine') as maplibregl.GeoJSONSource
    previewLineSource.setData({
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: [lineCoordinates[0], [e.lngLat.lng, e.lngLat.lat]]
      }
    })
  }, [lineCoordinates, isAddingElement])

  // Отдельный useEffect для обработки кликов на карте
  useEffect(() => {
    if (isAddingElement === 'line' && lineCoordinates.length === 1) {
      mapRef.current!.on('mousemove', onMouseMove);
    }

    const onClick = async (event: maplibregl.MapMouseEvent) => {
      const features = mapRef.current!.queryRenderedFeatures(event.point, { layers: ['points', 'lines'] })

      if (features.length) { // Клик по существующей точке или линии
        const geometry = features[0].geometry as GeoJSON.Geometry
        const description = features[0].properties?.creationDate || 'Дата не указана'
        let coordinates

        if (geometry.type === 'Point') {
          coordinates = geometry.coordinates.slice()
        } else if (geometry.type === 'LineString') {
          coordinates = geometry.coordinates[0].slice() // Показываем попап у первой точки линии
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
      } else if (isAddingElement === 'line') { // Создание линии
        const newCoord = [event.lngLat.lng, event.lngLat.lat] as [number, number]
        const newCoords = [...lineCoordinates, newCoord]
        setLineCoordinates(current => [...current, newCoord])

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
          setIsAddingElement(null)
          setLineCoordinates([])
          mapRef.current!.off('mousemove', onMouseMove)
          const previewLineSource = mapRef.current!.getSource('previewLine') as maplibregl.GeoJSONSource
          previewLineSource.setData({
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: []
            }
          })
        }
      } else if (isAddingElement === 'point') { // Создание точки
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
        setIsAddingElement(null)
      }
    }

    if (mapRef.current) {
      mapRef.current.on('click', onClick)
      // Меням курсор на созданных точках и линиях
      mapRef.current.on('mouseenter', 'points', () => {
        mapRef.current!.getCanvas().style.cursor = 'pointer'
      })
      mapRef.current.on('mouseleave', 'points', () => {
        mapRef.current!.getCanvas().style.cursor = ''
      })
      mapRef.current.on('mouseenter', 'lines', () => {
        mapRef.current!.getCanvas().style.cursor = 'pointer'
      })
      mapRef.current.on('mouseleave', 'lines', () => {
        mapRef.current!.getCanvas().style.cursor = ''
      })
    }

    return () => {
      mapRef.current!.off('click', onClick)
      if (isAddingElement === 'line') {
        mapRef.current!.off('mousemove', onMouseMove)
      }
    }
  }, [isAddingElement, lineCoordinates])

  const filterElements = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (mapRef.current) {
      mapRef.current.setLayoutProperty(
        e.target.id,
        'visibility',
        e.target.checked ? 'visible' : 'none'
      )
    }
  }

  const deleteElements = (type: string) => {
    if (!mapRef.current) return;

      const source = mapRef.current.getSource(type) as maplibregl.GeoJSONSource;
      if (source) {
        source.setData({
          type: 'FeatureCollection',
          features: [] // Устанавливаем пустой массив features, удаляя все элементы
        })
      }
  }

  return <div>
    <button onClick={() => setIsAddingElement('point')}>Добавить точку</button>
    <button onClick={() => setIsAddingElement('line')}>Добавить линию</button>
    <input type="checkbox" id="lines" defaultChecked={true} onChange={(e) => filterElements(e)} />
    <label htmlFor="lines">Показ линий</label>
    <input type="checkbox" id="points" defaultChecked={true} onChange={(e) => filterElements(e)} />
    <label htmlFor="points">Показ точек</label>
    <button onClick={() => deleteElements('points')}>Удалить точки</button>
    <button onClick={() => deleteElements('lines')}>Удалить линии</button>
    <div ref={mapContainerRef} style={{ width: '100vw', height: '100vh' }} />
  </div>
}

export default MapComponent;
