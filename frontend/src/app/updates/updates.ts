import { Component, ChangeDetectorRef, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '../translate.pipe';
import { TranslateService } from '../translate.service';
import { UpdatesService, UpdateEntry } from '../updates.service';

@Component({
  selector: 'app-updates',
  imports: [CommonModule, TranslatePipe],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './updates.html',
  styleUrl: './updates.css'
})
export class UpdatesComponent {
  updates: UpdateEntry[] = [];
  currentLang: string = '';

  constructor(
    private updatesService: UpdatesService,
    private translateService: TranslateService,
    private cdr: ChangeDetectorRef
  ) {
    this.currentLang = this.translateService.getCurrentLang();
  }

  ngOnInit() {
    this.updatesService.getUpdates().subscribe({
      next: (data) => {
        this.updates = data;
        this.cdr.markForCheck();
      },
      error: () => {
        this.updates = [];
        this.cdr.markForCheck();
      }
    });
  }

  getStatusClass(status: string | null): string {
    if (!status) return 'removed';
    return status;
  }

  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    const lang = this.translateService.getCurrentLang();
    if (lang === 'ga') {
      const irishMonths = [
        'Eanáir', 'Feabhra', 'Márta', 'Aibreán', 'Bealtaine', 'Meitheamh',
        'Iúil', 'Lúnasa', 'Meán Fómhair', 'Deireadh Fómhair', 'Samhain', 'Nollaig'
      ];
      return `${date.getUTCDate()} ${irishMonths[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
    }
    return date.toLocaleDateString('en-IE', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  }

  getCountryName(slug: string): string {
    return this.translateService.translate(`countries.${slug}`);
  }

  getStatusLabel(status: string | null): string {
    if (!status) return 'REMOVED';
    return this.translateService.translate(`levels.${status}`);
  }

  getDFAUrl(slug: string): string {
    const lang = this.translateService.getCurrentLang();
    const langPath = lang === 'ga' ? 'ga/dfa/taisteal-thar-lear/comhairle' : 'en/dfa/overseas-travel/advice';
    const translation = this.translateService.translate(`countries.${slug}`, true);
    const urlSlug = (typeof translation === 'object' && translation !== null && 'slug' in translation)
      ? (translation as any).slug
      : slug;
    return `https://www.ireland.ie/${langPath}/${urlSlug}/`;
  }
}
