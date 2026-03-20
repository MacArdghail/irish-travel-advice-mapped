import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class TranslateService {
  private translations = signal<any>({});
  private currentLang = signal<string>('en');

  constructor(private http: HttpClient) {
    this.loadTranslations('en');
  }

  loadTranslations(lang: string) {
    this.http.get(`/i18n/${lang}.json`).subscribe((data) => {
      this.translations.set(data);
      this.currentLang.set(lang);
    });
  }

  translate(key: string): string {
    const keys = key.split('.');
    let value = this.translations();
    
    for (const k of keys) {
      value = value?.[k];
      if (!value) return key;
    }
    
    return value || key;
  }

  setLanguage(lang: string) {
    this.loadTranslations(lang);
  }

  getCurrentLang(): string {
    return this.currentLang();
  }
}
