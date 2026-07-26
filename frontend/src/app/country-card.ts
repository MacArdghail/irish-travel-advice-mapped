import { Component, Input, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from './translate.pipe';
import { TranslateService } from './translate.service';

@Component({
  selector: 'app-country-card',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './country-card.html',
  styleUrl: './country-card.css'
})
export class CountryCardComponent {
  @Input({ required: true }) country!: { slug: string; status: string };

  constructor(private translateService: TranslateService) {}

  getDFAUrl(): string {
    const currentLang = this.translateService.getCurrentLang();
    const langPath = currentLang === 'ga' ? 'ga/dfa/taisteal-thar-lear/comhairle' : 'en/dfa/overseas-travel/advice';
    
    // Get the full translation object
    const translation = this.translateService.translate(`countries.${this.country.slug}`, true);
    let slug = this.country.slug;
    
    // If translation is an object with slug property, use it
    if (typeof translation === 'object' && translation !== null && 'slug' in translation) {
      slug = translation.slug;
    }
    
    return `https://www.ireland.ie/${langPath}/${slug}/?source=travelmap.ie`;
  }
}
