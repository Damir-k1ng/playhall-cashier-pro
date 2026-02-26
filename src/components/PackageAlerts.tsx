import { useEffect, useRef } from 'react';
import { useGlobalTimer } from '@/contexts/GlobalTimerContext';
import { PACKAGE_WARNING_MINUTES } from '@/lib/constants';
import { toast } from 'sonner';

interface Station {
  id: string;
  name: string;
  activeSession?: {
    id: string;
    started_at: string;
    tariff_type: string;
    package_count?: number;
  } | null;
}

interface PackageAlertsProps {
  stations: Station[];
}

export function PackageAlerts({ stations }: PackageAlertsProps) {
  const { getElapsedMinutes } = useGlobalTimer();
  const warnedRef = useRef<Set<string>>(new Set());
  const endedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const packageSessions = stations.filter(
      s => s.activeSession && s.activeSession.tariff_type === 'package'
    );

    // Clean up refs for sessions that no longer exist
    const activeIds = new Set(packageSessions.map(s => s.activeSession!.id));
    warnedRef.current.forEach(id => { if (!activeIds.has(id)) warnedRef.current.delete(id); });
    endedRef.current.forEach(id => { if (!activeIds.has(id)) endedRef.current.delete(id); });

    for (const station of packageSessions) {
      const session = station.activeSession!;
      const packageCount = session.package_count || 1;
      const totalMinutes = 180 * packageCount;
      const elapsed = getElapsedMinutes(session.started_at);
      const remaining = totalMinutes - elapsed;

      // Warning at 5 minutes
      if (remaining <= PACKAGE_WARNING_MINUTES && remaining > 0 && !warnedRef.current.has(session.id)) {
        warnedRef.current.add(session.id);
        playWarningSound();
        toast.warning(`⚠ ${station.name}: осталось 5 минут до конца пакета`, { duration: 6000 });
      }

      // Package ended
      if (remaining <= 0 && !endedRef.current.has(session.id)) {
        endedRef.current.add(session.id);
        playPackageEndSound();
        toast.error(`🚨 ${station.name}: пакет закончился! Открытое время начислено.`, { duration: 10000 });
      }
    }
  });

  return null;
}

function playWarningSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const gain = ctx.createGain();
    gain.connect(ctx.destination);
    gain.gain.value = 0.15;
    const osc = ctx.createOscillator();
    osc.connect(gain);
    osc.frequency.value = 440;
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  } catch {}
}

function playPackageEndSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const gain = ctx.createGain();
    gain.connect(ctx.destination);
    gain.gain.value = 0.25;
    [523.25, 659.25, 783.99].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.connect(gain);
      osc.frequency.value = freq;
      osc.start(ctx.currentTime + i * 0.2);
      osc.stop(ctx.currentTime + i * 0.2 + 0.15);
    });
    setTimeout(() => {
      const osc = ctx.createOscillator();
      osc.connect(gain);
      osc.frequency.value = 880;
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    }, 700);
  } catch {}
}
