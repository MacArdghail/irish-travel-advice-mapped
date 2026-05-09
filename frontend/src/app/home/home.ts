import { Component, ElementRef, ViewChild, PLATFORM_ID, Inject, CUSTOM_ELEMENTS_SCHEMA, ChangeDetectorRef, effect } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '../translate.pipe';
import { TranslateService } from '../translate.service';
import { MapService } from '../map.service';
import { TravelDataService } from '../travel-data.service';
import { groupByContinent } from '../continent.utils';
import { CountryCardComponent } from '../country-card';

@Component({
  selector: 'app-home',
  imports: [CommonModule, TranslatePipe, FormsModule, CountryCardComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './home.html',
  styleUrl: './home.css'
})
export class HomeComponent {
  @ViewChild('map') mapContainer!: ElementRef;

  countries: { slug: string; status: string }[] = [];
  filteredCountries: { slug: string; status: string }[] = [];
  groupedCountries: { [continent: string]: { slug: string; status: string }[] } = {};
  continents: string[] = [];
  searchQuery: string = '';
  selectedLevel: string = 'all';
  groupByContinent: boolean = false;
  lastUpdated: string = '';
  currentLang: string = '';
  private lastUpdatedDate: Date | null = null;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private mapService: MapService,
    private translateService: TranslateService,
    private travelDataService: TravelDataService,
    private cdr: ChangeDetectorRef
  ) {
    if (isPlatformBrowser(this.platformId)) {
      import('@vercel/analytics').then(({ inject }) => inject());
    }
    this.currentLang = this.translateService.getCurrentLang();

    // React to language changes from the App shell
    effect(() => {
      const lang = this.translateService.getCurrentLang();
      if (lang !== this.currentLang) {
        this.currentLang = lang;
        this.mapService.refreshMapLanguage();
        this.updateLastUpdatedText();
      }
    });
  }

  ngOnInit() {
    this.travelDataService.getMetadata().subscribe((metadata) => {
      this.lastUpdatedDate = new Date(metadata.lastUpdated);
      this.updateLastUpdatedText();
      this.cdr.markForCheck();
    });

    this.travelDataService.getCountries().subscribe((countries) => {
      this.countries = countries;
      this.filteredCountries = [...this.countries];
      if (this.mapContainer) {
        this.mapService.addCountryAdvisories(this.countries);
      }
      this.cdr.markForCheck();
    });
  }

  async ngAfterViewInit() {
    if (isPlatformBrowser(this.platformId)) {
      await this.mapService.initializeLeaflet();
      this.mapService.createMap(this.mapContainer.nativeElement);
      if (this.countries.length > 0) {
        this.mapService.addCountryAdvisories(this.countries);
      }
    }
  }

  filterCountries() {
    const query = this.searchQuery.toLowerCase().trim();
    let filtered = [...this.countries];
    if (this.selectedLevel !== 'all') {
      filtered = filtered.filter(c => c.status === this.selectedLevel);
    }
    if (query) {
      filtered = filtered.filter(c => {
        const name = this.translateService.translate(`countries.${c.slug}`).toLowerCase();
        return name.includes(query);
      });
    }
    this.filteredCountries = filtered;
    if (this.groupByContinent) this.updateGroupedCountries();
  }

  updateGroupedCountries() {
    this.groupedCountries = groupByContinent(this.filteredCountries);
    this.continents = Object.keys(this.groupedCountries).sort();
  }

  toggleGrouping() {
    this.groupByContinent = !this.groupByContinent;
    if (this.groupByContinent) this.updateGroupedCountries();
  }

  private updateLastUpdatedText() {
    if (!this.lastUpdatedDate) return;
    const day = this.lastUpdatedDate.getDate();
    const year = this.lastUpdatedDate.getFullYear();
    const monthIndex = this.lastUpdatedDate.getMonth();
    if (this.currentLang === 'ga') {
      const irishMonths = ['Eanáir','Feabhra','Márta','Aibreán','Bealtaine','Meitheamh','Iúil','Lúnasa','Meán Fómhair','Deireadh Fómhair','Samhain','Nollaig'];
      this.lastUpdated = `${day} ${irishMonths[monthIndex]} ${year}`.toUpperCase();
    } else {
      this.lastUpdated = this.lastUpdatedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase();
    }
  }
}
