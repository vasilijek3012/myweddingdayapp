import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface UploadResponse {
  url: string;
}

@Injectable({ providedIn: 'root' })
export class UploadService {
  private apiUrl = `${environment.apiUrl}/uploads`;

  constructor(private http: HttpClient) {}

  uploadPhoto(file: File): Observable<UploadResponse> {
    const formData = new FormData();
    formData.append('photo', file);
    return this.http.post<UploadResponse>(this.apiUrl, formData);
  }
}
