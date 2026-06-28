import { Routes } from '@angular/router';
import { HomeComponent } from './home/home';
import { UpdatesComponent } from './updates/updates';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'updates', component: UpdatesComponent },
  { path: 'do-not-travel', component: HomeComponent, data: { filter: 'do-not-travel' } },
  { path: 'avoid-non-essential-travel', component: HomeComponent, data: { filter: 'avoid-non-essential-travel' } },
  { path: 'high-degree-of-caution', component: HomeComponent, data: { filter: 'high-degree-of-caution' } },
  { path: 'normal-precautions', component: HomeComponent, data: { filter: 'normal-precautions' } }
];
