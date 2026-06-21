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
  private retryCount: number = 0;
  private readonly MAX_RETRIES: number = 2;

  constructor(private translateService: TranslateService) {}

  async initializeLeaflet() {
    const L = await import('leaflet');
    this.L = L.default || L;
    return this.L;
  }

  createMap(container: HTMLElement) {
    if (!this.L) return null;

    // Destroy existing map instance if it exists
    if (this.map) {
      this.map.remove();
      this.map = null;
      this.geoJsonLayer = null;
      this.frenchOverlays = [];
    }

    this.map = this.L.map(container, {
      center: [20, 0],
      zoom: 2,
      minZoom: 1,
      maxZoom: 10,
      maxBounds: [[-60, -180], [90, 180]], // Exclude Antarctica (below -60 latitude)
      maxBoundsViscosity: 1.0,
      worldCopyJump: false
    });

    this.L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '© OpenStreetMap contributors, © CARTO',
      maxZoom: 18,
      noWrap: true
    }).addTo(this.map);

    // Add custom fullscreen control - pass the map div itself for fullscreen
    this.addCustomFullscreenControl(container);

    return this.map;
  }

  private addCustomFullscreenControl(mapContainer: HTMLElement) {
    if (!this.L || !this.map) return;

    // Create custom fullscreen control
    const FullscreenControl = this.L.Control.extend({
      options: {
        position: 'topleft'
      },

      onAdd: () => {
        const container = this.L!.DomUtil.create('div', 'leaflet-bar leaflet-control');
        const button = this.L!.DomUtil.create('a', 'leaflet-control-fullscreen', container);
        button.href = '#';
        button.title = 'Toggle Fullscreen';
        button.innerHTML = '⛶'; // Fullscreen icon
        button.style.fontSize = '18px';
        button.style.lineHeight = '30px';
        button.style.textAlign = 'center';

        this.L!.DomEvent.on(button, 'click', (e: Event) => {
          e.preventDefault();
          e.stopPropagation();
          this.toggleFullscreen(mapContainer, button);
        });

        // Listen for fullscreen changes to update button state
        const fullscreenChangeHandler = () => {
          const doc = document as any;
          const isFullscreen = doc.fullscreenElement || doc.webkitFullscreenElement || 
                              doc.mozFullScreenElement || doc.msFullscreenElement;
          
          if (!isFullscreen && !mapContainer.classList.contains('map-fullscreen-fallback')) {
            button.innerHTML = '⛶';
            button.title = 'Toggle Fullscreen';
          }
        };

        document.addEventListener('fullscreenchange', fullscreenChangeHandler);
        document.addEventListener('webkitfullscreenchange', fullscreenChangeHandler);
        document.addEventListener('mozfullscreenchange', fullscreenChangeHandler);
        document.addEventListener('MSFullscreenChange', fullscreenChangeHandler);

        return container;
      }
    });

    new FullscreenControl().addTo(this.map);
  }

  private toggleFullscreen(element: HTMLElement, button: HTMLElement) {
    const doc = document as any;
    const isCurrentlyFullscreen = doc.fullscreenElement || doc.webkitFullscreenElement || 
                                   doc.mozFullScreenElement || doc.msFullscreenElement ||
                                   element.classList.contains('map-fullscreen-fallback');

    if (!isCurrentlyFullscreen) {
      // Try native fullscreen API with vendor prefixes
      const requestFullscreen = element.requestFullscreen || 
                                 (element as any).webkitRequestFullscreen || 
                                 (element as any).mozRequestFullScreen || 
                                 (element as any).msRequestFullscreen;

      if (requestFullscreen) {
        requestFullscreen.call(element).then(() => {
          button.innerHTML = '✕'; // X icon to exit
          button.title = 'Exit Fullscreen';
          // Invalidate map size after fullscreen
          if (this.map) {
            setTimeout(() => this.map.invalidateSize(), 100);
          }
        }).catch((err: Error) => {
          console.log('Native fullscreen not supported, using fallback');
          this.enableFallbackFullscreen(element, button);
        });
      } else {
        // Fallback for browsers that don't support fullscreen API (e.g., iOS Safari)
        this.enableFallbackFullscreen(element, button);
      }
    } else {
      // Exit fullscreen
      if (element.classList.contains('map-fullscreen-fallback')) {
        this.disableFallbackFullscreen(element, button);
      } else {
        const exitFullscreen = doc.exitFullscreen || 
                               doc.webkitExitFullscreen || 
                               doc.mozCancelFullScreen || 
                               doc.msExitFullscreen;
        
        if (exitFullscreen) {
          exitFullscreen.call(doc).then(() => {
            button.innerHTML = '⛶';
            button.title = 'Toggle Fullscreen';
            // Invalidate map size after exiting fullscreen
            if (this.map) {
              setTimeout(() => this.map.invalidateSize(), 100);
            }
          });
        }
      }
    }
  }

  private enableFallbackFullscreen(element: HTMLElement, button: HTMLElement) {
    element.classList.add('map-fullscreen-fallback');
    document.body.style.overflow = 'hidden';
    button.innerHTML = '✕';
    button.title = 'Exit Fullscreen';
    
    // Force map to resize to new dimensions
    if (this.map) {
      setTimeout(() => {
        this.map.invalidateSize();
      }, 100);
    }
  }

  private disableFallbackFullscreen(element: HTMLElement, button: HTMLElement) {
    element.classList.remove('map-fullscreen-fallback');
    document.body.style.overflow = '';
    button.innerHTML = '⛶';
    button.title = 'Toggle Fullscreen';
    
    // Force map to resize back to normal dimensions
    if (this.map) {
      setTimeout(() => {
        this.map.invalidateSize();
      }, 100);
    }
  }

  addCountryAdvisories(countries: { slug: string; status: string }[]) {
    if (!this.map || !this.L) return;

    // Store countries for re-rendering on language change
    this.currentCountries = countries;

    // Reset retry count when explicitly called (e.g., language change)
    if (this.retryCount === 0 || this.geoJsonLayer) {
      this.retryCount = 0;
    }

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
      .then(response => {
        if (!response.ok) {
          throw new Error(`Failed to fetch GeoJSON: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        if (!this.map || !this.L) return;

        const countriesWithoutAdvisory: string[] = [];

        this.geoJsonLayer = this.L.geoJSON(data, {
          filter: (feature) => {
            // Exclude France from main layer - we'll add it separately with territories
            // Also exclude Antarctica as it has no travel advisories
            const geoCountryName = feature?.properties?.name || '';
            const slug = getCountrySlug(geoCountryName);
            return slug !== 'france' && slug !== 'antarctica';
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
      })
      .catch(error => {
        console.error('Failed to load country GeoJSON data:', error);
        // Retry with backoff if under max retries
        if (this.retryCount < this.MAX_RETRIES) {
          this.retryCount++;
          const delay = this.retryCount * 1500; // Progressive delay: 1.5s, 3s
          console.log(`Retrying GeoJSON load (attempt ${this.retryCount}/${this.MAX_RETRIES}) in ${delay}ms...`);
          setTimeout(() => {
            this.addCountryAdvisories(countries);
          }, delay);
        } else {
          console.error('Max retries reached. Failed to load map data.');
          this.retryCount = 0; // Reset for next time
        }
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
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        return response.json();
      })
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
        
        console.log(`${slug} overlay added`);
      })
      .catch(error => {
        console.log(`Could not load ${slug} overlay:`, error);
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
