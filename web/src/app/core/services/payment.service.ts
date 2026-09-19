import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface CheckoutResponse {
  checkout_url: string;
}

@Injectable({ providedIn: 'root' })
export class PaymentService {
  private apiUrl = `${environment.apiUrl}/payments`;

  constructor(private http: HttpClient) {}

  createCheckout(ref: { venue_id?: number; band_id?: number }): Observable<CheckoutResponse> {
    return this.http.post<CheckoutResponse>(`${this.apiUrl}/checkout`, ref);
  }
}
