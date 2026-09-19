import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface MealPlan {
  id: number;
  venue_id: number;
  name: string;
  description: string;
  price_per_person: number;
  includes_drinks: boolean;
}

export interface Venue {
  id: number;
  name: string;
  type: 'wedding' | 'prewedding';
  description: string;
  address: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
  capacity: number | null;
  base_price: number | null;
  phone: string;
  website: string;
  image_url: string;
  owner_name: string;
  owner_email?: string;
  created_at: string;
  plan?: string;
  featured_until?: string | null;
  meal_plans?: MealPlan[];
}

export interface VenueFilters {
  type?: string;
  search?: string;
  city?: string;
}

@Injectable({ providedIn: 'root' })
export class VenueService {
  private apiUrl = `${environment.apiUrl}/venues`;

  constructor(private http: HttpClient) {}

  getVenues(filters: VenueFilters = {}): Observable<Venue[]> {
    let params = new HttpParams();
    if (filters.type) params = params.set('type', filters.type);
    if (filters.search) params = params.set('search', filters.search);
    if (filters.city) params = params.set('city', filters.city);
    return this.http.get<Venue[]>(this.apiUrl, { params });
  }

  getVenue(id: number): Observable<Venue> {
    return this.http.get<Venue>(`${this.apiUrl}/${id}`);
  }

  getMyVenues(): Observable<Venue[]> {
    return this.http.get<Venue[]>(`${this.apiUrl}/owner/my`);
  }

  createVenue(data: Partial<Venue>): Observable<Venue> {
    return this.http.post<Venue>(this.apiUrl, data);
  }

  updateVenue(id: number, data: Partial<Venue>): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, data);
  }

  deleteVenue(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  addMealPlan(venueId: number, data: Partial<MealPlan>): Observable<MealPlan> {
    return this.http.post<MealPlan>(`${this.apiUrl}/${venueId}/meal-plans`, data);
  }
}
