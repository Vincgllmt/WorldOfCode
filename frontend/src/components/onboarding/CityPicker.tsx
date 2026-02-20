'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command,
  CommandInput,
  CommandList,
  CommandGroup,
  CommandItem,
  CommandEmpty,
} from '@/components/ui/command'
import { cn } from '@/lib/utils'
import { MapPin, Check } from 'lucide-react'

const CITIES = {
  'Île-de-France': [
    'Paris', 'Boulogne-Billancourt', 'Saint-Denis', 'Montreuil', 'Nanterre',
    'Créteil', 'Versailles', 'Argenteuil', 'Vitry-sur-Seine', 'Colombes',
    'Courbevoie', 'Asnières-sur-Seine', 'Rueil-Malmaison', 'Saint-Maur-des-Fossés',
    'Issy-les-Moulineaux', 'Levallois-Perret', 'Neuilly-sur-Seine', 'Cergy',
    'Évry-Courcouronnes', 'Massy', 'Noisy-le-Grand', 'Clichy', 'Meaux',
  ],
  'Nord & Est': [
    'Lille', 'Strasbourg', 'Metz', 'Nancy', 'Reims', 'Amiens', 'Dunkerque',
    'Roubaix', 'Tourcoing', 'Mulhouse', 'Colmar', 'Troyes', 'Charleville-Mézières',
    'Valenciennes', 'Lens', 'Béthune', 'Calais', 'Beauvais', 'Compiègne',
    'Thionville', 'Épinal', 'Laon', 'Saint-Quentin',
  ],
  'Ouest & Centre': [
    'Nantes', 'Rennes', 'Brest', 'Tours', 'Orléans', 'Angers', 'Le Mans',
    'Caen', 'Rouen', 'Le Havre', 'Poitiers', 'La Rochelle', 'Limoges',
    'Lorient', 'Saint-Nazaire', 'Vannes', 'Quimper', 'Saint-Brieuc', 'Chartres',
    'Bourges', 'Blois', 'Châteauroux', 'Cherbourg', 'Niort', 'La Roche-sur-Yon',
    'Cholet', 'Laval',
  ],
  'Sud-Est': [
    'Lyon', 'Marseille', 'Nice', 'Montpellier', 'Grenoble', 'Saint-Étienne',
    'Aix-en-Provence', 'Toulon', 'Nîmes', 'Avignon', 'Valence', 'Chambéry',
    'Annecy', 'Cannes', 'Antibes', 'Perpignan', 'Béziers', 'Villeurbanne',
    'Vénissieux', 'Clermont-Ferrand', 'Dijon', 'Besançon', 'Ajaccio', 'Bastia',
  ],
  'Sud-Ouest': [
    'Toulouse', 'Bordeaux', 'Pau', 'Bayonne', 'Biarritz', 'Montauban',
    'Agen', 'Tarbes', 'Angoulême', 'Périgueux', 'Rodez', 'Albi', 'Cahors',
    'Auch', 'La Rochelle', 'Dax', 'Libourne', 'Bergerac',
  ],
  'DOM-TOM': [
    'Fort-de-France', 'Pointe-à-Pitre', 'Saint-Denis (Réunion)', 'Cayenne',
    'Nouméa', 'Papeete', 'Mamoudzou',
  ],
  'Europe': [
    'London', 'Berlin', 'Amsterdam', 'Bruxelles', 'Barcelona', 'Madrid',
    'Lisbonne', 'Dublin', 'Munich', 'Milan', 'Rome', 'Zurich', 'Genève',
    'Vienne', 'Prague', 'Varsovie', 'Stockholm', 'Copenhague', 'Oslo', 'Helsinki',
    'Budapest', 'Bucarest', 'Athènes', 'Porto', 'Séville', 'Hambourg', 'Francfort',
    'Édimbourg', 'Manchester', 'Birmingham',
  ],
  'Monde': [
    'New York', 'San Francisco', 'Los Angeles', 'Toronto', 'Montréal', 'Tokyo',
    'Singapour', 'Sydney', 'Dubai', 'Shanghai', 'Hong Kong', 'Séoul', 'Bangalore',
    'Tel Aviv', 'Le Caire', 'São Paulo', 'Mexico', 'Buenos Aires', 'Casablanca',
    'Tunis', 'Alger', 'Dakar', 'Abidjan',
  ],
  'Autre': [
    'Remote',
  ],
} as const

type CityPickerProps = {
  value: string
  onChange: (value: string) => void
}

export default function CityPicker({ value, onChange }: CityPickerProps) {
  const [open, setOpen] = useState(false)

  const handleSelect = (city: string) => {
    onChange(city)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            'w-full justify-start text-left font-normal mt-1',
            !value && 'text-muted-foreground'
          )}
        >
          <MapPin className="mr-2 h-4 w-4" />
          {value || 'Sélectionner une ville'}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <Command>
          <CommandInput placeholder="Rechercher une ville..." />
          <CommandList className="max-h-60">
            <CommandEmpty>Aucune ville trouvée.</CommandEmpty>
            {Object.entries(CITIES).map(([region, cities]) => (
              <CommandGroup key={region} heading={region}>
                {cities.map((city) => (
                  <CommandItem
                    key={city}
                    value={city}
                    onSelect={() => handleSelect(city)}
                  >
                    <div className="flex items-center gap-2 w-full">
                      {value === city && <Check className="h-4 w-4 text-green-600" />}
                      <span>{city}</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
