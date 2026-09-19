import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { VenueService, Venue, MealPlan } from '../../core/services/venue.service';
import { BandService, Band } from '../../core/services/band.service';
import { AuthService } from '../../core/services/auth.service';
import { TranslationService } from '../../core/services/translation.service';
import { UploadService } from '../../core/services/upload.service';
import { PaymentService } from '../../core/services/payment.service';

@Component({
  selector: 'app-dashboard',
  standalone: false,
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  venues: Venue[] = [];
  band: Band | null = null;
  loading = true;

  showListingForm = false;
  editingId: number | null = null;
  listingForm: FormGroup;

  showMealPlanForm = false;
  selectedVenueId: number | null = null;
  mealPlanForm: FormGroup;

  formError = '';
  formSuccess = '';

  uploadingPhoto = false;
  uploadError = '';

  featuringId: number | null = null;

  constructor(
    private fb: FormBuilder,
    private venueService: VenueService,
    private bandService: BandService,
    private uploadService: UploadService,
    private paymentService: PaymentService,
    public auth: AuthService,
    private ts: TranslationService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.listingForm = this.fb.group({
      listing_type: ['wedding', Validators.required],
      name: ['', Validators.required],
      description: [''],
      city: ['', Validators.required],
      phone: [''],
      website: [''],
      image_url: [''],
      // wedding / prewedding only
      address: [''],
      latitude: [null],
      longitude: [null],
      capacity: [null],
      base_price: [null],
      // band only
      genre: [''],
      price_per_event: [null],
    });

    this.listingForm.get('listing_type')!.valueChanges.subscribe(type => {
      const addressCtrl = this.listingForm.get('address')!;
      addressCtrl.setValidators(type === 'band' ? [] : [Validators.required]);
      addressCtrl.updateValueAndValidity({ emitEvent: false });
    });

    this.mealPlanForm = this.fb.group({
      name: ['', Validators.required],
      description: [''],
      price_per_person: [null, [Validators.required, Validators.min(0)]],
      includes_drinks: [false],
    });
  }

  get isBand(): boolean {
    return this.auth.currentUser?.role === 'band';
  }

  ngOnInit(): void {
    if (this.isBand) {
      this.loadBand();
    } else {
      this.loadVenues();
    }

    const payment = this.route.snapshot.queryParams['payment'];
    if (payment === 'success') {
      this.formSuccess = this.ts.t('dashboard.paymentSuccess');
    } else if (payment === 'cancelled') {
      this.formError = this.ts.t('dashboard.paymentCancelled');
    }
    if (payment) {
      this.router.navigate([], { queryParams: {} });
    }
  }

  loadVenues(): void {
    this.loading = true;
    this.venueService.getMyVenues().subscribe({
      next: venues => { this.venues = venues; this.loading = false; },
      error: () => this.loading = false,
    });
  }

  loadBand(): void {
    this.loading = true;
    this.bandService.getMyBand().subscribe({
      next: band => { this.band = band; this.loading = false; },
      error: () => this.loading = false,
    });
  }

  // ===== Unified listing form (wedding hall / bachelor(ette) venue / band) =====

  openCreateForm(): void {
    this.editingId = null;
    this.listingForm.reset({ listing_type: this.isBand ? 'band' : 'wedding' });
    this.showListingForm = true;
    this.formError = '';
    this.formSuccess = '';
    this.uploadError = '';
  }

  openEditVenueForm(venue: Venue): void {
    this.editingId = venue.id;
    this.listingForm.patchValue({ ...venue, listing_type: venue.type });
    this.showListingForm = true;
    this.formError = '';
    this.formSuccess = '';
    this.uploadError = '';
  }

  openEditBandForm(): void {
    if (!this.band) return;
    this.editingId = this.band.id;
    this.listingForm.patchValue({ ...this.band, listing_type: 'band' });
    this.showListingForm = true;
    this.formError = '';
    this.formSuccess = '';
    this.uploadError = '';
  }

  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.uploadingPhoto = true;
    this.uploadError = '';
    this.uploadService.uploadPhoto(file).subscribe({
      next: res => {
        this.listingForm.patchValue({ image_url: res.url });
        this.uploadingPhoto = false;
        input.value = '';
      },
      error: err => {
        this.uploadError = err.error?.message || 'Upload failed';
        this.uploadingPhoto = false;
        input.value = '';
      }
    });
  }

  closeListingForm(): void {
    this.showListingForm = false;
    this.editingId = null;
  }

  submitListing(): void {
    if (this.listingForm.invalid) return;
    this.formError = '';
    const { listing_type, ...rest } = this.listingForm.value;

    if (listing_type === 'band') {
      const data = {
        name: rest.name, genre: rest.genre, description: rest.description, city: rest.city,
        price_per_event: rest.price_per_event, phone: rest.phone, website: rest.website, image_url: rest.image_url,
      };
      const action = this.editingId
        ? this.bandService.updateBand(this.editingId, data)
        : this.bandService.createBand(data);

      action.subscribe({
        next: () => {
          this.formSuccess = this.ts.t(this.editingId ? 'dashboard.bandUpdated' : 'dashboard.bandAdded');
          this.showListingForm = false;
          this.loadBand();
        },
        error: err => this.formError = err.error?.message || 'Greška',
      });
    } else {
      const data = {
        name: rest.name, type: listing_type, description: rest.description, address: rest.address, city: rest.city,
        latitude: rest.latitude, longitude: rest.longitude, capacity: rest.capacity, base_price: rest.base_price,
        phone: rest.phone, website: rest.website, image_url: rest.image_url,
      };
      const action = this.editingId
        ? this.venueService.updateVenue(this.editingId, data)
        : this.venueService.createVenue(data);

      action.subscribe({
        next: () => {
          this.formSuccess = this.ts.t(this.editingId ? 'dashboard.venueUpdated' : 'dashboard.venueAdded');
          this.showListingForm = false;
          this.loadVenues();
        },
        error: err => this.formError = err.error?.message || 'Greška',
      });
    }
  }

  featureVenue(venue: Venue): void {
    this.featureListing({ venue_id: venue.id });
  }

  featureBand(band: Band): void {
    this.featureListing({ band_id: band.id });
  }

  private featureListing(ref: { venue_id?: number; band_id?: number }): void {
    this.featuringId = ref.venue_id ?? ref.band_id ?? null;
    this.formError = '';
    this.paymentService.createCheckout(ref).subscribe({
      next: res => { window.location.href = res.checkout_url; },
      error: err => {
        this.formError = err.error?.message || 'Greška';
        this.featuringId = null;
      }
    });
  }

  deleteVenue(id: number): void {
    if (!confirm(this.ts.t('dashboard.confirmDelete'))) return;
    this.venueService.deleteVenue(id).subscribe({ next: () => this.loadVenues() });
  }

  deleteBand(): void {
    if (!this.band || !confirm(this.ts.t('dashboard.confirmDeleteBand'))) return;
    this.bandService.deleteBand(this.band.id).subscribe({ next: () => { this.band = null; } });
  }

  // ===== Meal plans (venues only) =====

  openMealPlanForm(venueId: number): void {
    this.selectedVenueId = venueId;
    this.mealPlanForm.reset({ includes_drinks: false });
    this.showMealPlanForm = true;
    this.formError = '';
    this.formSuccess = '';
  }

  closeMealPlanForm(): void {
    this.showMealPlanForm = false;
    this.selectedVenueId = null;
  }

  submitMealPlan(): void {
    if (this.mealPlanForm.invalid || !this.selectedVenueId) return;
    this.formError = '';
    this.venueService.addMealPlan(this.selectedVenueId, this.mealPlanForm.value).subscribe({
      next: () => {
        this.formSuccess = this.ts.t('dashboard.menuAdded');
        this.showMealPlanForm = false;
      },
      error: err => this.formError = err.error?.message || 'Greška',
    });
  }
}
