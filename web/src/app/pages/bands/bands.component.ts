import { Component, OnInit } from '@angular/core';
import { BandService, Band } from '../../core/services/band.service';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';

@Component({
  selector: 'app-bands',
  standalone: false,
  templateUrl: './bands.component.html',
  styleUrl: './bands.component.scss'
})
export class BandsComponent implements OnInit {
  bands: Band[] = [];
  loading = true;
  searchTerm = '';
  private searchSubject = new Subject<string>();

  constructor(private bandService: BandService) {}

  ngOnInit(): void {
    this.loadBands();
    this.searchSubject.pipe(debounceTime(400), distinctUntilChanged()).subscribe(() => this.loadBands());
  }

  loadBands(): void {
    this.loading = true;
    this.bandService.getBands({ search: this.searchTerm || undefined }).subscribe({
      next: bands => { this.bands = bands; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  onSearch(value: string): void {
    this.searchTerm = value;
    this.searchSubject.next(value);
  }
}
