'use client';

import { TVChannel } from '@/lib/channels';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Radio, MapPin } from 'lucide-react';

interface ChannelCardProps {
  channel: TVChannel;
  isActive: boolean;
  onClick: () => void;
  compact?: boolean;
}

export function ChannelCard({ channel, isActive, onClick, compact = false }: ChannelCardProps) {
  if (compact) {
    // Compact list view
    return (
      <div
        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer transition-all duration-150 hover:bg-white/5 ${
          isActive ? 'bg-red-500/10 border border-red-500/30' : 'border border-transparent'
        }`}
        onClick={onClick}
      >
        <div
          className="flex-shrink-0 w-8 h-8 rounded-md flex items-center justify-center text-xs font-bold text-white"
          style={{ backgroundColor: channel.color }}
        >
          {channel.logoText}
        </div>
        <div className="flex-1 min-w-0">
          <span className={`text-sm font-medium truncate ${isActive ? 'text-white' : 'text-gray-200'}`}>
            {channel.name}
          </span>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {channel.region !== 'Nasional' && (
            <span className="text-[10px] text-gray-500 hidden sm:inline">{channel.region}</span>
          )}
          {isActive && (
            <Badge variant="destructive" className="text-[9px] px-1 py-0 h-4">
              <Radio className="w-2 h-2 mr-0.5" />
              LIVE
            </Badge>
          )}
        </div>
      </div>
    );
  }

  // Full grid card view
  return (
    <Card
      className={`cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-lg border-2 ${
        isActive
          ? 'border-red-500 shadow-red-500/20 shadow-lg bg-red-500/5'
          : 'border-transparent bg-card hover:border-white/10'
      }`}
      onClick={onClick}
    >
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-center gap-3">
          {/* Channel Logo */}
          <div
            className="flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center text-base sm:text-lg font-bold text-white shadow-md select-none"
            style={{ backgroundColor: channel.color }}
          >
            {channel.logoText}
          </div>

          {/* Channel Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm sm:text-base truncate">{channel.name}</h3>
              {isActive && (
                <Badge variant="destructive" className="flex-shrink-0 text-[10px] px-1.5 py-0">
                  <Radio className="w-2.5 h-2.5 mr-0.5" />
                  LIVE
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground truncate mt-0.5">{channel.description}</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                {channel.category === 'gaya_hidup' ? 'Gaya Hidup' :
                 channel.category === 'tvri' ? 'TVRI' :
                 channel.category.charAt(0).toUpperCase() + channel.category.slice(1)}
              </Badge>
              {channel.region !== 'Nasional' && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-0.5">
                  <MapPin className="w-2.5 h-2.5" />
                  {channel.region}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
