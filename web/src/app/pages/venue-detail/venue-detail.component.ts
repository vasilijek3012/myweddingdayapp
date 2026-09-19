import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { VenueService, Venue } from '../../core/services/venue.service';

@Component({
  selector: 'app-venue-detail',
  standalone: false,
  templateUrl: './venue-detail.component.html',
  styleUrl: './venue-detail.component.scss'
})
export class VenueDetailComponent implements OnInit {
  venue: Venue | null = null;
  loading = true;
  error = '';
  mapEmbedUrl: SafeResourceUrl | null = null;

  constructor(
    private route: ActivatedRoute,
    private venueService: VenueService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.venueService.getVenue(id).subscribe({
      next: venue => {
        this.venue = venue;
        this.loading = false;
        this.mapEmbedUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.buildMapEmbedUrl(venue));
      },
      error: () => { this.error = 'Objekat nije pronađen.'; this.loading = false; }
    });
  }

  getGoogleMapsUrl(): string {
    if (!this.venue) return '';
    if (this.venue.latitude && this.venue.longitude) {
      return `https://www.google.com/maps/dir/?api=1&destination=${this.venue.latitude},${this.venue.longitude}`;
    }
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(this.venue.address + ' ' + this.venue.city)}`;
  }

  // No API key needed — this is the standard keyless Google Maps embed (`output=embed`),
  // distinct from the Maps Embed API which requires a billed API key.
  private buildMapEmbedUrl(venue: Venue): string {
    const query = venue.latitude && venue.longitude
      ? `${venue.latitude},${venue.longitude}`
      : `${venue.address}, ${venue.city}`;
    return `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`;
  }
}
