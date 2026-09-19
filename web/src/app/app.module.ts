import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
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
import { HeaderComponent } from './shared/components/header/header.component';
import { GoogleSignInButtonComponent } from './shared/components/google-sign-in-button/google-sign-in-button.component';
import { ReviewsSectionComponent } from './shared/components/reviews-section/reviews-section.component';
import { authTokenInterceptor } from './core/interceptors/auth-token.interceptor';
import { TranslatePipe } from './core/pipes/translate.pipe';
import { FeaturedPipe } from './core/pipes/featured.pipe';

@NgModule({
  declarations: [
    AppComponent,
    HomeComponent,
    DealsComponent,
    WeddingsComponent,
    PreweddingComponent,
    VenueDetailComponent,
    BandsComponent,
    BandDetailComponent,
    AboutComponent,
    HelpComponent,
    LoginComponent,
    RegisterComponent,
    DashboardComponent,
    HeaderComponent,
    GoogleSignInButtonComponent,
    ReviewsSectionComponent,
    TranslatePipe,
    FeaturedPipe,
  ],
  imports: [
    BrowserModule,
    CommonModule,
    AppRoutingModule,
    FormsModule,
    ReactiveFormsModule,
  ],
  providers: [
    provideHttpClient(withInterceptors([authTokenInterceptor]))
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
