import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Sparkles, Monitor, MapPin, Banknote, Package, Coffee, ChevronRight, ChevronLeft, Check, Plus, X } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { toast } from 'sonner';
import logoImage from '@/assets/logo.jpg';

interface StationConfig {
  name: string;
  zone: 'vip' | 'hall';
  station_number: number;
  hourly_rate: number;
  package_rate: number;
}

interface DrinkConfig {
  name: string;
  price: number;
}

interface ClubSetupWizardProps {
  clubName: string;
  onComplete: () => void;
}

const STEPS = [
  { icon: Sparkles, label: 'Приветствие' },
  { icon: Monitor, label: 'Станции' },
  { icon: MapPin, label: 'Зоны' },
  { icon: Banknote, label: 'Цены' },
  { icon: Package, label: 'Пакеты' },
  { icon: Coffee, label: 'Напитки' },
];

export function ClubSetupWizard({ clubName, onComplete }: ClubSetupWizardProps) {
  const [step, setStep] = useState(0);
  const [stationCount, setStationCount] = useState(4);
  const [stations, setStations] = useState<StationConfig[]>([]);
  const [drinks, setDrinks] = useState<DrinkConfig[]>([]);
  const [newDrink, setNewDrink] = useState({ name: '', price: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Step 1 -> Step 2: generate station shells
  const handleStationCountNext = () => {
    if (stations.length === 0) {
      const generated: StationConfig[] = Array.from({ length: stationCount }, (_, i) => ({
        name: `Станция ${i + 1}`,
        zone: 'hall' as const,
        station_number: i + 1,
        hourly_rate: 1500,
        package_rate: 3000,
      }));
      setStations(generated);
    } else if (stations.length < stationCount) {
      const extra = Array.from({ length: stationCount - stations.length }, (_, i) => ({
        name: `Станция ${stations.length + i + 1}`,
        zone: 'hall' as const,
        station_number: stations.length + i + 1,
        hourly_rate: 1500,
        package_rate: 3000,
      }));
      setStations([...stations, ...extra]);
    } else if (stations.length > stationCount) {
      setStations(stations.slice(0, stationCount));
    }
    setStep(2);
  };

  const updateStation = (index: number, updates: Partial<StationConfig>) => {
    setStations(prev => prev.map((s, i) => i === index ? { ...s, ...updates } : s));
  };

  const addDrink = () => {
    const name = newDrink.name.trim();
    const price = parseInt(newDrink.price);
    if (!name || isNaN(price) || price < 0) return;
    setDrinks(prev => [...prev, { name, price }]);
    setNewDrink({ name: '', price: '' });
  };

  const removeDrink = (index: number) => {
    setDrinks(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // Auto-name stations based on zone
      const finalStations = stations.map((s, i) => {
        const zoneName = s.zone === 'vip' ? 'VIP' : 'Зал';
        const zoneStations = stations.filter((st, j) => j <= i && st.zone === s.zone);
        return {
          ...s,
          name: `${zoneName} ${zoneStations.length}`,
        };
      });

      await apiClient.setupClub({ stations: finalStations, drinks });
      toast.success('Клуб настроен!', { description: 'Станции и напитки созданы.' });
      onComplete();
    } catch (err: any) {
      toast.error('Ошибка настройки', { description: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1: return stationCount >= 1 && stationCount <= 20;
      case 2: return stations.length > 0;
      case 3: return stations.every(s => s.hourly_rate > 0 && s.package_rate > 0);
      default: return true;
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      {/* Background */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,hsl(185_100%_50%_/_0.05)_0%,transparent_50%)] pointer-events-none" />
      
      <div className="relative z-10 w-full max-w-2xl">
        {/* Progress */}
        <div className="flex items-center justify-center gap-1 mb-8">
          {STEPS.map((s, i) => (
            <div key={i} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs transition-all ${
                i < step ? 'bg-primary text-primary-foreground' : 
                i === step ? 'bg-primary/20 text-primary ring-2 ring-primary' : 
                'bg-muted text-muted-foreground'
              }`}>
                {i < step ? <Check className="w-4 h-4" /> : <s.icon className="w-4 h-4" />}
              </div>
              {i < STEPS.length - 1 && (
                <div className={`w-8 h-0.5 mx-1 ${i < step ? 'bg-primary' : 'bg-muted'}`} />
              )}
            </div>
          ))}
        </div>

        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardContent className="p-6 md:p-8">
            {/* Step 0: Welcome */}
            {step === 0 && (
              <div className="text-center space-y-6">
                <div className="w-20 h-20 rounded-2xl overflow-hidden mx-auto glow-cyan-strong">
                  <img src={logoImage} alt="Lavé" className="w-full h-full object-cover" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-foreground">Добро пожаловать в Lavé!</h1>
                  <p className="text-muted-foreground mt-2">
                    Давайте настроим <span className="text-primary font-semibold">{clubName}</span>
                  </p>
                  <p className="text-sm text-muted-foreground mt-4">
                    Это займёт пару минут. Вы сможете изменить настройки позже.
                  </p>
                </div>
                <Button onClick={() => setStep(1)} size="lg" className="gap-2">
                  Начать настройку <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}

            {/* Step 1: Station count */}
            {step === 1 && (
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-xl font-bold text-foreground">Сколько PlayStation станций?</h2>
                  <p className="text-muted-foreground text-sm mt-1">Укажите общее количество станций в вашем клубе</p>
                </div>
                <div className="flex items-center justify-center gap-4">
                  <Button variant="outline" size="icon" onClick={() => setStationCount(Math.max(1, stationCount - 1))}>
                    <span className="text-lg">−</span>
                  </Button>
                  <div className="text-5xl font-bold text-primary w-20 text-center">{stationCount}</div>
                  <Button variant="outline" size="icon" onClick={() => setStationCount(Math.min(20, stationCount + 1))}>
                    <span className="text-lg">+</span>
                  </Button>
                </div>
                <div className="flex justify-between pt-4">
                  <Button variant="ghost" onClick={() => setStep(0)}><ChevronLeft className="w-4 h-4 mr-1" /> Назад</Button>
                  <Button onClick={handleStationCountNext} disabled={!canProceed()}>Далее <ChevronRight className="w-4 h-4 ml-1" /></Button>
                </div>
              </div>
            )}

            {/* Step 2: Zones */}
            {step === 2 && (
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-xl font-bold text-foreground">Разделите станции по зонам</h2>
                  <p className="text-muted-foreground text-sm mt-1">Выберите зону для каждой станции</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {stations.map((s, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-background/50">
                      <span className="text-sm font-medium text-muted-foreground w-24">Станция {s.station_number}</span>
                      <Select value={s.zone} onValueChange={(v) => updateStation(i, { zone: v as 'vip' | 'hall' })}>
                        <SelectTrigger className="flex-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="vip">
                            <span className="flex items-center gap-2">
                              <Badge variant="default" className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs">VIP</Badge>
                            </span>
                          </SelectItem>
                          <SelectItem value="hall">
                            <span className="flex items-center gap-2">
                              <Badge variant="secondary" className="text-xs">Общий зал</Badge>
                            </span>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between pt-4">
                  <Button variant="ghost" onClick={() => setStep(1)}><ChevronLeft className="w-4 h-4 mr-1" /> Назад</Button>
                  <Button onClick={() => setStep(3)}>Далее <ChevronRight className="w-4 h-4 ml-1" /></Button>
                </div>
              </div>
            )}

            {/* Step 3: Prices */}
            {step === 3 && (
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-xl font-bold text-foreground">Стоимость игры по зонам</h2>
                  <p className="text-muted-foreground text-sm mt-1">Укажите цены в тенге (₸)</p>
                </div>
                {(() => {
                  const zones = [...new Set(stations.map(s => s.zone))];
                  return zones.map(zone => {
                    const zoneStations = stations.filter(s => s.zone === zone);
                    const first = zoneStations[0];
                    return (
                      <div key={zone} className="p-4 rounded-lg border border-border/50 bg-background/50 space-y-4">
                        <div className="flex items-center gap-2">
                          {zone === 'vip' ? (
                            <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">VIP</Badge>
                          ) : (
                            <Badge variant="secondary">Общий зал</Badge>
                          )}
                          <span className="text-sm text-muted-foreground">({zoneStations.length} станций)</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-xs text-muted-foreground">Почасовая (₸/час)</Label>
                            <Input
                              type="number"
                              value={first.hourly_rate}
                              onChange={(e) => {
                                const rate = parseInt(e.target.value) || 0;
                                setStations(prev => prev.map(s => s.zone === zone ? { ...s, hourly_rate: rate } : s));
                              }}
                              min={0}
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Пакет 2+1 (₸)</Label>
                            <Input
                              type="number"
                              value={first.package_rate}
                              onChange={(e) => {
                                const rate = parseInt(e.target.value) || 0;
                                setStations(prev => prev.map(s => s.zone === zone ? { ...s, package_rate: rate } : s));
                              }}
                              min={0}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}
                <div className="flex justify-between pt-4">
                  <Button variant="ghost" onClick={() => setStep(2)}><ChevronLeft className="w-4 h-4 mr-1" /> Назад</Button>
                  <Button onClick={() => setStep(4)} disabled={!canProceed()}>Далее <ChevronRight className="w-4 h-4 ml-1" /></Button>
                </div>
              </div>
            )}

            {/* Step 4: Packages info */}
            {step === 4 && (
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-xl font-bold text-foreground">Игровые пакеты</h2>
                  <p className="text-muted-foreground text-sm mt-1">Система поддерживает пакеты «2+1» (3 часа)</p>
                </div>
                <div className="p-4 rounded-lg border border-primary/20 bg-primary/5 space-y-3">
                  <div className="flex items-center gap-2">
                    <Package className="w-5 h-5 text-primary" />
                    <span className="font-semibold text-foreground">Пакет 2+1</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Фиксированная стоимость за 3 часа игры. Можно суммировать несколько пакетов в одной сессии.
                  </p>
                  <div className="text-sm text-muted-foreground">
                    {[...new Set(stations.map(s => s.zone))].map(zone => {
                      const rate = stations.find(s => s.zone === zone)?.package_rate || 0;
                      return (
                        <div key={zone} className="flex justify-between py-1">
                          <span>{zone === 'vip' ? 'VIP' : 'Общий зал'}</span>
                          <span className="text-foreground font-medium">{rate.toLocaleString()} ₸</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  Цены пакетов были указаны на предыдущем шаге. Вы сможете изменить их позже.
                </p>
                <div className="flex justify-between pt-4">
                  <Button variant="ghost" onClick={() => setStep(3)}><ChevronLeft className="w-4 h-4 mr-1" /> Назад</Button>
                  <Button onClick={() => setStep(5)}>Далее <ChevronRight className="w-4 h-4 ml-1" /></Button>
                </div>
              </div>
            )}

            {/* Step 5: Drinks */}
            {step === 5 && (
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-xl font-bold text-foreground">Добавьте напитки</h2>
                  <p className="text-muted-foreground text-sm mt-1">Необязательный шаг — можно добавить позже</p>
                </div>
                
                <div className="flex gap-2">
                  <Input
                    placeholder="Название"
                    value={newDrink.name}
                    onChange={(e) => setNewDrink(prev => ({ ...prev, name: e.target.value }))}
                    className="flex-1"
                  />
                  <Input
                    placeholder="Цена ₸"
                    type="number"
                    value={newDrink.price}
                    onChange={(e) => setNewDrink(prev => ({ ...prev, price: e.target.value }))}
                    className="w-28"
                  />
                  <Button variant="outline" size="icon" onClick={addDrink} disabled={!newDrink.name.trim() || !newDrink.price}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>

                {drinks.length > 0 && (
                  <div className="space-y-2">
                    {drinks.map((d, i) => (
                      <div key={i} className="flex items-center justify-between p-2 rounded-lg border border-border/50 bg-background/50">
                        <span className="text-sm font-medium">{d.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">{d.price.toLocaleString()} ₸</span>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeDrink(i)}>
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Quick templates */}
                {drinks.length === 0 && (
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-2">Или добавьте шаблон:</p>
                    <Button variant="outline" size="sm" onClick={() => {
                      setDrinks([
                        { name: 'Coca-Cola', price: 500 },
                        { name: 'Fanta', price: 500 },
                        { name: 'Вода', price: 300 },
                        { name: 'Чай', price: 400 },
                        { name: 'Кофе', price: 600 },
                      ]);
                    }}>
                      Стандартный набор напитков
                    </Button>
                  </div>
                )}

                <div className="flex justify-between pt-4">
                  <Button variant="ghost" onClick={() => setStep(4)}><ChevronLeft className="w-4 h-4 mr-1" /> Назад</Button>
                  <Button onClick={handleSubmit} disabled={isSubmitting} className="gap-2">
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Создание...
                      </>
                    ) : (
                      <>
                        Завершить настройку <Check className="w-4 h-4" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
