import React from 'react';
import { StationCard } from './StationCard';
import { StationWithSession } from '@/types/database';
import { CLUB_NAME } from '@/lib/constants';

interface StationGridProps {
  stations: StationWithSession[];
}

export function StationGrid({ stations }: StationGridProps) {
  const vipStations = stations.filter(s => s.zone === 'vip');
  const hallStations = stations.filter(s => s.zone === 'hall');

  return (
    <div className="space-y-12">
      {/* VIP Zone */}
      <section>
        <div className="flex items-center gap-4 mb-6">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-vip/30 to-transparent" />
          <h2 className="text-xs font-bold text-vip uppercase tracking-[0.3em]">
            VIP Зона
          </h2>
          <div className="h-px flex-1 bg-gradient-to-l from-transparent via-vip/30 to-transparent" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          {vipStations.map(station => (
            <StationCard key={station.id} station={station} />
          ))}
        </div>
      </section>

      {/* Hall Zone */}
      <section>
        <div className="flex items-center gap-4 mb-6">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
          <h2 className="text-xs font-bold text-primary uppercase tracking-[0.3em]">
            Зал
          </h2>
          <div className="h-px flex-1 bg-gradient-to-l from-transparent via-primary/30 to-transparent" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          {hallStations.map(station => (
            <StationCard key={station.id} station={station} />
          ))}
        </div>
      </section>
    </div>
  );
}
