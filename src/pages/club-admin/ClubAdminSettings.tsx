import React, { useState, useEffect } from 'react';
import { useClubAdminAuth } from '@/contexts/ClubAdminAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';

export default function ClubAdminSettings() {
  const { user } = useClubAdminAuth();
  const [clubName, setClubName] = useState('');
  const [city, setCity] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setIsLoading(true);
      const { data } = await supabase
        .from('tenants')
        .select('club_name, city')
        .eq('id', user.tenant_id)
        .single();
      if (data) {
        setClubName(data.club_name);
        setCity(data.city || '');
      }
      setIsLoading(false);
    };
    load();
  }, [user]);

  const handleSave = async () => {
    if (!user || !clubName.trim()) return;
    setIsSaving(true);
    const { error } = await supabase
      .from('tenants')
      .update({ club_name: clubName.trim(), city: city.trim() || null })
      .eq('id', user.tenant_id);
    if (error) toast.error(error.message);
    else toast.success('Настройки сохранены');
    setIsSaving(false);
  };

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Настройки</h2>
        <p className="text-muted-foreground text-sm">Общие настройки клуба</p>
      </div>

      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle className="text-lg">Информация о клубе</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Название клуба</Label>
            <Input value={clubName} onChange={(e) => setClubName(e.target.value)} placeholder="Мой клуб" />
          </div>
          <div className="space-y-2">
            <Label>Город</Label>
            <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Алматы" />
          </div>
          <Button onClick={handleSave} disabled={isSaving} className="gap-2">
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Сохранить
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
