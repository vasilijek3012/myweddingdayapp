import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { guestLandingGuard } from './core/guards/guest-landing.guard';

import { HomeComponent } from './pages/home/home.component';
import { DealsComponent } from './pages/deals/deals.component';
import { WeddingsComponent } from './pages/weddings/weddings.component';
import { PreweddingComponent } from './pages/prewedding/prewedding.component';
import { VenueDetailComponent } from './pages/venue-detail/venue-detail.component';
import { BandsComponent } from './pages/bands/bands.component';
import { BandDetailComponent } from './pages/band-detail/band-detail.component';
import { AboutComponent } from './pages/about/about.component';
import { HelpComponent } from './pages/help/help.component';
import { LoginComponent } from './pages/login/login.component';
import { RegisterComponent } from './pages/register/register.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';

const routes: Routes = [
  { path: '', component: HomeComponent, canActivate: [guestLandingGuard] },
  { path: 'deals', component: DealsComponent },
  { path: 'weddings', component: WeddingsComponent },
  { path: 'prewedding', component: PreweddingComponent },
  { path: 'venue/:id', component: VenueDetailComponent },
  { path: 'bands', component: BandsComponent },
  { path: 'band/:id', component: BandDetailComponent },
  { path: 'about', component: AboutComponent },
  { path: 'help', component: HelpComponent },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] },
  { path: '**', redirectTo: '' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
