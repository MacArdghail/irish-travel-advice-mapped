import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, shareReplay } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class TravelDataService {
  private countries$: Observable<{ slug: string; status: string }[]>;
  private metadata$: Observable<{ lastUpdated: string }>;

  constructor(private http: HttpClient) {
    this.countries$ = this.http.get<{ [key: string]: string }>('/travel_advice.json').pipe(
      map(data => Object.entries(data)
        .map(([slug, status]) => ({ slug, status }))
        .sort((a, b) => a.slug.localeCompare(b.slug))
      ),
      shareReplay(1)
    );

    this.metadata$ = this.http.get<{ lastUpdated: string }>('/metadata.json').pipe(
      shareReplay(1)
    );
  }

  getCountries(): Observable<{ slug: string; status: string }[]> {
    return this.countries$;
  }

  getMetadata(): Observable<{ lastUpdated: string }> {
    return this.metadata$;
  }
}
