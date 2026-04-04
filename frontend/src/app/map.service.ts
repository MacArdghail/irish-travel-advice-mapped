import { Injectable } from '@angular/core';
import { getCountrySlug, getMarkerColor, TERRITORY_MARKERS } from './map.utils';
import { TranslateService } from './translate.service';

type LeafletModule = typeof import('leaflet');

@Injectable({
  providedIn: 'root'
})
export class MapService {
  private L: LeafletModule | null = null;
  private map: any = null;
  private geoJsonLayer: any = null;
  private currentCountries: { slug: string; status: string }[] = [];

  constructor(private translateService: TranslateService) {}

  async initializeLeaflet() {
    const L = await import('leaflet');
    this.L = L.default || L;
    return this.L;
  }

  createMap(container: HTMLElement) {
    if (!this.L) return null;

    this.map = this.L.map(container, {
      center: [20, 0],
      zoom: 2,
      minZoom: 1,
      maxZoom: 10,
      maxBounds: [[-90, -180], [90, 180]],
      maxBoundsViscosity: 1.0,
      worldCopyJump: false
    });

    this.L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '© OpenStreetMap contributors, © CARTO',
      maxZoom: 18,
      noWrap: true
    }).addTo(this.map);

    return this.map;
  }

  addCountryAdvisories(countries: { slug: string; status: string }[]) {
    if (!this.map || !this.L) return;

    // Store countries for re-rendering on language change
    this.currentCountries = countries;

    if (this.geoJsonLayer) {
      this.geoJsonLayer.remove();
    }

    const advisoryMap = new Map<string, { slug: string; status: string }>();
    countries.forEach(country => {
      advisoryMap.set(country.slug, country);
    });

    fetch('https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson')
      .then(response => response.json())
      .then(data => {
        if (!this.map || !this.L) return;

        const countriesWithoutAdvisory: string[] = [];

        this.geoJsonLayer = this.L.geoJSON(data, {
          style: (feature) => {
            const geoCountryName = feature?.properties?.name || '';
            const slug = getCountrySlug(geoCountryName);
            const advisory = advisoryMap.get(slug);

            if (!advisory) {
              countriesWithoutAdvisory.push(`${geoCountryName} (slug: ${slug})`);
            }

            return {
              fillColor: slug === 'ireland' ? '#00ba42' : (advisory ? getMarkerColor(advisory.status) : '#cccccc'),
              weight: 0.5,
              opacity: 1,
              color: '#000000',
              fillOpacity: 0.75
            };
          },
          onEachFeature: (feature, layer) => {
            const geoCountryName = feature?.properties?.name || '';
            const slug = getCountrySlug(geoCountryName);
            const advisory = advisoryMap.get(slug);
            const translatedCountryName = this.translateService.translate(`countries.${slug}`);

            // Ireland
            if (slug === 'ireland') {
              const visitIrelandText = this.translateService.translate('ui.visit-ireland');
              layer.bindPopup(`
                <strong>${translatedCountryName}</strong><br>
                <a href="https://www.ireland.ie" target="_blank" rel="noopener noreferrer">${visitIrelandText}</a>
              `);
            } else if (advisory) {
              const adviceUrl = this.getDFAUrl(slug);
              const translatedStatus = this.translateService.translate(`levels.${advisory.status}`);
              const viewAdviceText = this.translateService.translate('ui.view-official-advice');
              layer.bindPopup(`
                <strong>${translatedCountryName}</strong><br>
                ${translatedStatus}<br>
                <a href="${adviceUrl}" target="_blank" rel="noopener noreferrer">${viewAdviceText}</a>
              `);
            } else {
              const noDataText = this.translateService.translate('ui.no-advisory-data');
              layer.bindPopup(`<strong>${translatedCountryName}</strong><br><em>${noDataText}</em>`);
            }

            layer.on('mouseover', (e: any) => {
              e.target.setStyle({ weight: 1.5, fillOpacity: 0.9 });
            });

            layer.on('mouseout', (e: any) => {
              e.target.setStyle({ weight: 0.5, fillOpacity: 0.75 });
            });
          }
        }).addTo(this.map);

        if (countriesWithoutAdvisory.length > 0) {
          console.log('🚨 Countries without advisory data:', countriesWithoutAdvisory);
        }

        this.addTerritoryMarkers(advisoryMap);
      });
  }

  private addTerritoryMarkers(advisoryMap: Map<string, any>) {
    if (!this.map || !this.L) return;

    TERRITORY_MARKERS.forEach(territory => {
      const advisory = advisoryMap.get(territory.slug);
      if (!advisory || !this.L) return;

      const color = getMarkerColor(advisory.status);
      const adviceUrl = this.getDFAUrl(territory.slug);
      const translatedStatus = this.translateService.translate(`levels.${advisory.status}`);
      const translatedTerritoryName = this.translateService.translate(`countries.${territory.slug}`);
      const viewAdviceText = this.translateService.translate('ui.view-official-advice');
      
      const marker = this.L.circleMarker([territory.coords[0], territory.coords[1]], {
        radius: 8,
        fillColor: color,
        color: '#000',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.9
      });

      marker.bindPopup(`
        <strong>${translatedTerritoryName}</strong><br>
        ${translatedStatus}<br>
        <a href="${adviceUrl}" target="_blank" rel="noopener noreferrer">${viewAdviceText}</a>
      `);
      marker.addTo(this.map);
    });
  }

  private getDFAUrl(countrySlug: string): string {
    const currentLang = this.translateService.getCurrentLang();
    const langPath = currentLang === 'ga' ? 'ga/dfa/taisteal-thar-lear/comhairle' : 'en/dfa/overseas-travel/advice';
    
    // Get the full translation object
    const translation = this.translateService.translate(`countries.${countrySlug}`, true);
    let slug = countrySlug;
    
    // If translation is an object with slug property, use it
    if (typeof translation === 'object' && translation !== null && 'slug' in translation) {
      slug = translation.slug;
    }
    
    return `https://www.ireland.ie/${langPath}/${slug}/`;
  }

  // Method to refresh map when language changes
  refreshMapLanguage() {
    if (this.currentCountries.length > 0) {
      this.addCountryAdvisories(this.currentCountries);
    }
  }
}
