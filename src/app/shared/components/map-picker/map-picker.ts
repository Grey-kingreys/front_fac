import {
  Component,
  ElementRef,
  AfterViewInit,
  OnDestroy,
  input,
  output,
  viewChild,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import * as L from 'leaflet';

/**
 * Sélecteur de coordonnées sur carte OpenStreetMap (Leaflet).
 *
 * Équivalent web du `MapPickerSheet` de l'app mobile : une épingle fixe au centre
 * (style « Uber »), on déplace la carte, les coordonnées se mettent à jour en
 * direct et sont émises (arrondies à 6 décimales — contrainte backend
 * `DecimalField(decimal_places=6)`, sinon 400).
 *
 * Usage :
 *   <app-map-picker
 *     [latitude]="form.latitude" [longitude]="form.longitude"
 *     (coordsChange)="onCoords($event)" />
 */
@Component({
  selector: 'app-map-picker',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="relative rounded-xl overflow-hidden border border-gray-200">
      <!-- Carte -->
      <div #map class="h-56 w-full bg-gray-100"></div>

      <!-- Épingle fixe au centre (overlay, ne capte pas les clics) -->
      <div class="pointer-events-none absolute inset-0 flex items-center justify-center z-[500]">
        <div class="flex flex-col items-center -translate-y-3">
          <div class="w-9 h-9 rounded-full bg-blue-600 ring-4 ring-blue-600/25 flex items-center justify-center shadow-lg">
            <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z"/>
            </svg>
          </div>
          <div class="w-2 h-2 rounded-full bg-black/15 -mt-0.5"></div>
        </div>
      </div>

      <!-- Bouton « ma position » -->
      <button type="button" (click)="locateMe()" title="Utiliser ma position"
        class="absolute top-2 right-2 z-[600] p-2 rounded-lg bg-white shadow-md text-gray-600 hover:text-blue-600 transition-colors">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
          <circle cx="12" cy="12" r="3"/>
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 2v3m0 14v3m10-10h-3M5 12H2"/>
        </svg>
      </button>

      <!-- Lecture des coordonnées -->
      <div class="absolute bottom-2 left-2 right-2 z-[600] flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-white/95 shadow-md backdrop-blur-sm">
        <div class="flex items-center gap-2 min-w-0">
          <svg class="w-4 h-4 text-blue-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
            <circle cx="12" cy="12" r="3"/><path stroke-linecap="round" stroke-linejoin="round" d="M12 2v3m0 14v3m10-10h-3M5 12H2"/>
          </svg>
          <span class="font-mono text-xs text-gray-700 truncate">{{ readout() }}</span>
        </div>
        @if (hasValue()) {
          <button type="button" (click)="clear()" title="Effacer la position"
            class="shrink-0 text-gray-400 hover:text-red-600 transition-colors">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        }
      </div>
    </div>
    <p class="text-xs text-gray-400 mt-1.5">Déplacez la carte pour centrer l'épingle sur le lieu.</p>
  `,
})
export class MapPicker implements AfterViewInit, OnDestroy {
  /** Coordonnées initiales (édition). Null en création. */
  readonly latitude = input<number | null>(null);
  readonly longitude = input<number | null>(null);

  /** Émis à chaque déplacement terminé, arrondi à 6 décimales. */
  readonly coordsChange = output<{ latitude: number; longitude: number }>();

  /** Émis quand l'utilisateur efface la position. */
  readonly coordsCleared = output<void>();

  private readonly mapEl = viewChild.required<ElementRef<HTMLDivElement>>('map');

  // Centre par défaut : Conakry, Guinée (identique au mobile).
  private static readonly DEFAULT_CENTER: L.LatLngTuple = [9.537, -13.6773];

  private map?: L.Map;
  readonly hasValue = signal(false);
  private readonly center = signal<L.LatLng | null>(null);

  readout(): string {
    const c = this.center();
    if (!c) return 'Aucune position';
    const lat = `${Math.abs(c.lat).toFixed(5)}° ${c.lat >= 0 ? 'N' : 'S'}`;
    const lng = `${Math.abs(c.lng).toFixed(5)}° ${c.lng >= 0 ? 'E' : 'O'}`;
    return `${lat}  •  ${lng}`;
  }

  ngAfterViewInit(): void {
    const hasInitial = this.latitude() != null && this.longitude() != null;
    const start: L.LatLngTuple = hasInitial
      ? [this.latitude()!, this.longitude()!]
      : MapPicker.DEFAULT_CENTER;

    const map = L.map(this.mapEl().nativeElement, {
      center: start,
      zoom: hasInitial ? 15 : 12,
      zoomControl: true,
      attributionControl: true,
    });
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap',
    }).addTo(map);

    map.on('move', () => this.center.set(map.getCenter()));
    map.on('moveend', () => this.emit());

    this.map = map;
    this.hasValue.set(hasInitial);
    this.center.set(map.getCenter());

    // Le panneau slide-over s'ouvre après le rendu : forcer un recalcul de taille.
    setTimeout(() => map.invalidateSize(), 100);
  }

  ngOnDestroy(): void {
    this.map?.remove();
  }

  private emit(): void {
    const c = this.map?.getCenter();
    if (!c) return;
    this.hasValue.set(true);
    this.coordsChange.emit({
      latitude: Number(c.lat.toFixed(6)),
      longitude: Number(c.lng.toFixed(6)),
    });
  }

  locateMe(): void {
    if (!navigator.geolocation || !this.map) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.map!.setView([pos.coords.latitude, pos.coords.longitude], 16);
        this.emit();
      },
      () => {},
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  clear(): void {
    this.hasValue.set(false);
    this.center.set(null);
    this.coordsCleared.emit();
  }
}
