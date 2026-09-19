import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { BandService, Band } from '../../core/services/band.service';

@Component({
  selector: 'app-band-detail',
  standalone: false,
  templateUrl: './band-detail.component.html',
  styleUrl: './band-detail.component.scss'
})
export class BandDetailComponent implements OnInit {
  band: Band | null = null;
  loading = true;
  error = '';

  constructor(private route: ActivatedRoute, private bandService: BandService) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.bandService.getBand(id).subscribe({
      next: band => { this.band = band; this.loading = false; },
      error: () => { this.error = 'Bend nije pronađen.'; this.loading = false; }
    });
  }
}
