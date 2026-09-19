import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Band {
  id: number;
  name: string;
  genre: string;
  description: string;
  city: string;
  price_per_event: number | null;
  phone: string;
  website: string;
  image_url: string;
  owner_name: string;
  owner_email?: string;
  created_at: string;
  plan?: string;
  featured_until?: string | null;
}

export interface BandFilters {
  search?: string;
  city?: string;
  genre?: string;
}

@Injectable({ providedIn: 'root' })
export class BandService {
  private apiUrl = `${environment.apiUrl}/bands`;

  constructor(private http: HttpClient) {}

  getBands(filters: BandFilters = {}): Observable<Band[]> {
    let params = new HttpParams();
    if (filters.search) params = params.set('search', filters.search);
    if (filters.city) params = params.set('city', filters.city);
    if (filters.genre) params = params.set('genre', filters.genre);
    return this.http.get<Band[]>(this.apiUrl, { params });
  }

  getBand(id: number): Observable<Band> {
    return this.http.get<Band>(`${this.apiUrl}/${id}`);
  }

  getMyBand(): Observable<Band | null> {
    return this.http.get<Band | null>(`${this.apiUrl}/owner/my`);
  }

  createBand(data: Partial<Band>): Observable<Band> {
    return this.http.post<Band>(this.apiUrl, data);
  }

  updateBand(id: number, data: Partial<Band>): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, data);
  }

  deleteBand(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}
