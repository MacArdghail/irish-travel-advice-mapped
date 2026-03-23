import { Component, ElementRef, ViewChild, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { TranslatePipe } from './translate.pipe';
import { MapService } from './map.service';

interface CountryData {
  [key: string]: string
}

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, CommonModule, TranslatePipe],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  @ViewChild('map') mapContainer!: ElementRef;
  
  protected title = 'Irish Travel Advice Map';
  countries: { slug: string; status: string }[] = []
  lastUpdated: string = '';

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object,
    private mapService: MapService
  ) {}

  ngOnInit() {
    this.http.get<{ lastUpdated: string }>('/metadata.json').subscribe((metadata) => {
      const date = new Date(metadata.lastUpdated);
      this.lastUpdated = date.toLocaleDateString('en-US', { 
        month: 'long', 
        day: 'numeric', 
        year: 'numeric' 
      }).toUpperCase();
    })

    this.http.get<CountryData>('/travel_advice.json').subscribe((statusData) => {
      this.countries = Object.entries(statusData).map(
        ([slug, status]) => ({
          slug,
          status
        })
      );
      
      // Add advisories to map if it's already initialized
      if (this.mapContainer) {
        this.mapService.addCountryAdvisories(this.countries);
      }
    });
  }

  async ngAfterViewInit() {
    if (isPlatformBrowser(this.platformId)) {
      await this.mapService.initializeLeaflet();
      this.mapService.createMap(this.mapContainer.nativeElement);
      
      // Add advisories if countries data is already loaded
      if (this.countries.length > 0) {
        this.mapService.addCountryAdvisories(this.countries);
      }
    }
  }

  openDFAWebsite() {
    window.open('https://www.ireland.ie/en/dfa/overseas-travel/advice/', '_blank');
  }
}
