import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Change {
  country: string;
  from: string | null;
  to: string | null;
}

export interface UpdateEntry {
  date: string;
  changes: Change[];
}

@Injectable({
  providedIn: 'root'
})
export class UpdatesService {
  constructor(private http: HttpClient) {}

  getUpdates(): Observable<UpdateEntry[]> {
    return this.http.get<UpdateEntry[]>('/travel_updates.json');
  }
}
