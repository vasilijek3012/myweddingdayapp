import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Review {
  id: number;
  user_id: number;
  user_name: string;
  rating: number;
  comment: string;
  created_at: string;
  updated_at: string | null;
}

export interface ReviewsResponse {
  reviews: Review[];
  count: number;
  average: number;
}

export interface MyReview {
  id: number;
  rating: number;
  comment: string;
  created_at: string;
  updated_at: string | null;
}

export interface PostRef {
  venue_id?: number;
  band_id?: number;
}

@Injectable({ providedIn: 'root' })
export class ReviewService {
  private apiUrl = `${environment.apiUrl}/reviews`;

  constructor(private http: HttpClient) {}

  private toParams(ref: PostRef): HttpParams {
    let params = new HttpParams();
    if (ref.venue_id) params = params.set('venue_id', ref.venue_id);
    if (ref.band_id) params = params.set('band_id', ref.band_id);
    return params;
  }

  getReviews(ref: PostRef): Observable<ReviewsResponse> {
    return this.http.get<ReviewsResponse>(this.apiUrl, { params: this.toParams(ref) });
  }

  getMyReview(ref: PostRef): Observable<MyReview | null> {
    return this.http.get<MyReview | null>(`${this.apiUrl}/mine`, { params: this.toParams(ref) });
  }

  submitReview(ref: PostRef, rating: number, comment: string): Observable<MyReview> {
    return this.http.post<MyReview>(this.apiUrl, { ...ref, rating, comment });
  }

  deleteReview(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}
