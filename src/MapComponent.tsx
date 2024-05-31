import React, { useRef, useEffect, useState, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import { Button, Divider, FormControlLabel, List, ListItem, Switch, Typography } from "@mui/material";
import DeleteIcon from '@mui/icons-material/Delete';

const MapComponent: React.FC = () => {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const [isAddingElement, setIsAddingElement] = useState<'point' | 'line' | null>(null)
  const [lineCoordinates, setLineCoordinates] = useState<Array<[number, number]>>([])

  useEffect(() => {
    mapRef.current = new maplibregl.Map({
      container: mapContainerRef.current!,
      style: `https://api.maptiler.com/maps/streets/style.json?key=${process.env.REACT_APP_KEY}`,
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
          'circle-radius': 10,
          'circle-color': '#ff6bf2'
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
          'line-color': 'rgba(154,92,253,0.45)',
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

  const deletePreviewLine = () => {
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

  // Отдельный useEffect для обработки кликов на карте
  useEffect(() => {
    if (isAddingElement === 'line' && lineCoordinates.length === 1) {
      mapRef.current!.on('mousemove', onMouseMove)
    }

    // Если до нажатия на кнопку создания точки на карте была недоделанная линия, удаляем её
    if (isAddingElement === 'point' && lineCoordinates.length > 0) {
      deletePreviewLine()
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
          deletePreviewLine()
        }
      } else if (isAddingElement === 'point') { // Создание точки
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

    deletePreviewLine()
    setIsAddingElement(null)
    const source = mapRef.current.getSource(type) as maplibregl.GeoJSONSource
    if (source) {
      source.setData({
        type: 'FeatureCollection',
        features: [] // Устанавливаем пустой массив features, удаляя все элементы
      })
    }
  }

  const style = {
    p: 1,
    width: '100%',
    maxWidth: 230,
    borderRadius: 4,
    border: '1px solid',
    borderColor: 'divider',
    backgroundColor: 'background.paper',
    position: 'fixed',
    zIndex: '20',
    top: 20,
    right: 20
  }

  return <div>
    <List sx={style} aria-label="mailbox folders">
      <ListItem>
        <Typography variant="h6" component="div">
          Точки
        </Typography>
      </ListItem>
      <ListItem>
        <Button color="secondary" variant="outlined" onClick={() => setIsAddingElement('point')}>Добавить точку</Button>
      </ListItem>
      <ListItem>
        <FormControlLabel
          color="secondary"
          control={<Switch defaultChecked onChange={(e) => filterElements(e)} color="secondary" id="points" />}
          label="Показ точек"
          labelPlacement="end"
        />
      </ListItem>
      <ListItem>
        <Button color="secondary" onClick={() => deleteElements('points')} variant="outlined"
          startIcon={<DeleteIcon />}>
          Удалить точки
        </Button>
      </ListItem>

      <Divider component="li" />

      <ListItem>
        <Typography variant="h6" component="div">
          Линии
        </Typography>
      </ListItem>
      <ListItem>
        <Button color="secondary" variant="outlined" onClick={() => setIsAddingElement('line')}>Добавить линию</Button>
      </ListItem>
      <ListItem>
        <FormControlLabel
          color="secondary"
          control={<Switch defaultChecked onChange={(e) => filterElements(e)} color="secondary" id="lines" />}
          label="Показ линий"
          labelPlacement="end"
        />
      </ListItem>
      <ListItem>
        <Button color="secondary" onClick={() => deleteElements('lines')} variant="outlined" startIcon={<DeleteIcon />}>
          Удалить линии
        </Button>
      </ListItem>
    </List>
    <div ref={mapContainerRef} style={{ width: '100vw', height: '100vh' }} />
  </div>
}

export default MapComponent;
