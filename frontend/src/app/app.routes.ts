import { Routes } from '@angular/router';
import { HomeComponent } from './home/home';
import { UpdatesComponent } from './updates/updates';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'updates', component: UpdatesComponent }
];
