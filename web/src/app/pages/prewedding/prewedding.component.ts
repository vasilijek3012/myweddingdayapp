import { Component, OnInit } from '@angular/core';
import { VenueService, Venue } from '../../core/services/venue.service';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';

@Component({
  selector: 'app-prewedding',
  standalone: false,
  templateUrl: './prewedding.component.html',
  styleUrl: './prewedding.component.scss'
})
export class PreweddingComponent implements OnInit {
  venues: Venue[] = [];
  loading = true;
  searchTerm = '';
  private searchSubject = new Subject<string>();

  constructor(private venueService: VenueService) {}

  ngOnInit(): void {
    this.loadVenues();
    this.searchSubject.pipe(debounceTime(400), distinctUntilChanged()).subscribe(() => this.loadVenues());
  }

  loadVenues(): void {
    this.loading = true;
    this.venueService.getVenues({ type: 'prewedding', search: this.searchTerm || undefined }).subscribe({
      next: venues => { this.venues = venues; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  onSearch(value: string): void {
    this.searchTerm = value;
    this.searchSubject.next(value);
  }
}
