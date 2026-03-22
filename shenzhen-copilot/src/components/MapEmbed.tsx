"use client";

interface Location {
  name: string;
  lat: number;
  lng: number;
  address?: string;
  area?: string;
}

export function MapEmbed({ locations }: { locations: Location[] }) {
  if (!locations.length) return null;

  // Center on Shenzhen
  const centerLat = locations.reduce((sum, l) => sum + l.lat, 0) / locations.length;
  const centerLng = locations.reduce((sum, l) => sum + l.lng, 0) / locations.length;

  // Build Google Maps embed URL with markers
  const markers = locations
    .map((l) => `markers=color:red%7Clabel:${encodeURIComponent(l.name[0] || "P")}%7C${l.lat},${l.lng}`)
    .join("&");

  const embedUrl = `https://maps.google.com/maps?q=${centerLat},${centerLng}&z=13&output=embed`;

  return (
    <div className="my-3 rounded-xl overflow-hidden border border-gray-700">
      <div className="bg-gray-800 px-3 py-2 text-xs text-gray-400 font-medium flex items-center gap-2">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
        {locations.length} location{locations.length > 1 ? "s" : ""} pinned
      </div>
      <iframe
        src={embedUrl}
        width="100%"
        height="250"
        style={{ border: 0 }}
        allowFullScreen
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        title="Location map"
      />
      <div className="bg-gray-800 px-3 py-2 space-y-1">
        {locations.map((loc, i) => (
          <a
            key={i}
            href={`https://www.google.com/maps/search/?api=1&query=${loc.lat},${loc.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
          >
            <span className="text-red-400 text-xs">📍</span>
            <span className="font-medium">{loc.name}</span>
            {loc.address && (
              <span className="text-gray-500 text-xs truncate">{loc.address}</span>
            )}
          </a>
        ))}
      </div>
    </div>
  );
}
