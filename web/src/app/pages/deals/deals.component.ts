import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { forkJoin, Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { VenueService } from '../../core/services/venue.service';
import { BandService } from '../../core/services/band.service';

export type DealType = 'wedding' | 'prewedding' | 'band';

export interface Deal {
  id: number;
  kind: DealType;
  name: string;
  city: string;
  image_url: string;
  description: string;
  price: number | null;
  featured_until?: string | null;
  created_at: string;
}

const ALL_TYPES: DealType[] = ['wedding', 'prewedding', 'band'];

@Component({
  selector: 'app-deals',
  standalone: false,
  templateUrl: './deals.component.html',
  styleUrl: './deals.component.scss'
})
export class DealsComponent implements OnInit {
  allDeals: Deal[] = [];
  deals: Deal[] = [];
  loading = true;
  searchTerm = '';
  activeTypes = new Set<DealType>(ALL_TYPES);
  private searchSubject = new Subject<string>();

  constructor(
    private venueService: VenueService,
    private bandService: BandService,
    private route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    const presetType = this.route.snapshot.queryParamMap.get('type') as DealType | null;
    if (presetType && ALL_TYPES.includes(presetType)) {
      this.activeTypes = new Set([presetType]);
    }

    this.loadDeals();
    this.searchSubject.pipe(debounceTime(400), distinctUntilChanged()).subscribe(() => this.loadDeals());
  }

  loadDeals(): void {
    this.loading = true;
    forkJoin({
      venues: this.venueService.getVenues({ search: this.searchTerm || undefined }),
      bands: this.bandService.getBands({ search: this.searchTerm || undefined }),
    }).subscribe({
      next: ({ venues, bands }) => {
        const venueDeals: Deal[] = venues.map(v => ({
          id: v.id, kind: v.type, name: v.name, city: v.city, image_url: v.image_url,
          description: v.description, price: v.base_price, featured_until: v.featured_until,
          created_at: v.created_at,
        }));
        const bandDeals: Deal[] = bands.map(b => ({
          id: b.id, kind: 'band' as const, name: b.name, city: b.city, image_url: b.image_url,
          description: b.description, price: b.price_per_event, featured_until: b.featured_until,
          created_at: b.created_at,
        }));

        this.allDeals = [...venueDeals, ...bandDeals].sort((a, b) => {
          const aFeatured = !!a.featured_until && new Date(a.featured_until) > new Date();
          const bFeatured = !!b.featured_until && new Date(b.featured_until) > new Date();
          if (aFeatured !== bFeatured) return aFeatured ? -1 : 1;
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });

        this.applyFilter();
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  applyFilter(): void {
    this.deals = this.allDeals.filter(d => this.activeTypes.has(d.kind));
  }

  toggleType(type: DealType): void {
    if (this.activeTypes.has(type)) {
      this.activeTypes.delete(type);
    } else {
      this.activeTypes.add(type);
    }
    this.applyFilter();
  }

  isActiveType(type: DealType): boolean {
    return this.activeTypes.has(type);
  }

  onSearch(value: string): void {
    this.searchTerm = value;
    this.searchSubject.next(value);
  }

  linkFor(deal: Deal): any[] {
    return deal.kind === 'band' ? ['/band', deal.id] : ['/venue', deal.id];
  }

  typeLabel(kind: DealType): string {
    if (kind === 'wedding') return 'venue.wedding';
    if (kind === 'prewedding') return 'venue.prewedding';
    return 'register.bandLabel';
  }
}
