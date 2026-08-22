import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

const defaultIcon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

interface Pin {
  lat: number
  lon: number
  label: string
}

interface MiniMapProps {
  pins: Pin[]
  className?: string
}

export function MiniMap({ pins, className }: MiniMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)

  useEffect(() => {
    if (!containerRef.current || pins.length === 0) return

    const map = L.map(containerRef.current, { scrollWheelZoom: false })
    mapRef.current = map

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map)

    const markers = pins.map((pin) => L.marker([pin.lat, pin.lon], { icon: defaultIcon }).bindPopup(pin.label))
    markers.forEach((m) => m.addTo(map))

    if (pins.length === 1) {
      map.setView([pins[0].lat, pins[0].lon], 14)
    } else {
      const bounds = L.latLngBounds(pins.map((p) => [p.lat, p.lon] as [number, number]))
      map.fitBounds(bounds, { padding: [30, 30] })
    }

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [pins])

  if (pins.length === 0) {
    return (
      <div className={`flex items-center justify-center bg-slate-50 text-xs text-slate-400 ${className ?? ''}`}>
        Map unavailable for this location
      </div>
    )
  }

  return <div ref={containerRef} className={className} />
}
