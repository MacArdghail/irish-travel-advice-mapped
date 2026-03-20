import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { TranslatePipe } from './translate.pipe';

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
  protected title = 'Irish Travel Advice Map';
  countries: { slug: string; status: string }[] = []
  lastUpdated: string = '';

  constructor(private http: HttpClient){}

  ngOnInit() {
    this.http.get<{ lastUpdated: string }>('/metadata.json').subscribe((metadata) => {
      const date = new Date(metadata.lastUpdated);
      this.lastUpdated = date.toLocaleString()
    })

    this.http.get<CountryData>('/travel_advice.json').subscribe((statusData) => {
        this.countries = Object.entries(statusData).map(
          ([slug, status]) => ({
            slug,
            status
          })
        )
      })
  }
}
