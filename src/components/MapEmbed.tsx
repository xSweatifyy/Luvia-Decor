import React from 'react';
import { MapPin, Navigation, ExternalLink } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface MapEmbedProps {
  className?: string;
  height?: string;
  showControls?: boolean;
}

export const MapEmbed: React.FC<MapEmbedProps> = ({
  className = "",
  height = "h-80",
  showControls = true
}) => {
  const { config } = useApp();

  const googleMapsSearchUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    config.registeredOffice || "U Rejdiště 3732/15, 767 01 Kroměříž"
  )}`;

  return (
    <div className={`relative rounded-2xl overflow-hidden border border-[#E3DACF] bg-[#FAF8F5] shadow-sm ${className}`}>
      {/* Map iframe */}
      <iframe
        title="Mapa sídla Luvia Decor Kroměříž"
        src={config.mapEmbedUrl || "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2605.877800727937!2d17.388832076891415!3d49.29743997139474!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x471307b22a00c6d7%3A0xb35515234907ec9c!2sU%20Rejdi%C5%A1t%C4%9B%203732%2F15%2C%20767%2001%20Krom%C4%9B%C5%99%C3%AD%C5%BE!5e0!3m2!1scs!2scz!4v1709298400000!5m2!1scs!2scz"}
        className={`w-full ${height} border-0 grayscale-[15%] contrast-[105%]`}
        allowFullScreen
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />

      {/* Floating address badge */}
      {showControls && (
        <div className="absolute bottom-4 left-4 right-4 sm:right-auto sm:max-w-md bg-white/95 backdrop-blur-md p-4 rounded-xl shadow-lg border border-[#E8DFC8]/70 flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#FAF5EE] text-[#8C7355] flex items-center justify-center shrink-0 border border-[#E8DFC8]">
            <MapPin className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-[#8C7355] uppercase tracking-wider">Sídlo & ateliér</p>
            <p className="text-sm font-bold text-[#2D2723] truncate">{config.registeredOffice}</p>
            <p className="text-xs text-[#7B6E63] mt-0.5">Odpovědná osoba: {config.responsiblePerson}</p>
            <div className="flex gap-2 mt-2">
              <a
                href={googleMapsSearchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[#8C7355] hover:text-[#5E4C36] hover:underline"
              >
                <Navigation className="w-3.5 h-3.5" />
                Navigovat na místo
                <ExternalLink className="w-3 h-3 ml-0.5" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
