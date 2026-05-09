import { Component, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterOutlet, RouterLink, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { TranslatePipe } from './translate.pipe';
import { TranslateService } from './translate.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, TranslatePipe],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  currentLang: string = '';
  isUpdatesPage: boolean = false;

  constructor(
    private translateService: TranslateService,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.currentLang = this.translateService.getCurrentLang();

    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      this.isUpdatesPage = event.urlAfterRedirects === '/updates';
    });
  }

  switchLanguage(lang: string) {
    this.currentLang = lang;
    this.translateService.setLanguage(lang);
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('preferredLanguage', lang);
    }
  }

  openDFAWebsite() {
    const url = this.currentLang === 'ga'
      ? 'https://www.ireland.ie/ga/dfa/taisteal-thar-lear/comhairle/'
      : 'https://www.ireland.ie/en/dfa/overseas-travel/advice/';
    window.open(url, '_blank');
  }
}
