import { Injectable } from '@angular/core';
import { getCountrySlug, getMarkerColor } from './map.utils';
import { TranslateService } from './translate.service';

type LeafletModule = typeof import('leaflet');

@Injectable({
  providedIn: 'root'
})
export class MapService {
  private L: LeafletModule | null = null;
  private map: any = null;
  private geoJsonLayer: any = null;
  private frenchOverlays: any[] = []; // Store French territory overlays
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

    // Remove all French overlays
    this.frenchOverlays.forEach(overlay => {
      if (overlay && this.map) {
        this.map.removeLayer(overlay);
      }
    });
    this.frenchOverlays = [];

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
          filter: (feature) => {
            // Exclude France from main layer - we'll add it separately with territories
            const geoCountryName = feature?.properties?.name || '';
            const slug = getCountrySlug(geoCountryName);
            return slug !== 'france';
          },
          style: (feature) => {
            const geoCountryName = feature?.properties?.name || '';
            const slug = getCountrySlug(geoCountryName);
            const advisory = advisoryMap.get(slug);

            if (!advisory) {
              countriesWithoutAdvisory.push(`${geoCountryName} (slug: ${slug})`);
            }

            // Special colors for specific countries
            let fillColor = '#cccccc'; // default gray for no advisory
            
            if (slug === 'ireland') {
              fillColor = '#00ba42'; // green for Ireland
            } else if (advisory) {
              fillColor = getMarkerColor(advisory.status);
            }

            return {
              fillColor: fillColor,
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

        this.addFranceAndTerritories(advisoryMap);
      });
  }

  private addFranceAndTerritories(advisoryMap: Map<string, any>) {
    if (!this.map || !this.L) return;

    // Define all French territories with their GeoJSON URLs
    const frenchTerritories = [
      { slug: 'france', url: 'https://raw.githubusercontent.com/gregoiredavid/france-geojson/master/metropole.geojson' },
      { slug: 'guadeloupe', url: 'https://raw.githubusercontent.com/gregoiredavid/france-geojson/master/regions/guadeloupe/region-guadeloupe.geojson' },
      { slug: 'french-guiana', url: 'https://raw.githubusercontent.com/gregoiredavid/france-geojson/master/regions/guyane/region-guyane.geojson' },
      { slug: 'martinique', url: 'https://raw.githubusercontent.com/gregoiredavid/france-geojson/master/regions/martinique/region-martinique.geojson' },
      { slug: 'reunion', url: 'https://raw.githubusercontent.com/gregoiredavid/france-geojson/master/regions/la-reunion/region-la-reunion.geojson' },
      { slug: 'mayotte', url: 'https://raw.githubusercontent.com/gregoiredavid/france-geojson/master/regions/mayotte/region-mayotte.geojson' }
    ];

    frenchTerritories.forEach(territory => {
      this.addTerritoryOverlay(territory.slug, territory.url, advisoryMap);
    });
  }

  private addTerritoryOverlay(slug: string, geojsonUrl: string, advisoryMap: Map<string, any>) {
    if (!this.map || !this.L) return;

    const advisory = advisoryMap.get(slug);
    if (!advisory) {
      return;
    }

    const color = getMarkerColor(advisory.status);

    fetch(geojsonUrl)
      .then(response => response.json())
      .then(data => {
        if (!this.map || !this.L) return;

        const translatedName = this.translateService.translate(`countries.${slug}`);
        const translatedStatus = this.translateService.translate(`levels.${advisory.status}`);
        const adviceUrl = this.getDFAUrl(slug);
        const viewAdviceText = this.translateService.translate('ui.view-official-advice');

        const popupContent = `
          <strong>${translatedName}</strong><br>
          ${translatedStatus}<br>
          <a href="${adviceUrl}" target="_blank" rel="noopener noreferrer">${viewAdviceText}</a>
        `;

        const layer = this.L.geoJSON(data, {
          style: {
            fillColor: color,
            weight: 0.5,
            opacity: 1,
            color: '#000000',
            fillOpacity: 0.75
          },
          onEachFeature: (feature, layer) => {
            layer.bindPopup(popupContent);
            
            layer.on('mouseover', (e: any) => {
              e.target.setStyle({ weight: 1.5, fillOpacity: 0.9 });
            });

            layer.on('mouseout', (e: any) => {
              e.target.setStyle({ weight: 0.5, fillOpacity: 0.75 });
            });
          }
        });

        layer.addTo(this.map);
        this.frenchOverlays.push(layer);
      })
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
